import { createSignedUpload, formDataToPayload, getJSONHeaders, getOptionsHeaders, isOSSConfigured, UploadError, uploadPayloadToOSS } from './oss-upload-core';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    for (const [key, value] of Object.entries(getOptionsHeaders())) {
      res.setHeader(key, value);
    }
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL } = process.env;

  const env = { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL };
  if (!isOSSConfigured(env)) {
    return res.status(503).json({ error: 'OSS not configured' });
  }

  try {
    const payload = await readPayload(req);
    if (payload.action === 'sign') {
      const signedUpload = createSignedUpload(payload, env);
      for (const [key, value] of Object.entries(getJSONHeaders())) {
        res.setHeader(key, value);
      }
      return res.status(200).json(signedUpload);
    }

    const ossUrl = await uploadPayloadToOSS(payload, env);

    for (const [key, value] of Object.entries(getJSONHeaders())) {
      res.setHeader(key, value);
    }
    return res.status(200).json({ url: ossUrl });
  } catch (error) {
    console.error('OSS upload error:', error);
    const statusCode = error instanceof UploadError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Upload failed';
    return res.status(statusCode).json({ error: message });
  }
}

async function readPayload(req: any) {
  const contentType = req.headers?.['content-type'] || req.headers?.['Content-Type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const request = new Request('http://localhost/api/oss-upload', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: Buffer.concat(chunks),
    });
    return formDataToPayload(await request.formData());
  }

  return req.body || {};
}
