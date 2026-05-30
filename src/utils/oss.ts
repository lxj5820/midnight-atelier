export async function uploadImageToOSS(
  imageDataUrl: string,
  type: string,
  id: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl, type, id }),
    });
    if (!response.ok) {
      console.warn(`OSS upload failed with status ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.url || null;
  } catch (err) {
    console.warn('OSS upload failed, falling back to base64 storage', err);
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
      console.warn(`OSS upload failed with status ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.url || null;
  } catch (err) {
    console.warn('OSS upload failed, falling back to direct URL', err);
    return null;
  }
}

export async function saveImageToOSS(
  imageUrl: string,
  type: string,
  id: string
): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    const ossUrl = await uploadImageToOSS(imageUrl, type, id);
    return ossUrl || imageUrl;
  }
  if (imageUrl.startsWith('http')) {
    const ossUrl = await uploadUrlToOSS(imageUrl, type, id);
    return ossUrl || imageUrl;
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
