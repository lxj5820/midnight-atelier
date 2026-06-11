import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const params = event.queryStringParameters;
  const imageUrl = params?.url;

  if (!imageUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing url parameter' }) };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL protocol' }) };
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': parsedUrl.origin + '/',
      },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: `Upstream error: ${response.status}` }) };
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentType.startsWith('image/') ? 'inline' : 'attachment',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch image' }) };
  }
};
