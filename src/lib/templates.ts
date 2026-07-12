export interface VaultTemplateFile {
  /** Bundle-relative path, e.g. "/index.md" or "/concepts/example.md" */
  path: string;
  content: string;
}

export interface VaultTemplate {
  id: string;
  name: string;
  description: string;
  files: VaultTemplateFile[];
}

const STRUCTURE_NOTE =
  "This starting layout is a suggestion, not a requirement. OKF only requires " +
  "one thing in frontmatter: `type`. Rename, delete, or flatten these folders " +
  "the moment they stop matching how you actually work. The structure that " +
  "sticks is the one that comes out of using the vault, not one planned in advance.";

function exampleNote(opts: {
  path: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  body: string;
}): VaultTemplateFile {
  const frontmatter = [
    "---",
    `type: ${opts.type}`,
    `title: "${opts.title}"`,
    `description: "${opts.description}"`,
    `tags: [${opts.tags.join(", ")}]`,
    `timestamp: ${new Date().toISOString()}`,
    "---",
    "",
  ].join("\n");
  return { path: opts.path, content: frontmatter + opts.body };
}

const PLACEHOLDER_NOTE =
  "\n\n_This is an example, not a fixture. Delete it, rename it, or change its `type` once you have real content._\n";

export const VAULT_TEMPLATES: VaultTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Just an index.md. No folders, no assumptions about how you'll organize things.",
    files: [
      {
        path: "/index.md",
        content: `# Vault

A new OKF bundle. Nothing here yet.

${STRUCTURE_NOTE}

Add a note with **New note** and give it any \`type\` you want (\`Concept\`, \`Note\`, \`Project\`, anything). Folders form on their own as you place files, there's nothing to configure up front.
`,
      },
    ],
  },
  {
    id: "second-brain",
    name: "Second Brain",
    description: "Concepts, people, projects, decisions. A personal knowledge base shape.",
    files: [
      {
        path: "/index.md",
        content: `# Second Brain

${STRUCTURE_NOTE}

## Concepts
* [Example Concept](/concepts/example-concept.md)

## People
* [Example Person](/people/example-person.md)

## Projects
* [Example Project](/projects/example-project.md)

## Decisions
* [Example Decision](/decisions/example-decision.md)
`,
      },
      exampleNote({
        path: "/concepts/example-concept.md",
        type: "Concept",
        title: "Example Concept",
        description: "A durable idea worth its own page.",
        tags: ["example"],
        body: `# Example Concept

Concept pages are for ideas you come back to: definitions, patterns, mental models. Link to them from anywhere else in the vault with \`[text](/concepts/example-concept.md)\`.${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/people/example-person.md",
        type: "Person",
        title: "Example Person",
        description: "Someone worth tracking context on.",
        tags: ["example"],
        body: `# Example Person

Person pages are useful the moment you're referencing the same name across multiple notes.${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/projects/example-project.md",
        type: "Project",
        title: "Example Project",
        description: "Something you're actively working on.",
        tags: ["example"],
        body: `# Example Project

Project pages tend to accumulate links to decisions, people, and concepts as the work progresses.${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/decisions/example-decision.md",
        type: "Decision",
        title: "Example Decision",
        description: "A choice worth recording the reasoning for.",
        tags: ["example"],
        body: `# Example Decision

Decision pages capture the *why*, so future-you (or an agent) doesn't have to re-derive it.${PLACEHOLDER_NOTE}`,
      }),
    ],
  },
  {
    id: "team-knowledge-base",
    name: "Team Knowledge Base",
    description: "Tables, metrics, runbooks. The shape OKF's own examples use for data and ops context.",
    files: [
      {
        path: "/index.md",
        content: `# Team Knowledge Base

${STRUCTURE_NOTE}

## Tables
* [Example Table](/tables/example-table.md)

## Metrics
* [Example Metric](/metrics/example-metric.md)

## Runbooks
* [Example Runbook](/runbooks/example-runbook.md)
`,
      },
      exampleNote({
        path: "/tables/example-table.md",
        type: "Table",
        title: "Example Table",
        description: "One row per thing this table represents.",
        tags: ["example"],
        body: `# Example Table

## Schema
* \`id\`: primary key
* \`created_at\`: timestamp${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/metrics/example-metric.md",
        type: "Metric",
        title: "Example Metric",
        description: "A number the team tracks and what moves it.",
        tags: ["example"],
        body: `# Example Metric

Definition, source table, and known caveats go here.${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/runbooks/example-runbook.md",
        type: "Runbook",
        title: "Example Runbook",
        description: "Steps for handling a recurring situation.",
        tags: ["example"],
        body: `# Example Runbook

1. First step
2. Second step${PLACEHOLDER_NOTE}`,
      }),
    ],
  },
  {
    id: "research",
    name: "Research",
    description: "Sources, findings, questions. For literature review or investigation work.",
    files: [
      {
        path: "/index.md",
        content: `# Research

${STRUCTURE_NOTE}

## Sources
* [Example Source](/sources/example-source.md)

## Findings
* [Example Finding](/findings/example-finding.md)

## Open Questions
* [Example Question](/questions/example-question.md)
`,
      },
      exampleNote({
        path: "/sources/example-source.md",
        type: "Source",
        title: "Example Source",
        description: "Something you read, watched, or were told.",
        tags: ["example"],
        body: `# Example Source

Summarize in your own words, then cite it under a \`## Citations\` heading.${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/findings/example-finding.md",
        type: "Finding",
        title: "Example Finding",
        description: "A conclusion drawn from one or more sources.",
        tags: ["example"],
        body: `# Example Finding

Link back to the [Example Source](/sources/example-source.md) that supports this.${PLACEHOLDER_NOTE}`,
      }),
      exampleNote({
        path: "/questions/example-question.md",
        type: "Question",
        title: "Example Question",
        description: "Something still unresolved.",
        tags: ["example"],
        body: `# Example Question

What you'd need to find out, and why it matters.${PLACEHOLDER_NOTE}`,
      }),
    ],
  },
];

export function getTemplate(id: string): VaultTemplate | undefined {
  return VAULT_TEMPLATES.find((t) => t.id === id);
}
