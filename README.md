# coupon-mcp-server

Minimal MCP (Model Context Protocol) server that proxies HTTP requests to a built‑in data source.

No database. No authentication. Zero configuration for end users.

Published on npm as `coupon-mcp-server`.

## Features
- Zero‑config: built‑in upstream, no env required
- MCP stdio server, compatible with MCP clients
- Generic HTTP proxy tool and domain‑specific tools
- Lightweight, JSON‑first responses

## Requirements
- Node.js >= 18.17

## Install & Run (npx)
Run directly without local install:

```bash
npx -y coupon-mcp-server
```

The server starts over stdio and awaits connections from MCP clients.

## MCP Client Integration
Add to your MCP client configuration (stdio):

```json
{
  "mcpServers": {
    "coupon": {
      "command": "npx",
      "args": ["-y", "coupon-mcp-server"]
    }
  }
}
```

No environment variables are required. Any `BASE_URL` environment variable is ignored.

## Tools
- `http.request`
  - Input: `{ method, path, query?, headers?, body? }`
  - Example: `{ "method": "GET", "path": "/coupons" }`
- `coupon.create`
  - Input: `{ body }`
- `coupon.get`
  - Input: `{ id }`
- `coupon.list`
  - Input: `{ query? }`
- `jutuike.public_promo_list`
  - Input: `{ query? }`

## Usage Examples
Convenience tool:

```json
{
  "query": { "page": 1, "size": 20 }
}
```

Generic proxy:

```json
{
  "method": "GET",
  "path": "/api/mcp/jutuike/public_promo_list",
  "query": { "page": 1, "size": 20 }
}
```

## Behavior
- If upstream is JSON (`content-type: application/json`), returns `{ type: "json", json: ... }`.
- Otherwise returns `{ type: "text", text: "Status <code>: <body>" }`.

## Local Development
```bash
npm install
node server.js
```

## Versioning
- Semantic versioning. Update via npx (fetches latest) or `npm update coupon-mcp-server`.

## License
MIT. See `LICENSE`.

## Security Notice
This server is intentionally open (no auth). Do not use it to proxy sensitive/internal data.
