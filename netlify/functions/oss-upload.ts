import type { Handler } from '@netlify/functions';
import {
  createSignedUpload,
  formDataToPayload,
  getJSONHeaders,
  getOptionsHeaders,
  isOSSConfigured,
  UploadError,
  uploadPayloadToOSS,
} from '../../api/oss-upload-core';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getOptionsHeaders(),
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: getJSONHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL } = process.env;

  const env = { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL };
  if (!isOSSConfigured(env)) {
    return { statusCode: 503, headers: getJSONHeaders(), body: JSON.stringify({ error: 'OSS not configured' }) };
  }

  try {
    const payload = await readPayload(event);
    if (payload.action === 'sign') {
      return {
        statusCode: 200,
        headers: getJSONHeaders(),
        body: JSON.stringify(createSignedUpload(payload, env)),
      };
    }

    const ossUrl = await uploadPayloadToOSS(payload, env);

    return {
      statusCode: 200,
      headers: getJSONHeaders(),
      body: JSON.stringify({ url: ossUrl }),
    };
  } catch (error) {
    console.error('OSS upload error:', error);
    const statusCode = error instanceof UploadError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { statusCode, headers: getJSONHeaders(), body: JSON.stringify({ error: message }) };
  }
};

async function readPayload(event: Parameters<Handler>[0]) {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : Buffer.from(event.body || '');
    const request = new Request('http://localhost/api/oss-upload', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    return formDataToPayload(await request.formData());
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf-8')
      : event.body || '{}';
    return JSON.parse(rawBody);
  } catch (e) {
    console.error('JSON parse error, isBase64Encoded:', event.isBase64Encoded, 'body length:', event.body?.length);
    throw new UploadError(400, 'Invalid JSON');
  }
}
