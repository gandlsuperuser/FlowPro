import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '../../../lib/mcp/server';

export async function POST(request: Request) {
  const mcpServer = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode for Next.js API routes
  });

  await mcpServer.connect(transport);
  return transport.handleRequest(request);
}

export async function GET(request: Request) {
  const mcpServer = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await mcpServer.connect(transport);
  return transport.handleRequest(request);
}
