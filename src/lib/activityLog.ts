import fs from "fs";
import path from "path";

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  tool: "write_note" | "create_note";
  path: string;
  /** Full previous file content, or null for a newly created note. */
  before: string | null;
  /** Full file content after the change. */
  after: string;
  revertedAt: string | null;
}

const LOG_DIR = ".amber";
const LOG_FILE = "activity-log.json";
const MAX_ENTRIES = 300;

function logPath(root: string): string {
  return path.join(root, LOG_DIR, LOG_FILE);
}

export function readActivityLog(root: string): ActivityLogEntry[] {
  try {
    const raw = fs.readFileSync(logPath(root), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeActivityLog(root: string, entries: ActivityLogEntry[]): void {
  const dir = path.join(root, LOG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(logPath(root), JSON.stringify(entries, null, 2), "utf-8");
}

export function appendActivityLogEntry(
  root: string,
  entry: Pick<ActivityLogEntry, "tool" | "path" | "before" | "after">
): ActivityLogEntry {
  const entries = readActivityLog(root);
  const full: ActivityLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    revertedAt: null,
  };
  entries.push(full);
  writeActivityLog(root, entries.slice(-MAX_ENTRIES));
  return full;
}

export function getActivityLogEntry(root: string, id: string): ActivityLogEntry | undefined {
  return readActivityLog(root).find((e) => e.id === id);
}

export function markActivityLogEntryReverted(root: string, id: string): void {
  const entries = readActivityLog(root);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Activity log entry not found");
  entries[idx] = { ...entries[idx], revertedAt: new Date().toISOString() };
  writeActivityLog(root, entries);
}
