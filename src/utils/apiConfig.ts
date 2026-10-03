/**
 * 模型接口统一配置
 *
 * 全站调用模型的地址只在这里定义一次，换中转站只需改一个地方：
 *   1. 推荐：在 `.env` / `.env.local` 中设置 `VITE_MODEL_API_BASE=https://新的域名`
 *   2. 或直接改下面的默认值 `DEFAULT_MODEL_API_BASE`
 *
 * 路径（/v1/images/generations、/v1beta/models/... 等）保持不变，
 * 只需提供基础地址，例如 `https://api.example.com`。
 */

/** 未配置 VITE_MODEL_API_BASE 时的兜底基础地址 */
const DEFAULT_MODEL_API_BASE = 'https://lixuejianapi.xyz';

/** 去掉结尾多余的斜杠，避免拼出 `https://x.com//v1/...` */
function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * 模型接口基础地址。
 * 注意：这里读的是构建期注入的 Vite 环境变量，改完 `.env` 需要重启 dev server。
 */
export const MODEL_API_BASE: string = normalizeBase(
  (import.meta.env.VITE_MODEL_API_BASE as string | undefined)?.trim() || DEFAULT_MODEL_API_BASE
);

/**
 * 视频生成接口基础地址（豆包 Seedance / 火山方舟协议）。
 * 默认走模型中转站的 /api/v3，可单独覆盖。
 */
export const VIDEO_API_BASE: string = normalizeBase(
  (import.meta.env.VITE_VIDEO_API_BASE as string | undefined)?.trim() ||
    `${MODEL_API_BASE}/api/v3`
);

/** 视频生成模型（豆包 Seedance），可单独覆盖。 */
export const VIDEO_MODEL: string =
  (import.meta.env.VITE_VIDEO_MODEL as string | undefined)?.trim() ||
  'doubao-seedance-2-5-260628';

/** 按路径拼接出完整的模型接口 URL，例如 modelApiUrl('/v1/images/generations') */
export function modelApiUrl(apiPath: string): string {
  return `${MODEL_API_BASE}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
}