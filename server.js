#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  ListToolsResultSchema,
  CallToolRequestSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fetch } from 'undici';

const BASE_URL = 'https://mcpcounpon.onrender.com';

const server = new Server(
  {
    name: 'coupon-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  {
    name: 'http.request',
    description:
      'Generic HTTP request tool. Proxies to the configured BASE_URL. No auth, no DB. For example, GET /coupons, POST /coupons, GET /coupons/{id}.',
    input_schema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: { type: 'string', description: 'Path starting with /. Example: /coupons' },
        query: { type: 'object', additionalProperties: true },
        headers: { type: 'object', additionalProperties: true },
        body: { description: 'JSON body for POST/PUT/PATCH', anyOf: [{ type: 'object' }, { type: 'array' }, { type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }] },
      },
      required: ['method', 'path'],
      additionalProperties: false,
    },
  },
  {
    name: 'coupon.create',
    description: 'Create a coupon via POST /coupons with JSON body.',
    input_schema: {
      type: 'object',
      properties: {
        body: { type: 'object', additionalProperties: true },
      },
      required: ['body'],
      additionalProperties: false,
    },
  },
  {
    name: 'coupon.get',
    description: 'Get a coupon by id via GET /coupons/{id}.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'coupon.list',
    description: 'List coupons via GET /coupons with optional query params.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'jutuike.public_promo_list',
    description: 'GET /api/mcp/jutuike/public_promo_list with optional query params.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
];

server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    return { tools };
  },
  ListToolsResultSchema
);

server.setRequestHandler(
  CallToolRequestSchema,
  async (req) => {
    const { name, arguments: args = {} } = req || {};
    try {
      if (name === 'http.request') {
        const { method, path, query, headers, body } = args;
        const url = buildUrl(BASE_URL, path, query);
        const res = await fetch(url, {
          method,
          headers: {
            'content-type': 'application/json',
            ...(headers || {}),
          },
          body: needsBody(method) ? serializeBody(body) : undefined,
        });
        const out = await readResponse(res);
        return { content: [out] };
      }

      if (name === 'coupon.create') {
        const url = buildUrl(BASE_URL, '/coupons');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(args.body ?? {}),
        });
        const out = await readResponse(res);
        return { content: [out] };
      }

      if (name === 'coupon.get') {
        const id = args.id;
        const url = buildUrl(BASE_URL, `/coupons/${encodeURIComponent(id)}`);
        const res = await fetch(url, { method: 'GET' });
        const out = await readResponse(res);
        return { content: [out] };
      }

      if (name === 'coupon.list') {
        const url = buildUrl(BASE_URL, '/coupons', args.query);
        const res = await fetch(url, { method: 'GET' });
        const out = await readResponse(res);
        return { content: [out] };
      }

      if (name === 'jutuike.public_promo_list') {
        const url = buildUrl(BASE_URL, '/api/mcp/jutuike/public_promo_list', args.query);
        const res = await fetch(url, { method: 'GET' });
        const out = await readResponse(res);
        return { content: [out] };
      }

      return {
        content: [
          { type: 'text', text: `Unknown tool: ${name}` },
        ],
        isError: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          { type: 'text', text: `Request failed: ${message}` },
        ],
        isError: true,
      };
    }
  },
  CallToolResultSchema
);

function buildUrl(base, path, query) {
  const p = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  const url = new URL(base + p);
  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (Array.isArray(v)) {
        v.forEach((vv) => url.searchParams.append(k, String(vv)));
      } else if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

function needsBody(method) {
  return ['POST', 'PUT', 'PATCH'].includes(String(method || '').toUpperCase());
}

function serializeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  try { return JSON.stringify(body); } catch { return String(body); }
}

async function readResponse(res) {
  const ct = res.headers.get('content-type') || '';
  let value;
  try {
    if (ct.includes('application/json')) {
      value = await res.json();
      return { type: 'json', json: value };
    }
  } catch {}

  const text = await res.text();
  return { type: 'text', text: `Status ${res.status}: ${text}` };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error(`coupon-mcp-server started. BASE_URL=${BASE_URL}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
