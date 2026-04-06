/**
 * 视觉预设配置文件
 *
 * 【快速修改指南】
 * 1. 修改预设标签 → 搜索 PRESETS_LABELS
 * 2. 修改预设图片 → 搜索 PRESETS_IMAGES
 * 3. 修改生成提示词 → 搜索 PRESETS_PROMPTS
 * 4. 修改菜单对应预设 → 搜索 MENU_PRESET_MAP
 */

import type { MenuItemId } from './menuConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// 第一部分：预设标签定义
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESETS_LABELS: Record<string, string> = {
  // 通用预设
  realistic: '写实摄影',
  minimalist: '极简风格',
  cinematic: '电影光效',
  cyberpunk: '赛博朋克',

  // 平面操作预设
  floorplan: '平面图纸',
  sketch: '建筑草图',
  blueprint: '色彩标注',
  material: '材料示意',
  section: '轴测剖面',
  wireframe: '线框图纸',

  // 效果图预设
  concept: '概念草图',
  daylight: '日光效果',
  night: '夜景效果',
  storyboard: '分镜草图',
  panorama: '全景视角',

  // 汇报图预设
  presentation: '展示展板',
  boardrender: '效果图展板',
  watercolor: '水彩情绪板',
  collage: '灵感拼贴',
  explode: '爆炸分析',
  explodeplan: '爆炸图纸',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第二部分：预设图片定义
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESETS_IMAGES: Record<string, string> = {
  realistic: 'https://picsum.photos/seed/realistic/300/200',
  minimalist: 'https://picsum.photos/seed/minimalist/300/200',
  cinematic: 'https://picsum.photos/seed/cinematic/300/200',
  cyberpunk: 'https://picsum.photos/seed/cyberpunk/300/200',

  floorplan: 'https://picsum.photos/seed/floorplan/300/200',
  sketch: 'https://picsum.photos/seed/sketch/300/200',
  blueprint: 'https://picsum.photos/seed/colors/300/200',
  material: 'https://picsum.photos/seed/material/300/200',
  section: 'https://picsum.photos/seed/section/300/200',
  wireframe: 'https://picsum.photos/seed/wireframe/300/200',

  concept: 'https://picsum.photos/seed/concept/300/200',
  daylight: 'https://picsum.photos/seed/daylight/300/200',
  night: 'https://picsum.photos/seed/night/300/200',
  storyboard: 'https://picsum.photos/seed/storyboard/300/200',
  panorama: 'https://picsum.photos/seed/panorama/300/200',

  presentation: 'https://picsum.photos/seed/presentation/300/200',
  boardrender: 'https://picsum.photos/seed/boardrender/300/200',
  watercolor: 'https://picsum.photos/seed/watercolor/300/200',
  collage: 'https://picsum.photos/seed/collage/300/200',
  explode: 'https://picsum.photos/seed/explode/300/200',
  explodeplan: 'https://picsum.photos/seed/explodeplan/300/200',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第三部分：生成提示词定义【修改这里】
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESETS_PROMPTS: Record<string, string> = {
  // ═══════════════ 通用预设 ═══════════════
  realistic: 'photorealistic, ultra detailed, 8k, architectural photography, natural lighting, professional photography',

  minimalist: 'minimalist design, clean lines, simple color palette, Scandinavian style, sparse decoration, functional spaces',

  cinematic: 'cinematic lighting, movie still, dramatic shadows, film grain, anamorphic lens, emotional atmosphere, cinematic composition',

  cyberpunk: 'cyberpunk aesthetic, neon lights, futuristic, dystopian, holographic displays, rain-soaked streets, vibrant colors',

  // ═══════════════ 平面操作预设 ═══════════════
  floorplan: 'architectural floor plan, precise linework, CAD drawing, top view, furniture layout, dimension标注, clean professional style',

  sketch: 'architectural sketch, hand drawn, pencil rendering, artistic impression, quick design sketch, visible strokes',

  blueprint: 'color plan, color blocking diagram, material palette, interior design color scheme, annotated color blocks',

  material: 'material board, fabric swatches, material samples arrangement, texture close-up, interior design material palette',

  section: 'isometric architectural drawing, axonometric section, exploded view diagram, technical illustration, clean linework',

  wireframe: '3D wireframe, architectural wireframe model, technical 3D view, structural diagram, clean geometric forms',

  // ═══════════════ 效果图预设 ═══════════════
  concept: 'concept art style, artistic rendering, loose brushstrokes, design concept sketch, creative exploration',

  daylight: 'natural daylight, sunlit interior, bright airy atmosphere, soft shadows, warm sunlight streaming in',

  night: 'night scene, dramatic lighting, warm interior glow, city lights, evening atmosphere, moody illumination',

  storyboard: 'storyboard layout, film still composition, cinematic sequence, narrative scene breakdown, movie frame',

  panorama: '360 panorama view, immersive interior, wide angle architectural photography, spatial experience',

  // ═══════════════ 汇报图预设 ═══════════════
  presentation: 'design presentation board, professional portfolio layout, project showcase, multi-panel composition, architectural presentation',

  boardrender: 'rendering board, visual presentation, image composition, professional design layout, clean portfolio style',

  watercolor: 'watercolor mood board, soft colors, artistic rendering, hand-painted feel, inspiration collage, delicate brushwork',

  collage: 'mood collage, inspiration montage, texture samples, color inspiration, design灵感收集, artistic mood board',

  explode: 'exploded axonometric, spatial breakdown diagram, layer separation, structural explosion, technical analysis view',

  explodeplan: 'exploded technical drawing, component breakdown, assembly diagram, architectural explosion analysis',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第四部分：菜单-预设映射【修改这里】
// ═══════════════════════════════════════════════════════════════════════════════

export const MENU_PRESET_MAP: Record<MenuItemId, string[]> = {
  workspace: ['floorplan', 'sketch', 'realistic'],
  colors: ['blueprint', 'material', 'realistic'],
  '3d': ['section', 'wireframe', 'realistic'],
  effects: ['realistic', 'cinematic', 'cyberpunk'],
  style: ['minimalist', 'concept', 'realistic'],
  lighting: ['daylight', 'night'],
  storyboard: ['storyboard', 'minimalist'],
  panorama: ['panorama', 'cinematic'],
  analysis: ['material', 'blueprint'],
  board: ['presentation', 'boardrender', 'minimalist'],
  mood: ['watercolor', 'collage'],
  explode: ['explode', 'explodeplan'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第五部分：类型定义和工具函数
// ═══════════════════════════════════════════════════════════════════════════════

export interface VisualPreset {
  id: string;
  label: string;
  bgImage: string;
  prompt: string;
}

// 根据ID获取预设
export function getPresetById(id: string): VisualPreset | undefined {
  const label = PRESETS_LABELS[id];
  const bgImage = PRESETS_IMAGES[id];
  const prompt = PRESETS_PROMPTS[id];

  if (!label || !bgImage || !prompt) return undefined;

  return { id, label, bgImage, prompt };
}

// 根据标签获取预设
export function getPresetByLabel(label: string): VisualPreset | undefined {
  const id = Object.entries(PRESETS_LABELS).find(([, l]) => l === label)?.[0];
  if (!id) return undefined;
  return getPresetById(id);
}

// 获取指定菜单对应的预设列表
export function getPresetsForMenu(menuId: MenuItemId): VisualPreset[] {
  const presetIds = MENU_PRESET_MAP[menuId] || [];
  return presetIds.map(id => getPresetById(id)).filter((p): p is VisualPreset => p !== undefined);
}

// 导出类型
export type { MenuItemId };
