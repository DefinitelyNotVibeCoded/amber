# Changelog

All notable changes to Amber are recorded here.

## 0.22.0 (2026-07-17)

- Added a Vault Health scan and per-type schema validation. A new health panel (stethoscope
  icon in the toolbar, with a dot when there's something to fix) surfaces three things: broken
  links (pointing at a note that doesn't exist), orphaned notes (nothing links to them), and
  schema violations. Schema rules live in `.amber/schema.json` (seeded with a sensible default):
  each type can declare `required` fields and expected `known` fields, so an agent maintaining
  the vault can't silently drift the frontmatter. The MCP server enforces the schema on
  `write_note` (missing required fields are rejected with a clear message) and exposes a new
  `check_vault` tool so agents can audit and clean up the vault themselves. Every issue in the
  panel is clickable straight to the offending note.

## 0.21.0 (2026-07-17)

- Added write-safety (optimistic concurrency) so a save can no longer silently overwrite a
  change made since the note was read. Reads now return a content-version token; a write that
  carries a stale token is rejected with a 409 instead of clobbering. The editor captures the
  version when you open a note and, if it changed underneath you (for example an agent wrote to
  it mid-edit), warns you without losing your text instead of overwriting. Agents get the same
  guard over MCP: `read_note` now returns `{ path, version, content }` and `write_note` takes an
  optional `base_version`.

## 0.20.0 (2026-07-17)

- Added user-definable note templates. Templates are editable markdown files in
  `.amber/templates/*.md` (seeded with a starter set on first use), with
  `{{title}}`, `{{type}}`, `{{date}}`, and `{{time}}` variables. The New Note dialog
  now has a template picker, and creating a note from a template fills its body from
  that shared shape. Agents get the same thing over MCP: a new `list_templates` tool
  plus an optional `template` argument on `create_note`, so AI-written notes follow
  the same conventions as your own.

## 0.19.0 (2026-07-16)

- Renaming a note now keeps links intact. Previously it moved the file but left every other note that
  linked to it pointing at the old path, silently breaking backlinks. Now every inbound link is
  rewritten to the new path (preserving bundle-relative vs path-relative style and any #fragment), and
  if the note moves to a different directory its own relative outgoing links are rewritten too.
- Deleting a note is no longer permanent. Instead of an unrecoverable `unlink`, the note (and its
  attachment, if nothing else references it) moves to `.amber/trash` as a single restorable entry, and
  the sidebar shows an "Undo" banner right after. Restores refuse to clobber a newer note at the same
  path.

## 0.18.0 (2026-07-16)

- Added semantic search: every note now has a "Related notes" panel ranked
  by embedding similarity, so it surfaces notes that discuss the same thing
  without sharing a keyword. Backed by a new `semantic_search` MCP tool
  (8 tools now, up from 7) for agents to use the same way. Runs a small
  local model ([`all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2)
  via [`@huggingface/transformers`](https://github.com/huggingface/transformers.js))
  entirely on-device: no API key, no per-query network call. The model
  (~90MB) downloads once on first use to `~/.amber/models`, shared across
  vaults; each note's embedding is cached in that vault's own
  `.amber/embeddings.json` and only recomputed when the note's content
  actually changes.

## 0.17.0 (2026-07-15)

- Added a Plugin API. No marketplace, no install step, no build pipeline:
  drop a `.js` file into `<vault>/.amber/plugins/`, reload, and it runs.
  A plugin exports a default object with an `onload(ctx)`; `ctx` gives it
  `registerCommand()` (adds an entry to the command palette),
  `vault.listNotes()` / `.searchNotes()` / `.readNote()` / `.getBacklinks()`
  (the same live vault data the app itself uses), `onNoteOpen()`, and
  `showNotice()`. Manage installed plugins from **Settings → Plugins**
  (enable/disable, reveal the plugins folder). Plugins run in the browser
  alongside the rest of the app, not in Node, so they only ever reach your
  vault through this same API, never the raw filesystem - the same trust
  model as any other plugin ecosystem, just with a narrower blast radius by
  construction. A full working example ships at
  `examples/plugins/word-count.js`.

## 0.16.0 (2026-07-15)

- Document attachments now get their content extracted to real markdown in
  the note body, not just copied in as an opaque file. Uses
  [markitdown-js](https://github.com/Mirza-Glitch/markitdown-js) by
  Mirza-Glitch (a Node.js port of Microsoft's MarkItDown), covering PDFs,
  Word docs, spreadsheets, presentations, HTML, and more. Extraction is
  best-effort: an unsupported or malformed file just skips it, the
  attachment itself is unaffected.
- Marked `markitdown-js` as a server-external package in the Next.js config.
  It transitively depends on `unzipper`, which has an optional, never-used
  `require('@aws-sdk/client-s3')` for S3-backed streams that webpack was
  statically resolving and failing the build on.

## 0.15.0 (2026-07-15)

- Rebuilt the knowledge graph's rendering from SVG to canvas. The old
  per-node DOM elements (each with its own drop-shadow filter) got
  noticeably laggy once a vault had a few hundred notes; canvas draws
  everything in one pass with no per-node DOM cost, so panning, zooming,
  and dragging stay smooth regardless of vault size.
- Retuned the physics to match how Obsidian's own graph actually works:
  one plain link distance and repulsion force over the real link graph,
  no synthetic per-folder clustering force. Clusters now emerge purely
  from which notes actually link to each other, the way an organic vault
  naturally reads, instead of being forced into artificial groupings.
- Fixed node sizing: a note's radius is now scaled relative to the most-
  connected note in your own vault, not a fixed link count. Previously,
  once average connectivity passed about 4 links, nearly every node hit
  the maximum size and looked the same; now the busiest hub always stands
  out and the effect adapts automatically to how densely your vault links.
- The Agents view now traces the real path an agent's activity takes
  through your vault, not just the single note it touched. When a note is
  read or written, the pulse cascades from your vault's entry point,
  through whatever it actually links through, down to that note - found
  by a plain shortest-path search over your real links, not assumed from
  folder structure.
- Category-holder labels (which cluster is which) now show in the Agents
  view too, not just the regular Graph view - the same structural
  information, so both views read the same way.

## 0.14.0 (2026-07-14)

- Added an Agents view: a new toolbar tab (brain icon) that shows how and
  when connected AI agents are actually using the vault, in real time.
  Every one of the 7 MCP tools now logs a lightweight pulse event (which
  notes it touched, and whether it was a read or a write) to
  `.amber/agent-pulse.json`. The Agents view polls for new events and
  lights up the notes they touched: nodes sit dormant and gray until an
  agent reads or writes them, then glow (cyan for reads, amber for
  writes) with a brief ring-burst animation, fading back to dormant over
  about 45 seconds. A live feed panel lists the last 10 events with what
  happened and how long ago.
- This reuses the same physics engine as the regular Graph view, so the
  Agents view is just as alive and moveable.

## 0.13.0 (2026-07-14)

- The knowledge graph is alive now instead of a frozen snapshot. Previously
  the layout ran once, froze, and dragging a node just moved that one node
  in isolation. The simulation now keeps running: it settles into place
  with a visible motion on load, and dragging any node reheats the whole
  layout so connected neighbors ripple and resettle with it, the way
  Obsidian's graph feels, without copying its look.
- Nodes are now sized by how connected they are (backlinks in either
  direction), so hub notes are visually obvious at a glance instead of
  every node being the same size.

## 0.12.0 (2026-07-14)

- Added an Obsidian import. Settings, General, Create new vault now has an
  "Import from Obsidian" mode: point it at an existing Obsidian vault and
  a new folder, and it copies every note over, converting `[[wiki-links]]`
  and `![[embeds]]` to OKF-style markdown links (embeds of images and
  other files are copied into `/attachments`), normalizing string-style
  `tags:` frontmatter into a real array, and adding `type: Note` to
  anything that didn't already have a `type`. The original Obsidian vault
  is never modified. A summary screen after the import shows how many
  notes converted, how many links resolved versus couldn't be matched
  (those become bold text instead of a broken link), and lists every
  unresolved one so they're easy to find and fix by hand.
- Redesigned the MCP diagram in the README: bigger canvas, a properly
  scaled logo, real arrowheads, and a third node for the vault itself so
  it shows the whole path instead of stopping at the server.
- The README's MCP section now shows a real Claude Desktop config snippet
  and a table of all 7 MCP tools instead of a parenthetical list.

## 0.11.0 (2026-07-14)

- Added document attachments. OKF's `resource` field is normally a pointer
  to an external system (a URL), so Amber previously had no way to attach a
  local file, and completely ignored any non-`.md` file sitting in the
  vault. Now the paperclip button (or "Add document" in the command
  palette) lets you pick a file, which gets copied into `/attachments` and
  wrapped in a companion OKF note with real YAML frontmatter, so it shows
  up in the sidebar, graph, and query like any other note.
- Attached images render inline in the note; other file types (PDF, Word,
  zip, etc.) get a file card with an Open action, plus a Reveal-in-folder
  action inside the desktop app.
- Deleting a document note now also removes its attachment file, as long
  as no other note still references it.

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
