import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const projectRoot = process.cwd();
  const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const serverEntry = path.join(projectRoot, "mcp", "server.ts");

  const config = {
    mcpServers: {
      amber: {
        command: "node",
        args: [tsxCli, serverEntry],
      },
    },
  };

  return NextResponse.json({
    projectRoot,
    config,
    configPretty: JSON.stringify(config, null, 2),
    claudeDesktopConfigPath:
      process.platform === "win32"
        ? "%APPDATA%\\Claude\\claude_desktop_config.json"
        : "~/Library/Application Support/Claude/claude_desktop_config.json",
    claudeCodeConfigHint: "claude mcp add amber -- node \"" + tsxCli + "\" \"" + serverEntry + "\"",
  });
}
