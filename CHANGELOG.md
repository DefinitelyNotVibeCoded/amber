# Changelog

All notable changes to Amber are recorded here.

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
