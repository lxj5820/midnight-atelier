import { COMPUTE_POINTS } from './constants';

/**
 * 每张生成价格（美元）
 */
const PRICE_MAP: Record<string, Record<string, number>> = {
  '🍌全能图片V2': { '1K': 0.25, '2K': 0.25, '4K': 0.45 },
  '🍌全能图片PRO': { '1K': 0.5, '2K': 0.5, '4K': 0.88 },
  'GPT Image 2': { '1K': 0.12 },
};

/**
 * 获取当前模型+画质对应的价格
 */
export function getPrice(model: string, quality: string): number | null {
  return PRICE_MAP[model]?.[quality] ?? null;
}

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
