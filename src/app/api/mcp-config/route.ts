import path from "path";
import { NextResponse } from "next/server";

const HTTP_PORT = process.env.AMBER_MCP_HTTP_PORT ? Number(process.env.AMBER_MCP_HTTP_PORT) : 8420;

export async function GET() {
  const projectRoot = process.cwd();
  const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const stdioEntry = path.join(projectRoot, "mcp", "server.ts");
  const httpUrl = `http://127.0.0.1:${HTTP_PORT}/mcp`;

  const stdioServerBlock = {
    command: "node",
    args: [tsxCli, stdioEntry],
  };

  const claudeDesktopConfig = { mcpServers: { amber: stdioServerBlock } };
  const cursorConfig = { mcpServers: { amber: stdioServerBlock } };
  const windsurfConfig = { mcpServers: { amber: stdioServerBlock } };
  const geminiCliConfig = { mcpServers: { amber: stdioServerBlock } };
  const vscodeConfig = { servers: { amber: { type: "stdio", ...stdioServerBlock } } };

  const openaiAgentsPython = [
    "from agents import Agent, Runner",
    "from agents.mcp import MCPServerStreamableHttp",
    "",
    'async with MCPServerStreamableHttp(params={"url": "' + httpUrl + '"}) as amber:',
    '    agent = Agent(name="assistant", mcp_servers=[amber])',
    '    result = await Runner.run(agent, "What\'s in my Amber vault?")',
  ].join("\n");

  const openaiAgentsJs = [
    "import { Agent, run } from '@openai/agents';",
    "import { MCPServerStreamableHttp } from '@openai/agents-core';",
    "",
    `const amber = new MCPServerStreamableHttp({ url: '${httpUrl}' });`,
    "await amber.connect();",
    "const agent = new Agent({ name: 'assistant', mcpServers: [amber] });",
    "await run(agent, \"What's in my Amber vault?\");",
  ].join("\n");

  const openaiResponsesCurl = [
    'curl https://api.openai.com/v1/responses \\',
    '  -H "Authorization: Bearer $OPENAI_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "model": "gpt-5",',
    '    "input": "What is in my Amber vault?",',
    '    "tools": [{"type": "mcp", "server_label": "amber", "server_url": "' + httpUrl + '"}]',
    "  }'",
  ].join("\n");

  return NextResponse.json({
    projectRoot,
    httpUrl,
    startHttpCommand: "npm run mcp:http",
    stdio: {
      claudeDesktop: {
        label: "Claude Desktop",
        configPretty: JSON.stringify(claudeDesktopConfig, null, 2),
        filePath:
          process.platform === "win32"
            ? "%APPDATA%\\Claude\\claude_desktop_config.json"
            : "~/Library/Application Support/Claude/claude_desktop_config.json",
      },
      claudeCode: {
        label: "Claude Code",
        command: `claude mcp add amber -- node "${tsxCli}" "${stdioEntry}"`,
      },
      cursor: {
        label: "Cursor",
        configPretty: JSON.stringify(cursorConfig, null, 2),
        filePath: "<project>/.cursor/mcp.json (or ~/.cursor/mcp.json for all projects)",
      },
      windsurf: {
        label: "Windsurf",
        configPretty: JSON.stringify(windsurfConfig, null, 2),
        filePath:
          process.platform === "win32"
            ? "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json"
            : "~/.codeium/windsurf/mcp_config.json",
      },
      geminiCli: {
        label: "Gemini CLI",
        configPretty: JSON.stringify(geminiCliConfig, null, 2),
        filePath: process.platform === "win32" ? "%USERPROFILE%\\.gemini\\settings.json" : "~/.gemini/settings.json",
      },
      vscode: {
        label: "VS Code (Copilot)",
        configPretty: JSON.stringify(vscodeConfig, null, 2),
        filePath: "<project>/.vscode/mcp.json",
      },
    },
    http: {
      openaiAgentsPython: { label: "OpenAI Agents SDK (Python)", code: openaiAgentsPython },
      openaiAgentsJs: { label: "OpenAI Agents SDK (JS/TS)", code: openaiAgentsJs },
      openaiResponses: { label: "OpenAI Responses API (curl)", code: openaiResponsesCurl },
      chatgpt: {
        label: "ChatGPT connectors",
        note:
          "ChatGPT's connector picker only accepts a public HTTPS URL, not localhost. It can't reach a server running on your machine directly. Run `npm run mcp:http` to start Amber's MCP server locally, then expose it with a tunnel (e.g. `npx mcp-remote " +
          httpUrl +
          "`, or `cloudflared tunnel --url " +
          httpUrl +
          "`), and paste the resulting HTTPS URL into ChatGPT's \"Add custom connector\" dialog.",
      },
    },
  });
}
