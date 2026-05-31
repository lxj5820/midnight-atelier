export async function uploadImageToOSS(
  imageDataUrl: string,
  type: string,
  id: string
): Promise<string | null> {
  const blob = await dataUrlToBlob(imageDataUrl);

  try {
    const formData = new FormData();
    formData.append('file', blob, `${id}.${extensionFromMime(blob.type)}`);
    formData.append('type', type);
    formData.append('id', id);

    console.log('[OSS] Uploading via server, blob size:', blob.size, 'type:', blob.type);
    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      body: formData,
    });
    console.log('[OSS] Server response status:', response.status);
    if (!response.ok) {
      const msg = await readResponseMessage(response);
      console.warn(`OSS upload failed with status ${response.status}: ${msg}`);
      return null;
    }
    const data = await response.json();
    console.log('[OSS] Upload result:', data.url);
    return data.url || null;
  } catch (err) {
    console.warn('OSS upload failed', err);
    return null;
  }
}

export async function uploadUrlToOSS(
  url: string,
  type: string,
  id: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type, id }),
    });
    if (!response.ok) {
      console.warn(`OSS upload failed with status ${response.status}: ${await readResponseMessage(response)}`);
      return null;
    }
    const data = await response.json();
    return data.url || null;
  } catch (err) {
    console.warn('OSS upload failed', err);
    return null;
  }
}

export async function saveImageToOSS(
  imageUrl: string,
  type: string,
  id: string
): Promise<string> {
  if (isOSSUrl(imageUrl)) return imageUrl;

  if (imageUrl.startsWith('data:')) {
    const ossUrl = await uploadImageToOSS(imageUrl, type, id);
    if (ossUrl) return ossUrl;
    throw new Error('图片已生成，但上传到 OSS 失败');
  }
  if (imageUrl.startsWith('http')) {
    const ossUrl = await uploadUrlToOSS(imageUrl, type, id);
    if (ossUrl) return ossUrl;
    throw new Error('图片已生成，但上传到 OSS 失败');
  }
  return imageUrl;
}

export function getOSSThumbnailUrl(url: string, width: number = 300): string {
  if (!url || !url.includes('aliyuncs.com')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}x-oss-process=image/resize,w_${width}`;
}

export function isOSSUrl(url: string): boolean {
  return !!url && url.includes('aliyuncs.com');
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('Invalid image data URL');
  }
  return response.blob();
}

function extensionFromMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/avif':
      return 'avif';
    case 'image/png':
    default:
      return 'png';
  }
}

async function readResponseMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.message || response.statusText;
  } catch {
    return response.statusText;
  }
}
