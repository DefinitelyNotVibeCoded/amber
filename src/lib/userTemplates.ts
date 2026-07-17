import fs from "fs";
import path from "path";
import { resolveInVault } from "./pathSafety";

export interface NoteTemplate {
  filename: string; // e.g. "meeting.md"
  name: string; // display name, e.g. "Meeting"
}

const TEMPLATES_DIR = "/.amber/templates";

// Seeded into a vault the first time templates are read, so there's something real and editable to
// start from. Deleting them all is respected (they are not re-seeded once the folder exists).
const SEED_TEMPLATES: Record<string, string> = {
  "concept.md": "## Definition\n\n\n\n## Related concepts\n\n",
  "person.md": "## Background\n\n\n\n## Involved in\n\n",
  "decision.md": "## Context\n\n\n\n## Decision\n\n\n\n## Consequences\n\n",
  "tool.md": "## What it does\n\n\n\n## When to use it\n\n",
  "meeting.md": "**Date:** {{date}}\n\n## Attendees\n\n\n\n## Notes\n\n\n\n## Action items\n\n- [ ] ",
  "project.md": "## Goal\n\n\n\n## Status\n\n\n\n## Related decisions\n\n",
};

const TEMPLATE_FILENAME_RE = /^[^/\\]+\.md$/;

function templatesDirAbs(root: string): string {
  return resolveInVault(root, TEMPLATES_DIR);
}

export function templatesDirAbsolute(root: string): string {
  return templatesDirAbs(root);
}

/** Turns "team-sync.md" into "Team Sync". */
function displayName(filename: string): string {
  return filename
    .replace(/\.md$/i, "")
    .split(/[-_]/g)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function seedIfMissing(root: string): void {
  const dir = templatesDirAbs(root);
  if (fs.existsSync(dir)) return; // folder exists (even if emptied on purpose): leave it alone
  fs.mkdirSync(dir, { recursive: true });
  for (const [filename, body] of Object.entries(SEED_TEMPLATES)) {
    fs.writeFileSync(path.join(dir, filename), body, "utf-8");
  }
}

export function listTemplates(root: string): NoteTemplate[] {
  seedIfMissing(root);
  const dir = templatesDirAbs(root);
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".md"));
  } catch {
    return [];
  }
  return entries
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({ filename, name: displayName(filename) }));
}

/** Raw template body for a filename, or null if it is invalid or missing. */
export function readTemplateBody(root: string, filename: string): string | null {
  if (!TEMPLATE_FILENAME_RE.test(filename)) return null;
  try {
    return fs.readFileSync(path.join(templatesDirAbs(root), filename), "utf-8");
  } catch {
    return null;
  }
}

/** Substitutes {{title}}, {{type}}, {{date}} (YYYY-MM-DD) and {{time}} (HH:MM) into a template body. */
export function applyTemplateVars(body: string, vars: { title?: string; type?: string }): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  return body
    .replace(/\{\{\s*title\s*\}\}/gi, vars.title || "")
    .replace(/\{\{\s*type\s*\}\}/gi, vars.type || "")
    .replace(/\{\{\s*date\s*\}\}/gi, date)
    .replace(/\{\{\s*time\s*\}\}/gi, time);
}
