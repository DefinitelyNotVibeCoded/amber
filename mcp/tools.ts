import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getVaultPath } from "../src/lib/config";
import { loadVault } from "../src/lib/okf";
import { isReservedFilename } from "../src/lib/okfClient";
import { readNoteRaw, writeNoteRaw, createNote, versionOf, VaultOpError } from "../src/lib/vaultOps";
import { appendActivityLogEntry } from "../src/lib/activityLog";
import { appendAgentPulse } from "../src/lib/agentPulse";
import { semanticSearchByText } from "../src/lib/embeddings";
import { listTemplates } from "../src/lib/userTemplates";
import { loadSchema, validateFrontmatter } from "../src/lib/schema";
import { scanHealth } from "../src/lib/health";
import matter from "gray-matter";

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export function createAmberServer(): McpServer {
  const server = new McpServer({ name: "amber", version: "0.2.0" });

  server.registerTool(
    "get_vault_info",
    {
      title: "Get vault info",
      description:
        "Orientation for the Amber OKF vault: root path, how many concepts it holds, and every distinct `type` and tag in use. Call this first.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const root = getVaultPath();
      const vault = loadVault(root);
      appendAgentPulse(root, { tool: "get_vault_info", kind: "read", paths: [] });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                root: vault.root,
                noteCount: vault.notes.filter((n) => !isReservedFilename(n.filename)).length,
                types: vault.types,
                tags: vault.tags,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_notes",
    {
      title: "List notes",
      description:
        "List every concept in the vault with its bundle-relative path, title, type, tags, and description (no body text). Use search_notes to filter, or read_note to fetch a specific note's full content.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const root = getVaultPath();
      const vault = loadVault(root);
      const notes = vault.notes
        .filter((n) => !isReservedFilename(n.filename))
        .map((n) => ({
          path: n.path,
          title: n.title,
          type: n.frontmatter.type,
          tags: n.frontmatter.tags,
          description: n.frontmatter.description,
        }));
      appendAgentPulse(root, { tool: "list_notes", kind: "read", paths: [], detail: `${notes.length} notes` });
      return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
    }
  );

  server.registerTool(
    "search_notes",
    {
      title: "Search notes",
      description:
        "Search the vault by free-text query (matched against title, type, description, tags, and body) and/or filter by exact `type` or `tag`. Returns matching notes' metadata, not full bodies.",
      inputSchema: z
        .object({
          query: z.string().optional().describe("Free-text search term, case-insensitive"),
          type: z.string().optional().describe("Exact frontmatter `type` to filter by"),
          tag: z.string().optional().describe("Exact tag to filter by"),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, type, tag }) => {
      const root = getVaultPath();
      const vault = loadVault(root);
      const q = query?.trim().toLowerCase();
      const results = vault.notes
        .filter((n) => !isReservedFilename(n.filename))
        .filter((n) => {
          if (type && n.frontmatter.type !== type) return false;
          if (tag && !(n.frontmatter.tags || []).includes(tag)) return false;
          if (q) {
            const haystack = [n.title, n.frontmatter.type, n.frontmatter.description, ...(n.frontmatter.tags || []), n.body]
              .join(" ")
              .toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        })
        .map((n) => ({ path: n.path, title: n.title, type: n.frontmatter.type, description: n.frontmatter.description }));
      appendAgentPulse(root, {
        tool: "search_notes",
        kind: "read",
        paths: results.map((r) => r.path),
        detail: query || type || tag || undefined,
      });
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.registerTool(
    "semantic_search",
    {
      title: "Semantic search",
      description:
        "Find notes conceptually related to a query using embedding similarity, not keyword matching. Surfaces notes that discuss a topic without necessarily using its exact words. Slower on first call after edits (re-embeds changed notes), fast afterward. Prefer `search_notes` for exact term/tag/type lookups.",
      inputSchema: z
        .object({
          query: z.string().describe("Natural-language description of what you're looking for"),
          topK: z.number().int().min(1).max(50).optional().describe("Max results (default 8)"),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, topK }) => {
      const root = getVaultPath();
      const vault = loadVault(root);
      const notes = vault.notes.filter((n) => !isReservedFilename(n.filename));
      const results = await semanticSearchByText(root, notes, query, topK ?? 8);
      appendAgentPulse(root, {
        tool: "semantic_search",
        kind: "read",
        paths: results.map((r) => r.path),
        detail: query,
      });
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.registerTool(
    "read_note",
    {
      title: "Read note",
      description:
        "Read one note by its bundle-relative path (e.g. /concepts/okf.md). Returns JSON { path, version, content } where content is the full raw markdown (frontmatter + body). Pass the returned version as base_version to write_note for a conflict-checked write that won't overwrite a change made since you read.",
      inputSchema: z.object({ path: z.string().describe("Bundle-relative path, e.g. /concepts/okf.md") }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ path }) => {
      const root = getVaultPath();
      try {
        const content = readNoteRaw(root, path);
        appendAgentPulse(root, { tool: "read_note", kind: "read", paths: [path] });
        return { content: [{ type: "text", text: JSON.stringify({ path, version: versionOf(content), content }, null, 2) }] };
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "get_backlinks",
    {
      title: "Get backlinks",
      description: "List every note that links to the given note (by bundle-relative path).",
      inputSchema: z.object({ path: z.string().describe("Bundle-relative path of the target note") }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ path }) => {
      const root = getVaultPath();
      const vault = loadVault(root);
      const note = vault.notes.find((n) => n.path === path);
      if (!note) return errorResult(`Note not found: ${path}`);
      const backlinks = vault.notes
        .filter((n) => note.backlinks.includes(n.path))
        .map((n) => ({ path: n.path, title: n.title, type: n.frontmatter.type }));
      appendAgentPulse(root, { tool: "get_backlinks", kind: "read", paths: [path] });
      return { content: [{ type: "text", text: JSON.stringify(backlinks, null, 2) }] };
    }
  );

  server.registerTool(
    "check_vault",
    {
      title: "Check vault health",
      description:
        "Scan the vault for integrity issues: broken links (pointing at a note that does not exist), orphaned notes (nothing links to them), and schema violations (notes missing fields required for their type by .amber/schema.json). Use this to audit and clean up an agent-maintained vault.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const root = getVaultPath();
      const health = scanHealth(loadVault(root), loadSchema(root));
      return { content: [{ type: "text", text: JSON.stringify(health, null, 2) }] };
    }
  );

  server.registerTool(
    "write_note",
    {
      title: "Write note",
      description:
        "Overwrite an existing note's full raw content (frontmatter + body) by bundle-relative path. Pass the complete file content, not a diff. Use read_note first to get the current content and its version. Pass that version as base_version so the write is rejected (rather than clobbering) if the note changed since you read it.",
      inputSchema: z
        .object({
          path: z.string().describe("Bundle-relative path of an existing note, e.g. /concepts/okf.md"),
          content: z.string().describe("Full replacement file content, including the --- frontmatter block --- and body"),
          base_version: z
            .string()
            .optional()
            .describe("The version returned by read_note; if set and the note has since changed, the write is rejected"),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ path, content, base_version }) => {
      const root = getVaultPath();
      try {
        const parsed = matter(content);
        const fmType = (parsed.data as { type?: string } | undefined)?.type;
        const { missing } = validateFrontmatter(fmType, (parsed.data || {}) as Record<string, unknown>, loadSchema(root));
        if (missing.length) {
          return errorResult(
            `Schema: a "${fmType}" note requires ${missing.join(", ")}. Add the missing field(s) and write again.`
          );
        }
        let before: string | null = null;
        try {
          before = readNoteRaw(root, path);
        } catch {
          before = null;
        }
        writeNoteRaw(root, path, content, base_version);
        appendActivityLogEntry(root, { tool: "write_note", path, before, after: content });
        appendAgentPulse(root, { tool: "write_note", kind: "write", paths: [path] });
        return { content: [{ type: "text", text: `Saved ${path}` }] };
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "list_templates",
    {
      title: "List note templates",
      description:
        "List the vault's note-body templates (shared shapes for new notes, e.g. meeting, decision). Pass a returned filename as `template` to create_note to start a note from that shape, so agent-written notes stay consistent with the vault's conventions.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const root = getVaultPath();
      const templates = listTemplates(root).map((t) => ({ template: t.filename, name: t.name }));
      return { content: [{ type: "text", text: JSON.stringify(templates, null, 2) }] };
    }
  );

  server.registerTool(
    "create_note",
    {
      title: "Create note",
      description:
        "Create a new OKF-conformant note. Only `type` is required per the OKF spec; `title`/`description`/`tags`/`resource` are recommended. Optionally pass a `template` (see list_templates) to start the body from a shared shape. Fails if the target file already exists.",
      inputSchema: z
        .object({
          dir: z.string().describe("Bundle-relative folder, e.g. /concepts"),
          filename: z.string().optional().describe("Optional filename; derived from title if omitted"),
          type: z.string().describe("OKF `type`, e.g. Concept, Person, Decision, Tool"),
          title: z.string().optional(),
          description: z.string().optional(),
          resource: z.string().optional().describe("URI uniquely identifying the underlying asset"),
          tags: z.array(z.string()).optional(),
          template: z
            .string()
            .optional()
            .describe("Optional template filename from list_templates, e.g. meeting.md; fills the note body"),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      const root = getVaultPath();
      try {
        const result = createNote(root, params);
        const after = readNoteRaw(root, result.path);
        appendActivityLogEntry(root, { tool: "create_note", path: result.path, before: null, after });
        appendAgentPulse(root, { tool: "create_note", kind: "write", paths: [result.path] });
        return { content: [{ type: "text", text: `Created ${result.path}` }] };
      } catch (e) {
        const message = e instanceof VaultOpError ? e.message : e instanceof Error ? e.message : String(e);
        return errorResult(message);
      }
    }
  );

  return server;
}
