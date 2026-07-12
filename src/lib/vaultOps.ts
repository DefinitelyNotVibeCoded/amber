import fs from "fs";
import path from "path";
import { resolveInVault } from "./pathSafety";

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
  ].filter((l): l is string => l !== null);

  fs.writeFileSync(abs, frontmatterLines.join("\n"), "utf-8");
  return { path: bundlePath };
}
