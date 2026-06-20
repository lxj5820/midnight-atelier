import { useState, useEffect, useMemo, useRef } from 'react';
import { getCachedImage, isCacheKey } from '../utils/imageCache';

export type CachedImageState = 'loading' | 'loaded' | 'missing';

/**
 * Hook: 将 cache key 解析为可显示的 blob URL
 * 自动管理 blob URL 的生命周期（组件卸载时 revoke）
 * 返回 [url, state] —— state 为 missing 表示图片已丢失
 */
export function useCachedImageUrl(cacheKey: string | null | undefined): [string | null, CachedImageState] {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<CachedImageState>(cacheKey ? 'loading' : 'missing');

  useEffect(() => {
    if (!cacheKey) { setUrl(null); setState('missing'); return; }
    if (!isCacheKey(cacheKey)) { setUrl(cacheKey); setState('loaded'); return; }

    let revoked = false;
    let currentBlobUrl: string | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const MAX_ATTEMPTS = 3;

    const tryResolve = () => {
      if (revoked) return;
      setState('loading');
      getCachedImage(cacheKey).then(blobUrl => {
        if (revoked) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          currentBlobUrl = blobUrl;
          setUrl(blobUrl);
          setState('loaded');
        } else {
          // 缓存读取返回 null —— 可能是瞬时错误，重试几次后再判定为 missing
          attempt += 1;
          if (attempt < MAX_ATTEMPTS) {
            retryTimer = setTimeout(tryResolve, 200 * attempt);
          } else {
            setUrl(null);
            setState('missing');
          }
        }
      });
    };

    tryResolve();

    return () => {
      revoked = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [cacheKey]);

  return [url, state];
}

/**
 * Hook: 批量解析 cache keys 为 blob URLs
 * 使用 JSON 序列化比较 key 内容，只在数组内容变化时重新解析，避免新数组引用导致 effect 重复执行
 */
export function useCachedImageUrls(cacheKeys: (string | null | undefined)[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>(cacheKeys.map(() => null));

  // 用 ref 保存序列化后的 key 和实际数组，只在内容真正变化时更新引用
  const serializedRef = useRef(JSON.stringify(cacheKeys));
  const keysRef = useRef(cacheKeys);

  const currentSerialized = JSON.stringify(cacheKeys);
  if (currentSerialized !== serializedRef.current) {
    serializedRef.current = currentSerialized;
    keysRef.current = cacheKeys;
  }

  const stableKeys = keysRef.current;

  // 用 ref 跟踪当前已 resolve 的 blob URL，确保 cleanup 能正确 revoke
  const resolvedUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const currentBatch: string[] = [];
    resolvedUrlsRef.current = [];
    const resolve = async () => {
      const resolved: (string | null)[] = [];
      for (const key of stableKeys) {
        if (!key) { resolved.push(null); continue; }
        if (!isCacheKey(key)) { resolved.push(key); continue; }
        const blobUrl = await getCachedImage(key);
        if (cancelled) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          continue;
        }
        if (blobUrl) {
          currentBatch.push(blobUrl);
          resolved.push(blobUrl);
        } else {
          resolved.push(null);
        }
      }
      if (!cancelled) {
        setUrls(resolved);
        resolvedUrlsRef.current = currentBatch;
      } else {
        // 已取消，把当前批次所有 blob URL revoke
        for (const url of currentBatch) URL.revokeObjectURL(url);
      }
    };
    resolve();
    return () => {
      cancelled = true;
      for (const blobUrl of resolvedUrlsRef.current) {
        URL.revokeObjectURL(blobUrl);
      }
      resolvedUrlsRef.current = [];
    };
  }, [stableKeys]);

  return urls;
}
