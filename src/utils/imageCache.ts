/**
 * 图片缓存工具 - 使用 IndexedDB 存储 Blob，避免 base64 占用过多空间
 * 缓存 key 格式: cache://{id}
 * GenerationRecord.imageUrl / referenceImageUrl 存缓存 key，显示时从缓存读取 blob URL
 */

const IMAGE_CACHE_DB = 'atelier_image_cache';
const IMAGE_CACHE_STORE = 'images';
const IMAGE_CACHE_VERSION = 1;

function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_CACHE_DB, IMAGE_CACHE_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_CACHE_STORE)) {
        db.createObjectStore(IMAGE_CACHE_STORE);
      }
    };
  });
}

/** 判断是否为缓存 key */
export function isCacheKey(url: string): boolean {
  return url.startsWith('cache://');
}

/** 从 data URL 中提取 MIME type */
function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+)/);
  return match?.[1] || 'image/png';
}

/**
 * 将图片（base64 data URL 或 Blob）存入缓存，返回缓存 key
 */
export async function cacheImage(source: string | Blob, id?: string): Promise<string> {
  const key = id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = `cache://${key}`;

  let blob: Blob;
  if (source instanceof Blob) {
    blob = source;
  } else if (source.startsWith('data:')) {
    // base64 data URL -> Blob，确保 MIME type 正确
    const mimeType = extractMimeType(source);
    const res = await fetch(source);
    blob = await res.blob();
    if (!blob.type || blob.type === 'application/octet-stream') {
      blob = new Blob([blob], { type: mimeType });
    }
  } else {
    // 外部 URL -> fetch -> Blob（通过代理避免 CORS）
    const { fetchImage } = await import('./oss');
    const res = await fetchImage(source);
    blob = await res.blob();
  }

  const db = await openCacheDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
    tx.objectStore(IMAGE_CACHE_STORE).put(blob, cacheKey);
    tx.oncomplete = () => { db.close(); resolve(cacheKey); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * 从缓存读取图片，返回 blob URL（用于 <img> 显示）
 * 调用方负责在不需要时 URL.revokeObjectURL(url)
 */
export async function getCachedImage(cacheKey: string): Promise<string | null> {
  if (!isCacheKey(cacheKey)) return cacheKey; // 非 cache key 直接返回

  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_CACHE_STORE, 'readonly');
      const request = tx.objectStore(IMAGE_CACHE_STORE).get(cacheKey);
      request.onsuccess = () => {
        const blob = request.result as Blob | undefined;
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * 从缓存读取图片 Blob（用于 fetch / FormData 等）
 */
export async function getCachedImageBlob(cacheKey: string): Promise<Blob | null> {
  if (!isCacheKey(cacheKey)) {
    // 非 cache key，通过代理 fetch
    try {
      const { fetchImage } = await import('./oss');
      const res = await fetchImage(cacheKey);
      return await res.blob();
    } catch {
      return null;
    }
  }

  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_CACHE_STORE, 'readonly');
      const request = tx.objectStore(IMAGE_CACHE_STORE).get(cacheKey);
      request.onsuccess = () => resolve(request.result as Blob || null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * 删除缓存中的图片
 */
export async function deleteCachedImage(cacheKey: string): Promise<void> {
  if (!isCacheKey(cacheKey)) return;
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
      tx.objectStore(IMAGE_CACHE_STORE).delete(cacheKey);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch { /* ignore */ }
}

/**
 * 批量缓存图片，返回缓存 key 数组
 */
export async function cacheImages(sources: (string | Blob)[], ids?: string[]): Promise<string[]> {
  const keys: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const key = await cacheImage(sources[i], ids?.[i]);
    keys.push(key);
  }
  return keys;
}
