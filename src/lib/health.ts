import type { VaultData } from "./types";
import { isReservedFilename } from "./okfClient";
import { validateFrontmatter, type VaultSchema } from "./schema";

export interface BrokenLink {
  from: string; // path of the note containing the link
  fromTitle: string;
  target: string; // resolved path that does not exist
  text: string; // link text
}

export interface OrphanNote {
  path: string;
  title: string;
  type?: string;
}

export interface SchemaIssue {
  path: string;
  title: string;
  type?: string;
  missing: string[];
  unknown: string[];
}

export interface VaultHealth {
  brokenLinks: BrokenLink[];
  orphans: OrphanNote[];
  schemaIssues: SchemaIssue[];
  counts: { brokenLinks: number; orphans: number; schemaIssues: number; total: number };
}

/** Scans the loaded vault for dangling links, notes nothing links to, and schema violations. */
export function scanHealth(vault: VaultData, schema: VaultSchema): VaultHealth {
  const paths = new Set(vault.notes.map((n) => n.path));
  const brokenLinks: BrokenLink[] = [];
  const orphans: OrphanNote[] = [];
  const schemaIssues: SchemaIssue[] = [];

  for (const note of vault.notes) {
    if (isReservedFilename(note.filename)) continue;

    for (const link of note.links) {
      if (!paths.has(link.target)) {
        brokenLinks.push({ from: note.path, fromTitle: note.title, target: link.target, text: link.text });
      }
    }

    if (note.backlinks.length === 0) {
      orphans.push({ path: note.path, title: note.title, type: note.frontmatter.type });
    }

    const { missing, unknown } = validateFrontmatter(
      note.frontmatter.type,
      note.frontmatter as Record<string, unknown>,
      schema
    );
    if (missing.length || unknown.length) {
      schemaIssues.push({ path: note.path, title: note.title, type: note.frontmatter.type, missing, unknown });
    }
  }

  const counts = {
    brokenLinks: brokenLinks.length,
    orphans: orphans.length,
    schemaIssues: schemaIssues.length,
    total: brokenLinks.length + orphans.length + schemaIssues.length,
  };
  return { brokenLinks, orphans, schemaIssues, counts };
}
