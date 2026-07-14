import fs from "fs";
import path from "path";
import { resolveInVault } from "./pathSafety";
import { bodyTemplateForType } from "./noteTemplates";
import { extOf } from "./attachments";

export interface CreateNoteParams {
  dir: string; // bundle-relative dir, e.g. "/concepts"
  filename?: string; // e.g. "new-concept.md"
  type: string;
  title?: string;
  description?: string;
  resource?: string;
  tags?: string[];
}

export class VaultOpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "untitled"
  );
}

export function readNoteRaw(root: string, notePath: string): string {
  const abs = resolveInVault(root, notePath);
  if (!fs.existsSync(abs)) {
    throw new VaultOpError(`Note not found: ${notePath}`, 404);
  }
  return fs.readFileSync(abs, "utf-8");
}

export function writeNoteRaw(root: string, notePath: string, content: string): void {
  const abs = resolveInVault(root, notePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf-8");
}

export function noteExists(root: string, notePath: string): boolean {
  try {
    return fs.existsSync(resolveInVault(root, notePath));
  } catch {
    return false;
  }
}

export function deleteNote(root: string, notePath: string): void {
  const abs = resolveInVault(root, notePath);
  if (!fs.existsSync(abs)) {
    throw new VaultOpError(`Note not found: ${notePath}`, 404);
  }
  fs.unlinkSync(abs);
}

/** Renames/moves a note within the vault. Does not rewrite links in other notes that pointed at the old path. */
export function renameNote(root: string, fromPath: string, toPath: string): { path: string } {
  const fromAbs = resolveInVault(root, fromPath);
  if (!fs.existsSync(fromAbs)) {
    throw new VaultOpError(`Note not found: ${fromPath}`, 404);
  }
  const toFilename = path.posix.basename(toPath);
  if (toFilename === "index.md" || toFilename === "log.md") {
    throw new VaultOpError("Filename is reserved", 400);
  }
  const toAbs = resolveInVault(root, toPath);
  if (fs.existsSync(toAbs)) {
    throw new VaultOpError("A note already exists at that path", 409);
  }
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromAbs, toAbs);
  return { path: toPath };
}

export function createNote(root: string, params: CreateNoteParams): { path: string } {
  const { dir, type, title, description, resource, tags } = params;
  let filename = params.filename?.trim();

  if (!type) {
    throw new VaultOpError("type is required", 400);
  }
  if (!filename) {
    filename = slugify(title || "untitled") + ".md";
  }
  if (!filename.endsWith(".md")) filename += ".md";
  if (filename === "index.md" || filename === "log.md") {
    throw new VaultOpError("Filename is reserved", 400);
  }

  const bundleDir = dir && dir.startsWith("/") ? dir : "/" + (dir || "");
  const bundlePath = path.posix.join(bundleDir, filename);
  const abs = resolveInVault(root, bundlePath);

  if (fs.existsSync(abs)) {
    throw new VaultOpError("File already exists", 409);
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const frontmatterLines = [
    "---",
    `type: ${type}`,
    `title: "${(title || filename.replace(/\.md$/, "")).replace(/"/g, '\\"')}"`,
    description ? `description: "${description.replace(/"/g, '\\"')}"` : null,
    resource ? `resource: ${resource}` : null,
    tags && tags.length ? `tags: [${tags.join(", ")}]` : null,
    `timestamp: ${new Date().toISOString()}`,
    "---",
    "",
    `# ${title || filename.replace(/\.md$/, "")}`,
    "",
    bodyTemplateForType(type),
  ].filter((l): l is string => l !== null);

  fs.writeFileSync(abs, frontmatterLines.join("\n"), "utf-8");
  return { path: bundlePath };
}

export interface CreateDocumentParams {
  dir: string;
  type: string;
  title?: string;
  description?: string;
  tags?: string[];
  originalFilename: string;
  buffer: Buffer;
}

/** Copies an uploaded file into /attachments and creates a companion OKF note whose `resource` points to it. */
export function createDocumentNote(root: string, params: CreateDocumentParams): { path: string; resourcePath: string } {
  const { dir, type, title, description, tags, originalFilename, buffer } = params;
  if (!type) {
    throw new VaultOpError("type is required", 400);
  }

  const ext = extOf(originalFilename);
  const baseSlug = slugify(title || originalFilename.replace(/\.[^.]+$/, "") || "document");

  fs.mkdirSync(resolveInVault(root, "/attachments"), { recursive: true });
  let attachmentFilename = ext ? `${baseSlug}.${ext}` : baseSlug;
  let attachmentAbs = resolveInVault(root, `/attachments/${attachmentFilename}`);
  let i = 2;
  while (fs.existsSync(attachmentAbs)) {
    attachmentFilename = ext ? `${baseSlug}-${i}.${ext}` : `${baseSlug}-${i}`;
    attachmentAbs = resolveInVault(root, `/attachments/${attachmentFilename}`);
    i++;
  }
  fs.writeFileSync(attachmentAbs, buffer);
  const resourcePath = `/attachments/${attachmentFilename}`;

  const bundleDir = dir && dir.startsWith("/") ? dir : "/" + (dir || "");
  let noteFilename = `${baseSlug}.md`;
  let bundlePath = path.posix.join(bundleDir, noteFilename);
  let abs = resolveInVault(root, bundlePath);
  let j = 2;
  while (fs.existsSync(abs)) {
    noteFilename = `${baseSlug}-${j}.md`;
    bundlePath = path.posix.join(bundleDir, noteFilename);
    abs = resolveInVault(root, bundlePath);
    j++;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const frontmatterLines = [
    "---",
    `type: ${type}`,
    `title: "${(title || baseSlug).replace(/"/g, '\\"')}"`,
    description ? `description: "${description.replace(/"/g, '\\"')}"` : null,
    `resource: ${resourcePath}`,
    tags && tags.length ? `tags: [${tags.join(", ")}]` : null,
    `timestamp: ${new Date().toISOString()}`,
    "---",
    "",
    `# ${title || baseSlug}`,
    "",
  ].filter((l): l is string => l !== null);

  fs.writeFileSync(abs, frontmatterLines.join("\n"), "utf-8");
  return { path: bundlePath, resourcePath };
}
