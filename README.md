<p align="center">
  <img src=".github/assets/hero.svg" alt="Amber" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/DefinitelyNotVibeCoded/amber/releases/latest"><img src="https://img.shields.io/github/v/release/DefinitelyNotVibeCoded/amber?color=e3aa4a&label=latest" alt="Latest release"></a>
  <a href="https://github.com/DefinitelyNotVibeCoded/amber/releases/latest"><img src="https://img.shields.io/github/downloads/DefinitelyNotVibeCoded/amber/total?color=e3aa4a&label=downloads" alt="Downloads"></a>
  <a href="https://github.com/DefinitelyNotVibeCoded/amber/blob/main/LICENSE"><img src="https://img.shields.io/github/license/DefinitelyNotVibeCoded/amber?color=e3aa4a" alt="License"></a>
  <a href="https://github.com/DefinitelyNotVibeCoded/amber/stargazers"><img src="https://img.shields.io/github/stars/DefinitelyNotVibeCoded/amber?color=e3aa4a&style=flat" alt="Stars"></a>
  <img src="https://img.shields.io/badge/Electron-desktop-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/MCP-stdio%20%2B%20HTTP-e3aa4a" alt="MCP">
</p>

<p align="center"><b>
  Amber is a free, open-source, Obsidian-style desktop app for
  <a href="https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf">Open Knowledge Format</a>
  (OKF) vaults, built from day one to be read and edited by both you and AI agents.
</b></p>

<p align="center">
  <a href="https://github.com/DefinitelyNotVibeCoded/amber/releases/latest"><b>⬇ Download for Windows</b></a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Run from source</a>
  &nbsp;·&nbsp;
  <a href="#mcp-read-and-write-your-vault-from-ai-tools">MCP setup</a>
</p>

<p align="center">
  <img src=".github/assets/screenshots/note.png" alt="Amber note view: metadata card, tags, rendered markdown" width="100%" />
</p>

Obsidian's file format is a proprietary wiki-link dialect locked to its own
plugin ecosystem. Amber's is [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf):
a published, vendor-neutral spec that's just markdown with a handful of YAML
frontmatter keys, no plugin required to parse it, no lock-in to leave it. And
because agents already speak markdown and MCP natively, Amber ships an
**MCP server built in**, not bolted on: Claude, Cursor, Codex, and OpenAI can
read *and write* your vault directly, with every AI-made edit logged, diffed,
and one click from being reverted.

## Screenshots

<table>
<tr>
<td width="50%"><img src=".github/assets/screenshots/graph.png" alt="Interactive knowledge graph, canvas-rendered, node size by connection count" width="100%"><p align="center"><sub><b>Knowledge graph</b>: canvas-rendered so it stays smooth from a handful of notes to thousands, nodes sized by how connected they are, clusters emerge from your real links</sub></p></td>
<td width="50%"><img src=".github/assets/screenshots/agents.png" alt="Agents view showing live AI read and write activity" width="100%"><p align="center"><sub><b>Agents view</b>: watch an AI client read and write your vault live, a pulse traces the real path from your vault's entry point to whatever note it touched</sub></p></td>
</tr>
<tr>
<td width="50%"><img src=".github/assets/screenshots/query.png" alt="Query view" width="100%"><p align="center"><sub><b>Query view</b>: filter, sort, and save views, no plugin needed</sub></p></td>
<td width="50%"><img src=".github/assets/screenshots/command-palette.png" alt="Command palette" width="100%"><p align="center"><sub><b>Command palette</b>: <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> to jump anywhere</sub></p></td>
</tr>
<tr>
<td colspan="2"><img src=".github/assets/screenshots/appearance.png" alt="Theme and reading customization" width="100%"><p align="center"><sub><b>Fully themeable</b>: presets, custom accent, font, and text size</sub></p></td>
</tr>
</table>

## Amber vs. Obsidian

