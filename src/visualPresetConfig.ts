// 视觉预设配置
export type PresetId = 'realistic' | 'cyberpunk' | 'minimalist' | 'cinematic';

export interface VisualPresetConfig {
  id: PresetId;
  label: string;
  bgImage: string;
  prompt: string;
}

export const visualPresetsConfig: VisualPresetConfig[] = [
  {
    id: 'realistic',
    label: '写实摄影',
    bgImage: 'https://picsum.photos/seed/realistic/300/200',
    prompt: 'photorealistic, ultra detailed, 8k, architectural photography, natural lighting, professional photography',
  },
  {
    id: 'cyberpunk',
    label: '赛博朋克',
    bgImage: 'https://picsum.photos/seed/cyberpunk/300/200',
    prompt: 'cyberpunk aesthetic, neon lights, futuristic, dystopian, holographic displays, rain-soaked streets, vibrant colors',
  },
  {
    id: 'minimalist',
    label: '极简风格',
    bgImage: 'https://picsum.photos/seed/minimalist/300/200',
    prompt: 'minimalist design, clean lines, simple color palette, Scandinavian style, sparse decoration, functional spaces',
  },
  {
    id: 'cinematic',
    label: '电影光效',
    bgImage: 'https://picsum.photos/seed/cinematic/300/200',
    prompt: 'cinematic lighting, movie still, dramatic shadows, film grain, anamorphic lens, emotional atmosphere, cinematic composition',
  },
];

// 根据ID获取预设
export function getPresetById(id: string): VisualPresetConfig | undefined {
  return visualPresetsConfig.find(preset => preset.id === id);
}

// 根据标签获取预设
export function getPresetByLabel(label: string): VisualPresetConfig | undefined {
  return visualPresetsConfig.find(preset => preset.label === label);
}
