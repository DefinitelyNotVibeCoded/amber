import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getVaultPath } from "../src/lib/config";
import { loadVault } from "../src/lib/okf";
import { isReservedFilename } from "../src/lib/okfClient";
import { readNoteRaw, writeNoteRaw, createNote, VaultOpError } from "../src/lib/vaultOps";
import { appendActivityLogEntry } from "../src/lib/activityLog";

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
      const vault = loadVault(getVaultPath());
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
      const vault = loadVault(getVaultPath());
      const notes = vault.notes
        .filter((n) => !isReservedFilename(n.filename))
        .map((n) => ({
          path: n.path,
          title: n.title,
          type: n.frontmatter.type,
          tags: n.frontmatter.tags,
          description: n.frontmatter.description,
        }));
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
      const vault = loadVault(getVaultPath());
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
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.registerTool(
    "read_note",
    {
      title: "Read note",
      description: "Read the full raw markdown (frontmatter + body) of one note by its bundle-relative path, e.g. /concepts/okf.md.",
      inputSchema: z.object({ path: z.string().describe("Bundle-relative path, e.g. /concepts/okf.md") }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ path }) => {
      try {
        const content = readNoteRaw(getVaultPath(), path);
        return { content: [{ type: "text", text: content }] };
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
      const vault = loadVault(getVaultPath());
      const note = vault.notes.find((n) => n.path === path);
      if (!note) return errorResult(`Note not found: ${path}`);
      const backlinks = vault.notes
        .filter((n) => note.backlinks.includes(n.path))
        .map((n) => ({ path: n.path, title: n.title, type: n.frontmatter.type }));
      return { content: [{ type: "text", text: JSON.stringify(backlinks, null, 2) }] };
    }
  );

  server.registerTool(
    "write_note",
    {
      title: "Write note",
      description:
        "Overwrite an existing note's full raw content (frontmatter + body) by bundle-relative path. Pass the complete file content, not a diff. Use read_note first to get the current content to edit.",
      inputSchema: z
        .object({
          path: z.string().describe("Bundle-relative path of an existing note, e.g. /concepts/okf.md"),
          content: z.string().describe("Full replacement file content, including the --- frontmatter block --- and body"),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ path, content }) => {
      const root = getVaultPath();
      try {
        let before: string | null = null;
        try {
          before = readNoteRaw(root, path);
        } catch {
          before = null;
        }
        writeNoteRaw(root, path, content);
        appendActivityLogEntry(root, { tool: "write_note", path, before, after: content });
        return { content: [{ type: "text", text: `Saved ${path}` }] };
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "create_note",
    {
      title: "Create note",
      description:
        "Create a new OKF-conformant note. Only `type` is required per the OKF spec; `title`/`description`/`tags`/`resource` are recommended. Fails if the target file already exists.",
      inputSchema: z
        .object({
          dir: z.string().describe("Bundle-relative folder, e.g. /concepts"),
          filename: z.string().optional().describe("Optional filename; derived from title if omitted"),
          type: z.string().describe("OKF `type`, e.g. Concept, Person, Decision, Tool"),
          title: z.string().optional(),
          description: z.string().optional(),
          resource: z.string().optional().describe("URI uniquely identifying the underlying asset"),
          tags: z.array(z.string()).optional(),
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
        return { content: [{ type: "text", text: `Created ${result.path}` }] };
      } catch (e) {
        const message = e instanceof VaultOpError ? e.message : e instanceof Error ? e.message : String(e);
        return errorResult(message);
      }
    }
  );

  return server;
}