| | Amber | Obsidian |
| --- | --- | --- |
| File format | [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf), a published open spec | Proprietary wiki-link dialect |
| Migrating in | One-click import, converts `[[wiki-links]]` and `![[embeds]]` for you | N/A, you're already there |
| Source | MIT, fully open source | Closed source |
| AI agents read **and write** | Built-in MCP server, no plugin | Community plugins only, read-mostly |
| Audit trail for AI edits | Built-in Activity Log with diffs and one-click revert | None |
| Watch AI activity happen | Built-in Agents view, notes light up live as agents read/write them | None |
| Filter/sort your notes | Built-in Query view | Requires the Dataview plugin |
| Desktop app | Free for everyone, including commercial use | Free for personal use only |
| Plugin ecosystem | Small and young | Huge and mature |

Amber isn't trying to out-plugin Obsidian. It's a different bet: keep the
format open and the AI story first-class, and let the rest stay small.

## Features

- **Vault browser**: folder tree grouped by type, full-text search, type/tag
  filters, resizable sidebar, right-click rename/delete, hover previews on
  internal links
- **Command palette**: `Ctrl`/`Cmd`+`K` fuzzy-jumps to any note or action
- **Obsidian import**: point Amber at an existing Obsidian vault and it
  converts `[[wiki-links]]` and `![[embeds]]` to OKF-style markdown links,
  copies attachments over, and adds the `type` frontmatter OKF requires,
  your original vault is never touched
- **Note view**: OKF frontmatter (`type`, `description`, `resource`, `tags`,
  `timestamp`) rendered as a metadata card above the markdown, in-place
  editing that writes straight back to the `.md` file, no database
