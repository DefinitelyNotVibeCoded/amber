import type { OkfNote } from "./types";

export type QueryOperator = "equals" | "contains" | "before" | "after" | "exists" | "not_exists";

export interface QueryFilter {
  id: string;
  field: string;
  operator: QueryOperator;
  value: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: QueryFilter[];
  sortField: string;
  sortDir: "asc" | "desc";
}

export const STANDARD_FIELDS = ["type", "title", "tags", "description", "resource", "timestamp", "path"];

const OPERATOR_LABELS: Record<QueryOperator, string> = {
  equals: "is",
  contains: "contains",
  before: "is before",
  after: "is after",
  exists: "is set",
  not_exists: "is not set",
};

export function operatorLabel(op: QueryOperator): string {
  return OPERATOR_LABELS[op];
}

export function operatorsForField(field: string): QueryOperator[] {
  if (field === "tags") return ["contains", "exists", "not_exists"];
  if (field === "timestamp") return ["before", "after", "equals", "exists", "not_exists"];
  if (field === "type") return ["equals", "exists"];
  return ["equals", "contains", "exists", "not_exists"];
}

/** Every frontmatter key used anywhere in the vault, beyond the standard OKF fields. */
export function collectCustomFields(notes: OkfNote[]): string[] {
  const set = new Set<string>();
  for (const n of notes) {
    for (const key of Object.keys(n.frontmatter)) {
      if (!STANDARD_FIELDS.includes(key)) set.add(key);
    }
  }
  return Array.from(set).sort();
}

function fieldValue(note: OkfNote, field: string): unknown {
  if (field === "path") return note.path;
  if (field === "title") return note.title;
  return note.frontmatter[field];
}

function toComparableString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function fieldExists(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function matchesFilter(note: OkfNote, filter: QueryFilter): boolean {
  const raw = fieldValue(note, filter.field);
  const exists = fieldExists(raw);

  switch (filter.operator) {
    case "exists":
      return exists;
    case "not_exists":
      return !exists;
    case "equals":
      if (Array.isArray(raw)) return raw.some((v) => String(v).toLowerCase() === filter.value.toLowerCase());
      return toComparableString(raw).toLowerCase() === filter.value.trim().toLowerCase();
    case "contains":
      if (Array.isArray(raw)) return raw.some((v) => String(v).toLowerCase().includes(filter.value.toLowerCase()));
      return toComparableString(raw).toLowerCase().includes(filter.value.trim().toLowerCase());
    case "before":
    case "after": {
      const noteDate = new Date(toComparableString(raw));
      const filterDate = new Date(filter.value);
      if (isNaN(noteDate.getTime()) || isNaN(filterDate.getTime())) return false;
      return filter.operator === "before" ? noteDate < filterDate : noteDate > filterDate;
    }
    default:
      return true;
  }
}

export function applyQuery(notes: OkfNote[], filters: QueryFilter[]): OkfNote[] {
  return notes.filter((n) => filters.every((f) => !f.value.trim() && f.operator !== "exists" && f.operator !== "not_exists" ? true : matchesFilter(n, f)));
}

export function sortNotes(notes: OkfNote[], field: string, dir: "asc" | "desc"): OkfNote[] {
  const sorted = [...notes].sort((a, b) => {
    const av = toComparableString(fieldValue(a, field));
    const bv = toComparableString(fieldValue(b, field));
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
  });
  return dir === "asc" ? sorted : sorted.reverse();
}
