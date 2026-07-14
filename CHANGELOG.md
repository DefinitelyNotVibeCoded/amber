# Changelog

All notable changes to Amber are recorded here.

## 0.10.0 (2026-07-14)

- Hid the Next.js dev tools indicator that showed up in the corner during
  development.
- Rebuilt the New note dialog: it now opens to just a title and a row of
  colored type chips, with folder, filename, description, and tags tucked
  behind an "Advanced" toggle instead of shown upfront.
- Each note type now seeds a starting body structure when you create a
  note (Concept, Person, Decision, and Tool each get their own section
  headers), and picking a type auto-picks the matching folder (Person to
  `/people`, Decision to `/decisions`, and so on).
- New notes now open straight into edit mode with that template filled in,
  ready to type into immediately instead of landing on a mostly-blank
  rendered page.

## 0.9.0 (2026-07-13)

- The desktop app no longer shows the default Windows title bar. The window
  is frameless: Amber's own toolbar is the title bar (drag it to move the
  window, double-click it to maximize) with custom minimize, maximize, and
  close buttons on the right.
- New Reading section in Settings, Appearance: choose the note font (sans,
  serif, or mono), text size (S/M/L), and note column width (narrow, normal,
  wide). All apply instantly and persist.
- Cleaner toolbar: slimmer height, the vault path moved out of the bar and
  into the logo tooltip (it still lives in Settings, General).

## 0.8.0 (2026-07-13)

- Rebuilt the knowledge graph view: zoom, pan, drag nodes, fit-to-view, and
  click a legend type to isolate it. Curved edges with halo'd labels replace
  the old straight-line spiderweb, and force physics are tuned so clusters
  actually spread out and stay readable.
- Amber now ships as a real installable Windows app instead of a localhost
  dev server: the production build runs on Electron's own bundled runtime
  (no separate Node.js install required), packaged with electron-builder
  into a standard NSIS installer.
- Right-click any note in the sidebar for Open, Rename, Delete, and (inside
  the desktop app) Reveal in folder. Rename and delete happen inline in the
  tree, no dialogs.
- Added a command palette: `Ctrl`/`Cmd`+`K` opens a fuzzy search over every
  note plus quick actions (new note, switch view, open Settings, open Agent
  activity). Arrow keys to navigate, Enter to jump.
- The sidebar is now resizable by dragging its right edge; width persists
  across restarts.
- Switching notes or views now transitions with a short fade instead of
  snapping instantly.
- Hovering an internal link shows a preview popover (type, title,
  description) before you click through.

## 0.7.0 (2026-07-13)

- Added a Query view (Dataview-style, built in, no plugin, no API key):
  filter notes by `type`, `tags`, `title`, `description`, `resource`,
  `timestamp`, `path`, or any custom frontmatter field the vault actually
  uses (auto-discovered, e.g. `status`), sort results, and view them as a
  table. Click a row to open that note.
- Saved views persist per-vault at `.amber/views.json` (git-ignored):
  name a filter set, reload it later, delete it when it's no longer useful.
- New "Query" toggle in the toolbar alongside Note and Graph.

## 0.6.0 (2026-07-13)

- Added an Agent Activity Log: every note an MCP client creates or edits is
  logged separately from your own in-app edits, with a line-level diff and
  one-click revert. Opens from the new history icon in the toolbar, which
  shows a dot when there's activity to review.
- Log entries are stored per-vault at `.amber/activity-log.json` (git-
  ignored), capped at the last 300 entries.
- Added OpenClaw (`~/.openclaw/openclaw.json`) and Hermes Agent
  (`~/.hermes/config.yaml`, YAML) to the MCP connector list in Settings,
  each with its own real config format.
- Fixed a real bug found while testing: the activity log's row toggle was a
  `<button>` containing nested `<button>`s (revert, note title), which is
  invalid HTML and caused a hydration/compile error. Row toggle is now a
  `div[role=button]` with keyboard support, buttons stay siblings.

## 0.5.0 (2026-07-12)

- Added theme customization: 5 presets (Amber, Slate, Violet, Forest, Light)
  plus a custom accent color picker, in Settings, Appearance. Colors persist
  in localStorage and apply instantly across the whole app.
- Every accent-dependent color (button text contrast, glow shadows, graph
  highlights) is now derived from a single accent hex at runtime, so custom
  colors look correct everywhere instead of just where amber was hardcoded.
- Rebuilt the knowledge graph to be interactive: scroll to zoom toward the
  cursor, drag the background to pan, drag individual nodes to reposition
  them, click a legend type to isolate it, and use the fit-to-view or
  re-run-layout buttons to recover or reset.
- Fixed two bugs found while testing the graph rewrite: dimmed graph
  elements were unreadable on the Light theme (raised the opacity floor),
  and d3-force mutates link source/target into node object references
  during simulation, which silently broke link rendering after the
  interactivity rewrite (normalized back to id strings after layout).

## 0.4.0 (2026-07-12)

- Added vault templates: Blank, Second Brain, Team Knowledge Base, and
  Research starting points, each explicit that the layout is a suggestion,
  not a requirement (OKF only requires `type` in frontmatter). Available
  from Settings, General, Create new vault.
- Added a native folder picker in the Electron build (`electron/preload.js`,
  `dialog.showOpenDialog`) for choosing where a new vault lives.
- Fixed a link-extraction bug where markdown link syntax shown as a literal
  code example (inside backticks) was parsed as a real link, creating
  spurious backlinks. Fenced code blocks and inline code spans are now
  excluded from link scanning.

## 0.3.0 (2026-07-12)

- Added a Streamable HTTP transport (`mcp/http-server.ts`, `npm run mcp:http`)
  alongside the existing stdio server, bound to loopback only, so OpenAI's
  Agents SDK/Responses API and any other HTTP-capable MCP client can connect.
- Settings → MCP Server now has a connector picker with ready-to-copy configs
  for Claude Desktop, Claude Code, Cursor, Windsurf, Gemini CLI, VS Code
  (stdio), plus OpenAI Agents SDK (Python/JS), OpenAI Responses API, and
  ChatGPT connectors (HTTP, with a tunnel note since ChatGPT can't reach
  localhost directly).
- Factored MCP tool definitions into `mcp/tools.ts` so both transports share
  one implementation.

## 0.2.0 (2026-07-12)

- Added a built-in MCP server (`mcp/server.ts`) so Claude Desktop, Claude Code, or
  any other MCP client can read, search, and write the vault directly and
  repeatedly across chats.
- Packaged Amber as an Electron desktop app (`npm run electron:dev` for
  development, `npm run dist` to build a Windows installer) instead of a
  browser tab.
- Deepened the Settings panel into General / MCP Server / About sections,
  with a ready-to-paste Claude Desktop config snippet and app version display.
- Refactored note read/write/create logic into `src/lib/vaultOps.ts`, shared
  by both the web app's API routes and the MCP server.

## 0.1.0 (2026-07-12)

- Initial MVP: vault browser (folder tree, search, type/tag filters), note
  view with OKF frontmatter metadata card, force-directed knowledge graph,
  in-place markdown editing, and new-note creation.
- Custom logo and a full visual redesign (pill controls, refined dark
  palette, backlinks, graph legend).
- Seeded sample OKF bundle describing the format itself.
