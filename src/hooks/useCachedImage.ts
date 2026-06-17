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
 * 内部缓存 cacheKeys 的字符串表示，避免每次渲染产生新引用导致 effect 重复执行
 */
export function useCachedImageUrls(cacheKeys: (string | null | undefined)[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>(cacheKeys.map(() => null));

  // 缓存字符串形式的 key 列表，用于做引用稳定的依赖
  const cacheKeysKey = useMemo(() => cacheKeys.map(k => k ?? '').join('|'), [cacheKeys]);
  // 缓存实际数组（按字符串拆分还原），让 effect 内部访问的是稳定引用
  const stableKeys = useMemo(() => cacheKeysKey.split('|'), [cacheKeysKey]);

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
  }, [cacheKeysKey]);

  return urls;
}
