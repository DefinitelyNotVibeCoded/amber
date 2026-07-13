import fs from "fs";
import path from "path";
import type { SavedView } from "./query";

const VIEWS_DIR = ".amber";
const VIEWS_FILE = "views.json";

function viewsPath(root: string): string {
  return path.join(root, VIEWS_DIR, VIEWS_FILE);
}

export function readSavedViews(root: string): SavedView[] {
  try {
    const raw = fs.readFileSync(viewsPath(root), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedViews(root: string, views: SavedView[]): void {
  const dir = path.join(root, VIEWS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(viewsPath(root), JSON.stringify(views, null, 2), "utf-8");
}

export function addSavedView(root: string, view: Omit<SavedView, "id">): SavedView {
  const views = readSavedViews(root);
  const full: SavedView = { ...view, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  views.push(full);
  writeSavedViews(root, views);
  return full;
}

export function deleteSavedView(root: string, id: string): void {
  const views = readSavedViews(root).filter((v) => v.id !== id);
  writeSavedViews(root, views);
}
