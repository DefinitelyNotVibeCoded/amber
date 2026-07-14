const BODY_TEMPLATES: Record<string, string> = {
  concept: "## Definition\n\n\n\n## Related concepts\n\n",
  person: "## Background\n\n\n\n## Involved in\n\n",
  decision: "## Context\n\n\n\n## Decision\n\n\n\n## Consequences\n\n",
  tool: "## What it does\n\n\n\n## When to use it\n\n",
};

const FOLDER_OVERRIDES: Record<string, string> = {
  person: "people",
};

export function bodyTemplateForType(type: string): string {
  return BODY_TEMPLATES[type.trim().toLowerCase()] || "";
}

export function folderForType(type: string): string {
  const key = type.trim().toLowerCase();
  if (!key) return "/";
  const plural = FOLDER_OVERRIDES[key] || (key.endsWith("s") ? key : `${key}s`);
  return `/${plural}`;
}
