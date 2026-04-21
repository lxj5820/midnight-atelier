// 分辨率映射表
export const RESOLUTION_MAP: Record<string, Record<string, { width: number; height: number; tokens: number }>> = {
  '1:1': { '1K': { width: 1024, height: 1024, tokens: 1024 }, '2K': { width: 2048, height: 2048, tokens: 1536 }, '4K': { width: 4096, height: 4096, tokens: 2304 } },
  '3:4': { '1K': { width: 960, height: 1280, tokens: 1280 }, '2K': { width: 1920, height: 2560, tokens: 1920 }, '4K': { width: 3840, height: 5120, tokens: 2880 } },
  '4:3': { '1K': { width: 1152, height: 864, tokens: 1152 }, '2K': { width: 2304, height: 1728, tokens: 1728 }, '4K': { width: 4608, height: 3456, tokens: 2592 } },
  '2:3': { '1K': { width: 864, height: 1296, tokens: 1152 }, '2K': { width: 1728, height: 2592, tokens: 1728 }, '4K': { width: 3456, height: 5184, tokens: 2592 } },
  '3:2': { '1K': { width: 1296, height: 864, tokens: 1152 }, '2K': { width: 2592, height: 1728, tokens: 1728 }, '4K': { width: 5184, height: 3456, tokens: 2592 } },
  '4:5': { '1K': { width: 1024, height: 1280, tokens: 1280 }, '2K': { width: 2048, height: 2560, tokens: 1920 }, '4K': { width: 4096, height: 5120, tokens: 2880 } },
  '5:4': { '1K': { width: 1280, height: 1024, tokens: 1024 }, '2K': { width: 2560, height: 2048, tokens: 1536 }, '4K': { width: 5120, height: 4096, tokens: 2304 } },
  '16:9': { '1K': { width: 1376, height: 768, tokens: 1120 }, '2K': { width: 2752, height: 1536, tokens: 1680 }, '4K': { width: 5504, height: 3072, tokens: 2520 } },
  '21:9': { '1K': { width: 1584, height: 672, tokens: 1120 }, '2K': { width: 3168, height: 1344, tokens: 1680 }, '4K': { width: 6336, height: 2688, tokens: 2520 } },
  '9:16': { '1K': { width: 768, height: 1376, tokens: 1120 }, '2K': { width: 1536, height: 2752, tokens: 1680 }, '4K': { width: 3072, height: 5504, tokens: 2520 } },
};

// 算力消耗常量
export const COMPUTE_POINTS = {
  PRO_4K: 36,
  PRO_2K: 30,
  STD_4K: 25,
  STD_2K: 15,
} as const;

// API 超时时间 (ms)
export const API_TIMEOUT_MS = 800000;

// 最大文件大小 (bytes)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 画廊最大条目数
export const MAX_GALLERY_ITEMS = 10;

// Toast 自动消失时间 (ms)
export const TOAST_AUTO_DISMISS_MS = 3000;

// IndexedDB 配置
export const DB_NAME = 'atelier_db';
export const DB_VERSION = 1;
export const STORE_NAME = 'generation_history';
