import OSS from 'ali-oss';

export interface OssUploadEnv {
  OSS_ACCESS_KEY_ID?: string;
  OSS_ACCESS_KEY_SECRET?: string;
  OSS_BUCKET?: string;
  OSS_REGION?: string;
  OSS_PUBLIC_URL?: string;
}

interface UploadPayload {
  action?: string;
  image?: string;
  url?: string;
  type?: string;
  id?: string;
  contentType?: string;
  file?: {
    buffer: Buffer;
    contentType: string;
  };
}

interface PreparedUpload {
  buffer: Buffer;
  contentType: string;
  type: string;
  id: string;
}

export class UploadError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'UploadError';
    this.statusCode = statusCode;
  }
}

export function isOSSConfigured(env: OssUploadEnv): boolean {
  return !!(env.OSS_ACCESS_KEY_ID && env.OSS_ACCESS_KEY_SECRET && env.OSS_BUCKET && env.OSS_REGION);
}

export function getJSONHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    ...extra,
  };
}

export function getOptionsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function formDataToPayload(formData: FormData): Promise<UploadPayload> {
  const file = formData.get('file') || formData.get('image');
  const payload: UploadPayload = {
    url: stringValue(formData.get('url')),
    type: stringValue(formData.get('type')),
    id: stringValue(formData.get('id')),
  };

  if (isBlobLike(file)) {
    const contentType = file.type || 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());
    payload.file = { buffer, contentType };
  } else {
    payload.image = stringValue(file);
  }

  return payload;
}

export async function uploadPayloadToOSS(payload: UploadPayload, env: OssUploadEnv): Promise<string> {
  if (!isOSSConfigured(env)) {
    throw new UploadError(503, 'OSS not configured');
  }

  const prepared = await prepareUpload(payload);
  const key = createObjectKey(prepared.type, prepared.id, prepared.contentType);
  const client = createOSSClient(env);

  await client.put(key, prepared.buffer, {
    headers: { 'Content-Type': prepared.contentType },
  });

  return getPublicObjectUrl(key, env);
}

export function createSignedUpload(payload: UploadPayload, env: OssUploadEnv): { uploadUrl: string; url: string; key: string; contentType: string } {
  if (!isOSSConfigured(env)) {
    throw new UploadError(503, 'OSS not configured');
  }

  const contentType = payload.contentType || 'image/png';
  validateImageContentType(contentType);

  const type = sanitizePathPart(payload.type || 'default');
  const id = sanitizePathPart(payload.id || String(Date.now()));
  const key = createObjectKey(type, id, contentType);
  const client = createOSSClient(env);
  const uploadUrl = client.signatureUrl(key, {
    expires: 900,
    method: 'PUT',
    'Content-Type': contentType,
  });

  return {
    uploadUrl,
    url: getPublicObjectUrl(key, env),
    key,
    contentType,
  };
}

function createOSSClient(env: OssUploadEnv): OSS {
  return new OSS({
    region: env.OSS_REGION!,
    accessKeyId: env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET!,
    bucket: env.OSS_BUCKET!,
    secure: true,
  });
}

function createObjectKey(type: string, id: string, contentType: string): string {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${id}${extensionFromContentType(contentType)}`;
  return `atelier/${type}/${date}/${filename}`;
}

function getPublicObjectUrl(key: string, env: OssUploadEnv): string {
  return env.OSS_PUBLIC_URL
    ? `${env.OSS_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
    : `https://${env.OSS_BUCKET}.${env.OSS_REGION}.aliyuncs.com/${key}`;
}

async function prepareUpload(payload: UploadPayload): Promise<PreparedUpload> {
  const type = sanitizePathPart(payload.type || 'default');
  const id = sanitizePathPart(payload.id || String(Date.now()));

  if (payload.file) {
    validateImageContentType(payload.file.contentType);
    return {
      buffer: payload.file.buffer,
      contentType: payload.file.contentType,
      type,
      id,
    };
  }

  if (payload.image) {
    const parsed = parseDataUrl(payload.image);
    return { ...parsed, type, id };
  }

  if (payload.url) {
    const parsedUrl = parseRemoteImageUrl(payload.url);
    const response = await fetch(parsedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': parsedUrl.origin + '/',
      },
    });

    if (!response.ok) {
      throw new UploadError(400, `Failed to fetch image from URL (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    validateImageContentType(contentType, 'URL did not return an image');

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType,
      type,
      id,
    };
  }

  throw new UploadError(400, 'No image data provided');
}

function parseDataUrl(image: string): { buffer: Buffer; contentType: string } {
  const matches = image.match(/^data:(.+?);base64,(.+)$/);
  if (!matches) {
    throw new UploadError(400, 'Invalid base64 data URL');
  }

  const contentType = matches[1] || 'image/png';
  validateImageContentType(contentType);

  return {
    buffer: Buffer.from(matches[2], 'base64'),
    contentType,
  };
}

function validateImageContentType(contentType: string, message = 'Only image data can be uploaded'): void {
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new UploadError(400, message);
  }
}

function parseRemoteImageUrl(url: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new UploadError(400, 'Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new UploadError(400, 'Invalid URL protocol');
  }

  return parsedUrl;
}

function extensionFromContentType(contentType: string): string {
  const mime = contentType.toLowerCase().split(';', 1)[0].trim();
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/avif':
      return '.avif';
    case 'image/png':
    default:
      return '.png';
  }
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'default';
}

function stringValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function isBlobLike(value: FormDataEntryValue | null): value is File {
  return !!value && typeof value !== 'string' && typeof value.arrayBuffer === 'function';
}
