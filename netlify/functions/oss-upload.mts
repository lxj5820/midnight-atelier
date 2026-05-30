import type { Handler } from '@netlify/functions';
import OSS from 'ali-oss';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL } = process.env;

  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
    return { statusCode: 503, body: JSON.stringify({ error: 'OSS not configured' }) };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { image, url, type, id } = body;

    let buffer: Buffer;
    let contentType = 'image/png';
    const filename = `${id || Date.now()}.png`;
    const date = new Date().toISOString().split('T')[0];
    const key = `atelier/${type || 'default'}/${date}/${filename}`;

    if (image && image.startsWith('data:')) {
      const matches = image.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid base64 data URL' }) };
      }
      contentType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Failed to fetch image from URL' }) };
      }
      contentType = response.headers.get('content-type') || 'image/png';
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image data provided' }) };
    }

    const client = new OSS({
      region: OSS_REGION,
      accessKeyId: OSS_ACCESS_KEY_ID,
      accessKeySecret: OSS_ACCESS_KEY_SECRET,
      bucket: OSS_BUCKET,
      secure: true,
    });

    await client.put(key, buffer, {
      headers: { 'Content-Type': contentType },
    });

    const ossUrl = OSS_PUBLIC_URL
      ? `${OSS_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
      : `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${key}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: ossUrl }),
    };
  } catch (error) {
    console.error('OSS upload error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Upload failed' }) };
  }
};
