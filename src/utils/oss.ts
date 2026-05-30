export async function uploadImageToOSS(
  imageDataUrl: string,
  type: string,
  id: string
): Promise<string | null> {
  const blob = await dataUrlToBlob(imageDataUrl);

  try {
    return await uploadBlobDirectlyToOSS(blob, type, id);
  } catch (err) {
    console.warn('Direct OSS upload failed, trying server upload fallback', err);
  }

  try {
    const formData = new FormData();
    formData.append('file', blob, `${id}.${extensionFromMime(blob.type)}`);
    formData.append('type', type);
    formData.append('id', id);

    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      body: formData,
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

async function uploadBlobDirectlyToOSS(blob: Blob, type: string, id: string): Promise<string> {
  const contentType = blob.type || 'image/png';
  const signResponse = await fetch('/api/oss-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sign', type, id, contentType }),
  });

  if (!signResponse.ok) {
    throw new Error(`Failed to sign upload: ${await readResponseMessage(signResponse)}`);
  }

  const signedUpload = await signResponse.json();
  if (!signedUpload.uploadUrl || !signedUpload.url) {
    throw new Error('Invalid signed upload response');
  }

  const uploadResponse = await fetch(signedUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': signedUpload.contentType || contentType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload to OSS: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }

  return signedUpload.url;
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
