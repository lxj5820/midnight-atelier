import { RESOLUTION_MAP } from './constants';

/**
 * 将 Blob 转换为 base64 字符串（不含 data URL 前缀）
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const result = reader.result as string;
        if (!result || !result.includes(',')) {
          reject(new Error('图片格式转换失败'));
          return;
        }
        resolve(result.split(',')[1]);
      } catch (e) {
        reject(new Error('图片数据处理失败'));
      }
    };
    reader.onerror = () => reject(new Error('图片读取失败，请尝试重新上传'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 获取图片尺寸
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * 根据图片尺寸找到最接近的比例
 */
export function getClosestAspectRatio(width: number, height: number): string {
  const imageRatio = width / height;
  const aspectRatios = Object.keys(RESOLUTION_MAP);
  let closest = '1:1';
  let minDiff = Infinity;

  for (const ratio of aspectRatios) {
    const [w, h] = ratio.split(':').map(Number);
    const mapRatio = w / h;
    const diff = Math.abs(imageRatio - mapRatio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }
  return closest;
}

/**
 * 获取分辨率配置
 */
export function getResolution(aspectRatio: string, quality: string): { width: number; height: number; tokens: number } {
  return RESOLUTION_MAP[aspectRatio]?.[quality] || RESOLUTION_MAP['1:1']['2K'];
}
