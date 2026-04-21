import { COMPUTE_POINTS } from './constants';

/**
 * 计算算力消耗
 */
export function getComputePointsCost(model: string, quality: string): number {
  if (model === '🍌全能图片PRO') {
    return quality === '4K' ? COMPUTE_POINTS.PRO_4K : COMPUTE_POINTS.PRO_2K;
  }
  return quality === '4K' ? COMPUTE_POINTS.STD_4K : COMPUTE_POINTS.STD_2K;
}

/**
 * 根据公式 y = 500000x + 278 转换实际额度到展示额度
 */
export function displayQuota(actualQuota: number): string {
  return ((actualQuota - 278) / 500000).toFixed(2);
}
