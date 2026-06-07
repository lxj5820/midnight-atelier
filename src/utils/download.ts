import { isCacheKey, getCachedImageBlob } from './imageCache';

export function getImageProxyUrl(url: string): string {
  if (url.startsWith('data:')) return url;
  const base = window.location.origin;
  return `${base}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export async function downloadImage(url: string, filename: string) {
  if (!filename.includes('.')) {
    filename += '.png';
  }

  // 从缓存获取
  if (isCacheKey(url)) {
    const blob = await getCachedImageBlob(url);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      return;
    }
    // 缓存丢失，向上抛错让调用方处理
    throw new Error('图片缓存已失效，无法下载');
  }

  if (url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    const proxyUrl = getImageProxyUrl(url);
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Proxy failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }
}
