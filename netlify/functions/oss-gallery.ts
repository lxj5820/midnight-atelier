import type { Handler } from '@netlify/functions';
import { isOSSConfigured, listGalleryImages } from '../../api/oss-gallery-core';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET,
    OSS_GALLERY_BUCKET, OSS_GALLERY_REGION, OSS_GALLERY_PUBLIC_URL, OSS_GALLERY_PREFIX,
    OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL } = process.env;
  const env = {
    OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET,
    OSS_GALLERY_BUCKET, OSS_GALLERY_REGION, OSS_GALLERY_PUBLIC_URL,
    OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL,
  };

  if (!isOSSConfigured(env)) {
    return { statusCode: 503, headers: CORS_HEADERS, body: JSON.stringify({ error: 'OSS not configured' }) };
  }

  const prefix = event.queryStringParameters?.prefix || OSS_GALLERY_PREFIX || 'image/';

  try {
    const images = await listGalleryImages(prefix, env);
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify(images),
    };
  } catch (error) {
    console.error('OSS gallery list error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to list gallery' }),
    };
  }
};
