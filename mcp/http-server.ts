#!/usr/bin/env node
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { getVaultPath } from "../src/lib/config";
import { createAmberServer } from "./tools";

const PORT = process.env.AMBER_MCP_HTTP_PORT ? Number(process.env.AMBER_MCP_HTTP_PORT) : 8420;

// DNS-rebinding-protected Express app, bound to localhost only. This is a
// stateless MCP server: each POST gets its own server+transport pair, which
// is the documented-safe pattern for sessionIdGenerator: undefined.
const app = createMcpExpressApp();

app.post("/mcp", async (req, res) => {
  try {
    const server = createAmberServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

app.get("/mcp", async (_req, res) => {
  res.writeHead(405).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
});

app.delete("/mcp", async (_req, res) => {
  res.writeHead(405).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
});

// Bind explicitly to loopback only. Never expose vault write access to the LAN.
app.listen(PORT, "127.0.0.1", () => {
  console.error(`Amber MCP server (Streamable HTTP) listening on http://127.0.0.1:${PORT}/mcp, vault: ${getVaultPath()}`);
});
