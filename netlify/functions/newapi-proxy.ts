import type { Handler } from '@netlify/functions';

const NEWAPI_BASE = 'https://newapi.asia';

// 只允许 New API 的查询接口（防止 SSRF / 路径遍历）
const ALLOWED_PATHS = new Set([
  '/api/usage/token',
  '/api/log/self/stat',
]);

function isPathSafe(path: string): boolean {
  // 1. 必须以 /api/ 开头
  if (!path.startsWith('/api/')) return false;
  // 2. URL 解析后 pathname 不能包含 .. 段（规范化后）
  try {
    const normalized = new URL(path, 'http://placeholder').pathname;
    if (normalized !== path) return false; // 含 .. 或空段
    if (normalized.includes('..')) return false;
  } catch {
    return false;
  }
  // 3. 白名单校验
  return ALLOWED_PATHS.has(path);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};
  const path = params.path || '';
  const auth = event.headers.authorization || event.headers.Authorization || '';

  if (!path) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing path parameter' }),
    };
  }

  if (!isPathSafe(path)) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid path' }),
    };
  }

  const targetUrl = `${NEWAPI_BASE}${path}`;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };
    if (auth) headers['Authorization'] = auth;

    const response = await fetch(targetUrl, { headers });

    const body = await response.text();
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body,
    };
  } catch (e: any) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Proxy error: ${e.message || 'unknown'}` }),
    };
  }
};
