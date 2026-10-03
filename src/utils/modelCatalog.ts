/**
 * 模型目录 —— 全站模型清单的唯一来源
 *
 * 新增模型只需在这里登记，下拉选项、接口路由、比例白名单会自动跟上。
 * 键 = 界面显示名，值 = 接口 model 参数。
 */

/** Gemini 系列（走 /v1beta/models/{model}:generateContent） */
export const GEMINI_MODELS: Record<string, string> = {
  '🍌全能图片V2': 'gemini-3.1-flash-image-preview',
  '🍌全能图片PRO': 'gemini-3-pro-image-preview',
};

/**
 * GPT Image 系列（走 OpenAI 兼容的 /v1/images/generations 与 /v1/images/edits）
 * 带「按次」后缀的是按次计费版本，出图能力与同名按量版一致。
 */
export const GPT_IMAGE_MODELS: Record<string, string> = {
  'GPT Image 2': 'gpt-image-2',
  'GPT Image 2.5 Flare': 'gpt-image-2.5-flare',
  'GPT Image 2.5 Flare（按次）': 'gpt-image-2.5-flare-c',
  'GPT Image 2.5 Sunburst': 'gpt-image-2.5-sunburst',
  'GPT Image 2.5 Sunburst（按次）': 'gpt-image-2.5-sunburst-c',
};

/** 下拉框使用的模型清单（顺序即展示顺序） */
export const MODEL_OPTIONS: string[] = [
  ...Object.keys(GEMINI_MODELS),
  ...Object.keys(GPT_IMAGE_MODELS),
];

/** GPT Image 系列支持的宽高比（对应接口尺寸表覆盖的比例） */
export const GPT_IMAGE_RATIOS = ['1:1', '2:3', '3:2', '9:16', '16:9'];

/** 是否为 GPT Image 系列（决定走哪套接口与哪些宽高比） */
export function isGptImageModel(model: string): boolean {
  return model in GPT_IMAGE_MODELS;
}
