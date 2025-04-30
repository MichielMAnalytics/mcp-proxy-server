#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./mcp-proxy.js";

async function main() {

  console.log("=================================================");
  console.log("MCP PROXY SERVER - AUTH REQUIRED BUILD v1.2");
  console.log("=================================================");
  
  // Check authentication configuration
  const authToken = process.env.MCP_AUTH_TOKEN;
  console.log(`MCP authentication ${authToken ? 'enabled' : 'not configured'}`);
  
  if (!authToken) {
    console.error('ERROR: No MCP_AUTH_TOKEN environment variable set.');
    console.error('Authentication is required for security purposes.');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  const { server, cleanup } = await createServer();

  await server.connect(transport);

  // Cleanup on exit
  process.on("SIGINT", async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
