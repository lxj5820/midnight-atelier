// 菜单配置 - 包含内置提示词
import React from 'react';
import { LayoutGrid, Palette, Box, ImageIcon, RefreshCw, Sun, Film, Globe, BarChart3, Layers, Heart, Maximize2, Wand2 } from 'lucide-react';

export type MenuItemId = 'workspace' | 'colors' | '3d' | 'effects' | 'style' | 'lighting' | 'storyboard' | 'panorama' | 'analysis' | 'board' | 'mood' | 'explode' | 'edit';

export interface MenuItemConfig {
  id: MenuItemId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group: string;
  prompt: string;
  model: string;
}

export const menuItemsConfig: MenuItemConfig[] = [
  { id: 'workspace', icon: LayoutGrid, label: '生成布置图', group: '平面操作', prompt: '这是一个{{室内住宅空间，房间是四室两厅两卫}}，风格为线稿图，保持平面墙体，轮廓不变。根据图中的文字信息生成对应合理的平面布局图。禁止文字！', model: '🍌全能图片PRO' },
  { id: 'colors', icon: Palette, label: '生成色彩平图', group: '平面操作', prompt: '90度垂直正俯视，无任何透视畸变，3D写实住宅彩色平面图，[现代简约风格]，完整展示所有空间布局，深灰色细描边墙体，墙体厚度准确，带柔和自然的短投影，纯白色背景。简约低饱和配色，{{四室两厅两卫，公共区域通铺白色大花白大理石瓷砖，卧室地面浅原木色实木地板，厨卫地面深灰色哑光瓷砖}}，软装统一用米白、浅灰、浅木色、深木色，少量深灰点缀，色彩干净舒适家具陈设比例符合顶视图逻辑，无多余杂物。禁止文字', model: '🍌全能图片V2' },
  { id: '3d', icon: Box, label: '生成3D轴测图', group: '平面操作', prompt: '保持户型轮廓，Generate a 3D axonometric view tilted 30 degrees to the left with an oblique top-down perspective，{{现代简约风格}}，完全匹配原有的户型布局、材质配色、地面区域颜色，全屋无屋顶、顶部完全掏空，清晰展示所有室内空间，保留原图的户型布局、软装位置，匹配风格的实体墙体，带柔和自然投影，纯白色背景。超写实渲染，细节清晰，无多余杂物、无文字标注水印', model: '🍌全能图片V2' },
  { id: 'effects', icon: ImageIcon, label: '模型生成效果图', group: '效果图操作', prompt: '这是一个{{客厅空间}}，将这张3D线框图转化为照片级真实感的室内效果图，保持原有空间布局和家具摆放完全不变。{{摄影：35mm镜头，f/2.8，人眼平视高度，主体锐利清晰，Architectural Digest杂志摄影风格。}}8K超高清，细节丰富，真实物理材质，避免CG感。', model: '🍌全能图片V2' },
  { id: 'style', icon: RefreshCw, label: '风格替换', group: '效果图操作', prompt: '保持方案主体布局一致性不变，将风格改为{{简约风格}}，并修改对应风格的地面、家具、软装、装饰品，风格迁移渲染', model: '🍌全能图片V2' },
  { id: 'lighting', icon: Sun, label: '光影替换', group: '效果图操作', prompt: '保持场景中主体物品100%不变，请为上传的室内效果图添加生动、真实的光影效果，自然柔和。{{风格：}}', model: '🍌全能图片V2' },
  { id: 'storyboard', icon: Film, label: '分镜生成', group: '效果图操作', prompt: '保持方案主体布局一致性不变，生成9个不同环绕角度的效果图，集合成一张9宫格图片', model: '🍌全能图片V2' },
  { id: 'panorama', icon: Globe, label: '360全景', group: '效果图操作', prompt: '生成360度全景图视角，沉浸式空间体验，室内全景效果图', model: '🍌全能图片PRO' },
  { id: 'analysis', icon: BarChart3, label: '材料分析图', group: '汇报图操作', prompt: '分析生成一份室内家具材质分析图，室内设计排版样式，分为2部分，包括:1.原图上将家具材质指引出来，再按分模块，每个模块搭配“材质纹理图标+特性说明”；2.材质性能分析，对比表格(列:材质类型;行:耐用性、维护难度、质感表现、环保等级)。专业住宅室内分析示意图风格，线条利落精准，信息层级清晰，中英文标注', model: '🍌全能图片V2' },
  { id: 'board', icon: Layers, label: '设计展板', group: '汇报图操作', prompt: '将图做成竖向室内设计展板，包含这张图，简约风格，左文右图，统一色调，含{{项目名称}}+{{设计主题}}，涵盖当前空间的/功能/爆炸/材质/手绘/家具分析图，节点剖面图，全景+节点放大效果图，设计说明，3个核心亮点，图文简洁呼应，文学全部用中文', model: '🍌全能图片PRO' },
  { id: 'mood', icon: Heart, label: '情绪材料版', group: '汇报图操作', prompt: '根据底图，生成一张室内设计情绪版，图片中心为底图照片，在其周边采用网格拼贴形式展示材质与色彩搭配，每个样本附有手绘标注（中文）的简洁的标签文字顶部中央标注房间名称。素材相互堆叠以松散但有序的方式拼贴，部分用胶带固定在浅粉蓝色混合的毛毡板上，模拟真实线索版的手工质感。保证底图占画面中心主要位置。整体画面具有高级艺术感与真实感', model: '🍌全能图片V2' },
  { id: 'explode', icon: Maximize2, label: '空间爆炸图', group: '汇报图操作', prompt: '根据这张室内效果图，保留画面真实感，以3D立体轴测角度的爆炸图展示，提取其中装饰和家具的材质，以高度还原的方式精细呈现其材质纹理。每个材质的纹理缩略图在右侧，各部分均配有清晰中文标注，注明结构名称与功能说明，整体布局兼具专业性与视觉逻辑性，呈现出清晰、整洁且极具科技感的解析示意图。白色背景', model: '🍌全能图片PRO' },
  { id: 'edit', icon: Wand2, label: '全能修改', group: '图片编辑', prompt: '', model: '🍌全能图片V2' },
];

// 根据ID获取菜单项
export function getMenuItemById(id: MenuItemId): MenuItemConfig | undefined {
  return menuItemsConfig.find(item => item.id === id);
}

// 从prompt中提取{{}}中的变量
export function extractVariablesFromPrompt(prompt: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    const varName = match[1].trim();
    if (varName) {
      variables.push(varName);
    }
  }
  return variables;
}

// 获取菜单项的变量提示文本
export function getPromptPlaceholder(id: MenuItemId): string {
  const item = getMenuItemById(id);
  if (!item) return '输入您的建筑构想...';

  const variables = extractVariablesFromPrompt(item.prompt);
  if (variables.length === 0) return '输入您的建筑构想...';

  // 只返回第一个变量的内容（去掉{{}}）
  return variables[0];
}
