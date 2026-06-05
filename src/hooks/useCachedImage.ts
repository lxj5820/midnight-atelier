import { useState, useEffect } from 'react';
import { getCachedImage, isCacheKey } from '../utils/imageCache';

/**
 * Hook: 将 cache key 解析为可显示的 blob URL
 * 自动管理 blob URL 的生命周期（组件卸载时 revoke）
 */
export function useCachedImageUrl(cacheKey: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheKey) { setUrl(null); return; }
    if (!isCacheKey(cacheKey)) { setUrl(cacheKey); return; }

    let revoked = false;
    let currentBlobUrl: string | undefined;
    getCachedImage(cacheKey).then(blobUrl => {
      if (revoked) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }
      currentBlobUrl = blobUrl ?? undefined;
      setUrl(blobUrl);
    });
    return () => {
      revoked = true;
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [cacheKey]);

  return url;
}

/**
 * Hook: 批量解析 cache keys 为 blob URLs
 */
export function useCachedImageUrls(cacheKeys: (string | null | undefined)[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>(cacheKeys.map(() => null));

  useEffect(() => {
    let cancelled = false;
    const resolvedUrls: string[] = [];
    const resolve = async () => {
      const resolved: (string | null)[] = [];
      for (const key of cacheKeys) {
        if (!key) { resolved.push(null); continue; }
        if (!isCacheKey(key)) { resolved.push(key); continue; }
        const blobUrl = await getCachedImage(key);
        if (blobUrl) resolved.push(blobUrl);
        else resolved.push(null);
      }
      if (!cancelled) {
        setUrls(resolved);
        resolvedUrls.push(...resolved.filter((url): url is string => url != null));
      } else {
        for (const url of resolved) {
          if (url) URL.revokeObjectURL(url);
        }
      }
    };
    resolve();
    return () => {
      cancelled = true;
      for (const blobUrl of resolvedUrls) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [JSON.stringify(cacheKeys)]);

  return urls;
}
