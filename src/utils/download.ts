import { isCacheKey, getCachedImageBlob } from './imageCache';
import { isOSSUrl } from './oss';

export function getImageProxyUrl(url: string, download: boolean = false): string {
  if (url.startsWith('data:')) return url;
  const base = window.location.origin;
  const downloadParam = download ? '&download=1' : '';
  return `${base}/api/image-proxy?url=${encodeURIComponent(url)}${downloadParam}`;
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

  // OSS URL 已设置 Content-Disposition: attachment，直接打开即可触发下载
  if (isOSSUrl(url)) {
    window.open(url, '_blank');
    return;
  }

  // 非 OSS URL 通过代理下载
  try {
    const proxyUrl = getImageProxyUrl(url, true);
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
    window.open(url, '_blank');
  }
}
