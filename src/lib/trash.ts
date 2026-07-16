import fs from "fs";
import path from "path";
import { resolveInVault } from "./pathSafety";
import { VaultOpError } from "./vaultOps";

export interface TrashedFile {
  stored: string; // bundle-relative path inside .amber/trash where the file now lives
  original: string; // bundle-relative path it should be restored to
}

export interface TrashEntry {
  id: string;
  deletedAt: string; // ISO timestamp
  title?: string;
  files: TrashedFile[];
}

const TRASH_DIR = "/.amber/trash";
const INDEX_PATH = "/.amber/trash/index.json";

function indexAbs(root: string): string {
  return resolveInVault(root, INDEX_PATH);
}

export function listTrash(root: string): TrashEntry[] {
  try {
    return JSON.parse(fs.readFileSync(indexAbs(root), "utf-8")) as TrashEntry[];
  } catch {
    return [];
  }
}

function writeIndex(root: string, entries: TrashEntry[]): void {
  const abs = indexAbs(root);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(entries, null, 2), "utf-8");
}

function newId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/**
 * Moves one or more vault files into .amber/trash under a single restorable entry, instead of
 * unlinking them. Missing sources are skipped; throws only if nothing could be trashed.
 */
export function moveToTrash(root: string, filePaths: string[], meta: { title?: string } = {}): TrashEntry {
  const id = newId();
  const files: TrashedFile[] = [];
  filePaths.forEach((original, i) => {
    const srcAbs = resolveInVault(root, original);
    if (!fs.existsSync(srcAbs)) return;
    const stored = `${TRASH_DIR}/${id}/${i}__${path.posix.basename(original)}`;
    const destAbs = resolveInVault(root, stored);
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.renameSync(srcAbs, destAbs);
    files.push({ stored, original });
  });
  if (files.length === 0) throw new VaultOpError("Nothing to trash", 404);
  const entry: TrashEntry = { id, deletedAt: new Date().toISOString(), title: meta.title, files };
  writeIndex(root, [entry, ...listTrash(root)]);
  return entry;
}

/**
 * Restores a trash entry's files to their original paths and drops the entry. Refuses if any
 * original path is now occupied, so a restore never clobbers a newer note.
 */
export function restoreFromTrash(root: string, id: string): { restored: string[] } {
  const entries = listTrash(root);
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new VaultOpError("Trash entry not found", 404);

  for (const f of entry.files) {
    if (fs.existsSync(resolveInVault(root, f.original))) {
      throw new VaultOpError(`Cannot restore: something already exists at ${f.original}`, 409);
    }
  }

  const restored: string[] = [];
  for (const f of entry.files) {
    const src = resolveInVault(root, f.stored);
    const dest = resolveInVault(root, f.original);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    restored.push(f.original);
  }

  writeIndex(root, entries.filter((e) => e.id !== id));
  return { restored };
}
