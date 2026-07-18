import fs from "fs";
import path from "path";
import crypto from "crypto";
import MarkItDown from "markitdown-js";
import { resolveInVault } from "./pathSafety";
import { bodyTemplateForType } from "./noteTemplates";
import { extOf, isImageExt } from "./attachments";
import { loadVault } from "./okf";
import { readTemplateBody, applyTemplateVars } from "./userTemplates";

const markitdown = new MarkItDown();

/** Best-effort text extraction for a newly attached file, never throws: a failed or
 * unsupported conversion just means the note ships without extracted content, the
 * attachment itself (already written to disk by the caller) is unaffected either way. */
async function extractMarkdown(absPath: string, ext: string): Promise<string | null> {
  if (isImageExt(ext)) return null; // already shown inline via the attachment preview
  try {
    const result = await markitdown.convert(absPath);
    const text = result?.textContent?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

export interface CreateNoteParams {
  dir: string; // bundle-relative dir, e.g. "/concepts"
  filename?: string; // e.g. "new-concept.md"
  type: string;
  title?: string;
  description?: string;
  resource?: string;
  tags?: string[];
  template?: string; // optional .amber/templates/*.md filename; overrides the built-in per-type body
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

/** Content-hash version token used for optimistic concurrency on writes. */
export function versionOf(content: string): string {
  return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
}

/**
 * Overwrites a note's raw content, returning the new version. If `expectedVersion` is given and the
 * file on disk no longer matches it, the write is rejected with a 409 instead of silently clobbering
 * a change made since the caller last read the note (e.g. an agent write landing mid-edit).
 */
export function writeNoteRaw(root: string, notePath: string, content: string, expectedVersion?: string): string {
  const abs = resolveInVault(root, notePath);
  if (expectedVersion !== undefined && fs.existsSync(abs)) {
    const current = versionOf(fs.readFileSync(abs, "utf-8"));
    if (current !== expectedVersion) {
      throw new VaultOpError(
        "This note changed since it was read; re-read it and reapply the change to avoid overwriting.",
        409
      );
    }
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf-8");
  return versionOf(content);
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

function splitFragment(raw: string): [string, string] {
  const i = raw.indexOf("#");
  return i < 0 ? [raw, ""] : [raw.slice(0, i), raw.slice(i + 1)];
}

/**
 * Recomputes a link href that currently resolves to some old target so it resolves to `newTarget`
 * from `linkerPath`, preserving the original bundle-relative ("/…") vs path-relative style and any
 * #fragment.
 */
function rewriteHref(rawHref: string, linkerPath: string, newTarget: string): string {
  const [base, fragment] = splitFragment(rawHref);
  const frag = fragment ? "#" + fragment : "";
  if (base.startsWith("/")) return newTarget + frag; // was absolute, keep it absolute
  const linkerDir = path.posix.dirname(linkerPath);
  return path.posix.relative(linkerDir, newTarget) + frag;
}

/**
 * Renames/moves a note within the vault, keeping links intact: every other note that linked to the
 * old path is rewritten to point at the new one, and if the note moved to a different directory its
 * own relative outgoing links are rewritten so they still resolve to the same targets.
 */
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

  // Snapshot the link graph BEFORE moving, so we know who pointed at fromPath and where the moved
  // note itself points.
  const vault = loadVault(root);
  const movedNote = vault.notes.find((n) => n.path === fromPath);

  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromAbs, toAbs);

  // 1) Rewrite inbound links: every other note that linked to fromPath now points at toPath.
  for (const note of vault.notes) {
    if (note.path === fromPath) continue;
    const rawsToTarget = new Set(note.links.filter((l) => l.target === fromPath).map((l) => l.raw));
    if (rawsToTarget.size === 0) continue;
    const abs = resolveInVault(root, note.path);
    let content = fs.readFileSync(abs, "utf-8");
    for (const raw of rawsToTarget) {
      content = content.split(`](${raw})`).join(`](${rewriteHref(raw, note.path, toPath)})`);
    }
    fs.writeFileSync(abs, content, "utf-8");
  }

  // 2) If the note moved to a different directory, its own relative outgoing links would now resolve
  //    from the new location, so rewrite them to keep pointing at the same targets. Absolute ("/…")
  //    links are unaffected by the move.
  if (movedNote && path.posix.dirname(fromPath) !== path.posix.dirname(toPath)) {
    let content = fs.readFileSync(toAbs, "utf-8");
    const seen = new Set<string>();
    for (const link of movedNote.links) {
      if (seen.has(link.raw)) continue;
      seen.add(link.raw);
      const [base] = splitFragment(link.raw);
      if (base.startsWith("/")) continue; // absolute, still correct after the move
      const newTarget = link.target === fromPath ? toPath : link.target; // handle self-links
      content = content.split(`](${link.raw})`).join(`](${rewriteHref(link.raw, toPath, newTarget)})`);
    }
    fs.writeFileSync(toAbs, content, "utf-8");
  }

  return { path: toPath };
}

export function createNote(root: string, params: CreateNoteParams): { path: string } {
  const { dir, type, title, description, resource, tags, template } = params;
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

  const resolvedTitle = title || filename.replace(/\.md$/, "");
  const templateBody = template ? readTemplateBody(root, template) : null;
  const body =
    templateBody !== null ? applyTemplateVars(templateBody, { title: resolvedTitle, type }) : bodyTemplateForType(type);

  const frontmatterLines = [
    "---",
    `type: ${type}`,
    `title: "${resolvedTitle.replace(/"/g, '\\"')}"`,
    description ? `description: "${description.replace(/"/g, '\\"')}"` : null,
    resource ? `resource: ${resource}` : null,
    tags && tags.length ? `tags: [${tags.join(", ")}]` : null,
    `timestamp: ${new Date().toISOString()}`,
    "---",
    "",
    `# ${resolvedTitle}`,
    "",
    body,
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
export async function createDocumentNote(root: string, params: CreateDocumentParams): Promise<{ path: string; resourcePath: string }> {
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
  const extracted = await extractMarkdown(attachmentAbs, ext);

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
    extracted ? "## Extracted content\n\n" + extracted : null,
    "",
  ].filter((l): l is string => l !== null);

  fs.writeFileSync(abs, frontmatterLines.join("\n"), "utf-8");
  return { path: bundlePath, resourcePath };
}
