import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createServer } from "./mcp-proxy.js";

const app = express();

const { server, cleanup } = await createServer();

let transport: SSEServerTransport;

// Function to validate bearer token
const validateBearerToken = (req: express.Request): boolean => {
  const expectedToken = process.env.MCP_AUTH_TOKEN;
  
  // If no token is configured, authentication is required (changed from previous version)
  if (!expectedToken) {
    console.log("No MCP_AUTH_TOKEN configured, authentication disabled");
    return false; // Changed to false - require token
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("No Authorization header present in request");
    return false;
  }
  
  console.log(`Validating auth header: ${authHeader}`);
  const [type, token] = authHeader.split(' ');
  
  if (type !== 'Bearer') {
    console.log(`Invalid auth type: ${type}, expected 'Bearer'`);
    return false;
  }
  
  const isValid = token === expectedToken;
  console.log(`Token validation result: ${isValid ? 'valid' : 'invalid'}`);
  return isValid;
};

app.get("/sse", async (req, res) => {
  const expectedToken = process.env.MCP_AUTH_TOKEN;
  
  console.log('Checking SSE authorization:', {
    ip: req.ip,
    headers: req.headers,
    authHeader: req.headers.authorization,
    expectedToken: expectedToken ? '[REDACTED]' : 'Not configured'
  });
  
  // Check authorization
  if (!validateBearerToken(req)) {
    console.log(`Unauthorized SSE connection attempt from ${req.ip}`);
    console.log('Authorization failed - token mismatch or missing Bearer token');
    console.log(`Received auth header: ${req.headers.authorization}`);
    console.log(`Expected token format: Bearer ${expectedToken}`);
    res.status(401).send('Unauthorized');
    return;
  }
  
  console.log(`Authorized SSE connection from ${req.ip}`);
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);

  server.onerror = (err) => {
    console.error(`Server onerror: ${err.stack}`)
  }

  server.onclose = async () => {
    console.log('Server onclose')
    if (process.env.KEEP_SERVER_OPEN !== "1") {
      await cleanup();
      await server.close();
      process.exit(0);
    }
  };
});

app.post("/message", async (req, res) => {
  console.log("Received message");
  
  // Check authorization for message endpoint too
  if (!validateBearerToken(req)) {
    console.log(`Unauthorized message attempt from ${req.ip}`);
    res.status(401).send('Unauthorized');
    return;
  }
  
  await transport.handlePostMessage(req, res);
});

const PORT = parseInt(process.env.PORT || '3006', 10);
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
  console.log(`SSE endpoint: http://${HOST}:${PORT}/sse`);
  console.log(`Auth token required: ${process.env.MCP_AUTH_TOKEN ? 'Yes' : 'No'}`);
});
