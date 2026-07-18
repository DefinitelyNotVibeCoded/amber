import fs from "fs";
import path from "path";
import { resolveInVault } from "./pathSafety";

export interface TypeSchema {
  required?: string[];
  known?: string[]; // extra custom fields this type expects, beyond the standard OKF ones
}

/** Map of lowercased note type -> its field rules. */
export type VaultSchema = Record<string, TypeSchema>;

const SCHEMA_PATH = "/.amber/schema.json";

// Seeded on first use so the feature is visible and editable. Chosen to be satisfied by the sample
// vault (every note has title + description), so it produces no false positives out of the box.
const DEFAULT_SCHEMA: VaultSchema = {
  concept: { required: ["title", "description"] },
  person: { required: ["title", "description"] },
  decision: { required: ["title", "description"], known: ["status"] },
  tool: { required: ["title", "description"] },
};

// Standard OKF frontmatter keys, always allowed regardless of schema.
const STANDARD_FIELDS = ["type", "title", "description", "resource", "tags", "timestamp"];

function schemaAbs(root: string): string {
  return resolveInVault(root, SCHEMA_PATH);
}

export function schemaPathAbsolute(root: string): string {
  return schemaAbs(root);
}

/** Reads .amber/schema.json, seeding a default the first time. Set it to `{}` to disable validation. */
export function loadSchema(root: string): VaultSchema {
  const abs = schemaAbs(root);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf-8")) as VaultSchema;
  } catch {
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, JSON.stringify(DEFAULT_SCHEMA, null, 2), "utf-8");
    } catch {
      // read-only vault or race; fall through to the in-memory default
    }
    return DEFAULT_SCHEMA;
  }
}

export interface FieldIssues {
  missing: string[]; // required fields that are absent or empty
  unknown: string[]; // frontmatter fields not in the standard set, required, or known
}

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function validateFrontmatter(
  type: string | undefined,
  frontmatter: Record<string, unknown>,
  schema: VaultSchema
): FieldIssues {
  const rule = schema[(type || "").trim().toLowerCase()];
  if (!rule) return { missing: [], unknown: [] };
  const missing = (rule.required || []).filter((f) => !hasValue(frontmatter[f]));
  const allowed = new Set([...STANDARD_FIELDS, ...(rule.required || []), ...(rule.known || [])]);
  const unknown = Object.keys(frontmatter).filter((f) => !allowed.has(f));
  return { missing, unknown };
}