- **Document attachments**: attach a PDF, Word doc, spreadsheet, image, or
  almost anything else; it's copied into the vault and wrapped in a real OKF
  note with YAML frontmatter, so it shows up in the sidebar, graph, and query
  like any other note. Its content is also extracted to real markdown right
  in the note body (via [markitdown-js](https://github.com/Mirza-Glitch/markitdown-js),
  see [Tech](#tech)), so the file is actually readable and searchable inside
  Amber, not just an opaque attachment
- **Knowledge graph**: canvas-rendered force layout, zoomable, draggable,
  colored by `type`, node size reflects how connected a note is relative to
  the rest of your vault, and stays smooth whether you have a dozen notes or
  several thousand
- **Query view**: filter by `type`, `tags`, or any custom frontmatter field
  (auto-discovered), sort, save the view, no plugin, no API key
- **Theming**: 5 presets plus a custom accent color, independent font,
  text size, and note-width controls
- **Native desktop app**: Electron, frameless window, its own taskbar icon,
  not a browser tab
- **Built-in MCP server**: read *and* write the vault from Claude, Cursor,
  OpenAI, and more (see below)
- **Agent Activity Log**: every note an MCP client creates or edits is
  logged separately from your own edits, with a line diff and one-click
  revert
- **Agents view**: the same live graph, dormant until an agent touches it,
  a note glows when it's read or written and a pulse cascades along the
  real path from your vault's entry point down to that note, with a
  running feed of what happened and when

## Quick start

**Just want to use it?** [Download the Windows installer](https://github.com/DefinitelyNotVibeCoded/amber/releases/latest)
and run it, no Node.js, no terminal.

**Building from source:**

```bash
git clone https://github.com/DefinitelyNotVibeCoded/amber.git
cd amber
npm install
npm run electron:dev
```

That launches Amber as a real desktop window against the sample OKF bundle in
[`vault/`](vault), a small bundle about OKF itself, so there's something to
click around immediately. Point it at any other folder from **Settings → General**.

Prefer a browser tab instead of a desktop window? `npm run dev` and open
`http://localhost:3000`.

## MCP: read and write your vault from AI tools

<p align="center">
  <img src=".github/assets/mcp-diagram.svg" alt="Amber MCP server: stdio for Claude/Cursor/Windsurf/Gemini CLI/VS Code, Streamable HTTP for OpenAI and ChatGPT" width="100%" />
</p>

Amber ships an MCP server, no separate install, no API key. Point any MCP
client at it and it can read and write your notes like any other tool call.

### Connect Claude Desktop in under a minute

Open **Settings → MCP Server** in Amber, copy the generated config, paste it
into `claude_desktop_config.json`, restart Claude Desktop. The shape looks
like this (Amber fills in the real absolute paths for your machine):

```json
{
  "mcpServers": {
    "amber": {
      "command": "node",
      "args": ["<path-to-amber>/node_modules/tsx/dist/cli.mjs", "<path-to-amber>/mcp/server.ts"]
    }
  }
}
```

Claude Code is a single command instead: `claude mcp add amber -- node "<tsx-cli>" "<mcp/server.ts>"`,
also generated for you with real paths.

### Every client, one server, two transports

| Transport | For | Command |
| --- | --- | --- |
| stdio | Claude Desktop, Claude Code, Cursor, Windsurf, Gemini CLI, VS Code, OpenClaw, Hermes Agent | `npm run mcp` |
| Streamable HTTP (loopback-only) | OpenAI Agents SDK, Responses API, ChatGPT connectors\* | `npm run mcp:http` |

\* ChatGPT's connector picker only accepts a public HTTPS URL. Tunnel the
local HTTP server (`npx mcp-remote http://127.0.0.1:8420/mcp`, or a Cloudflare
Tunnel) to use it there.

Every client's exact config (JSON or YAML, file paths, and copy-paste code
for the OpenAI SDKs) is generated live in **Settings → MCP Server** with real
absolute paths for your machine, no manual editing required.

### The 7 tools an agent gets

| Tool | What it does |
| --- | --- |
| `get_vault_info` | Root path, note count, every `type` and tag in use |
| `list_notes` | Every note's path, title, type, tags, and description |
| `search_notes` | Free-text search plus exact `type`/`tag` filters |
| `read_note` | Full raw markdown (frontmatter and body) of one note |
| `get_backlinks` | Every note that links to a given note |
| `write_note` | Overwrite an existing note's full content |
| `create_note` | Create a new OKF-conformant note |

`write_note` and `create_note` are logged to the Activity Log below, every
other tool is read-only.

### Agent Activity Log

Giving an AI agent write access to your notes only feels safe if you can see
what it did. Every `write_note` and `create_note` call, from any connected
client, is logged separately from your own in-app edits: what changed, when,
and by which tool, with a line-level diff and a one-click revert. Open it
from the history icon in the toolbar, it shows a dot when there's something
to review.

## Project structure

```
amber/
  vault/              sample OKF bundle (swap for your own via Settings)
  mcp/
    tools.ts           the 7 tool definitions, shared by both transports
    server.ts           stdio entry point
    http-server.ts       Streamable HTTP entry point (loopback only)
  electron/main.js      desktop window shell
  src/
    lib/                 OKF parsing, vault read/write, config, activity log, diff
    app/                  Next.js pages + API routes
    components/           sidebar, note view, graph view, settings, activity log, editor
```

## Tech

Next.js (App Router) + TypeScript + Tailwind for the app, `gray-matter` +
custom link resolution for OKF parsing, `d3-force` for the graph layout,
`@modelcontextprotocol/sdk` for MCP, Electron for the desktop shell.

Document-attachment content extraction runs on
[markitdown-js](https://github.com/Mirza-Glitch/markitdown-js) by
[Mirza-Glitch](https://github.com/Mirza-Glitch), a Node.js port of
Microsoft's [MarkItDown](https://github.com/microsoft/markitdown) - all
credit to both for the format-conversion work that makes this possible.

## Contributing

Issues and pull requests are welcome. This is early software: if something's
broken, confusing, or missing, [open an issue](https://github.com/DefinitelyNotVibeCoded/amber/issues).

If Amber is useful to you, a star helps other people find it.

## License

[MIT](LICENSE)
