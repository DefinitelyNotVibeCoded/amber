#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getVaultPath } from "../src/lib/config";
import { createAmberServer } from "./tools";

async function main() {
  const server = createAmberServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Amber MCP server running via stdio, vault: ${getVaultPath()}`);
}

main().catch((error) => {
  console.error("Amber MCP server error:", error);
  process.exit(1);
});
