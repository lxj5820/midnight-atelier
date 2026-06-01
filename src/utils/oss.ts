export async function uploadImageToOSS(
  imageDataUrl: string,
  type: string,
  id: string
): Promise<string | null> {
  try {
    const compressed = await compressImageDataUrl(imageDataUrl);
    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: compressed, type, id }),
    });
    if (!response.ok) {
      const msg = await readResponseMessage(response);
      console.warn(`OSS upload failed with status ${response.status}: ${msg}`);
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

function compressImageDataUrl(dataUrl: string, maxBytes = 4 * 1024 * 1024): Promise<string> {
  const base64Part = dataUrl.split(',')[1] || '';
  const estimatedBytes = Math.ceil(base64Part.length * 0.75);
  if (estimatedBytes <= maxBytes) return Promise.resolve(dataUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0);
        const jpeg = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpeg);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function readResponseMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data.error || data.message || response.statusText;
    } catch {
      return text || response.statusText;
    }
  } catch {
    return response.statusText;
  }
}
