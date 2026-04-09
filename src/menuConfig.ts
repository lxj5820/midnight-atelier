// 菜单配置 - 包含内置提示词
import React from 'react';
import { LayoutGrid, Palette, Box, ImageIcon, RefreshCw, Sun, Film, Globe, BarChart3, Layers, Heart, Maximize2 } from 'lucide-react';

export type MenuItemId = 'workspace' | 'colors' | '3d' | 'effects' | 'style' | 'lighting' | 'storyboard' | 'panorama' | 'analysis' | 'board' | 'mood' | 'explode';

export interface MenuItemConfig {
  id: MenuItemId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group: string;
  prompt: string;
  model: string;
}

export const menuItemsConfig: MenuItemConfig[] = [
  { id: 'workspace', icon: LayoutGrid, label: '生成布置图', group: '平面操作', prompt: '生成立面布置图，包含家具摆放、隔断布局、地面铺装标注，室内设计平面图，高清详细', model: '🍌全能图片V2' },
  { id: 'colors', icon: Palette, label: '生成色彩平图', group: '平面操作', prompt: '生成色彩分析图，展示空间配色方案，包含色块标注和材质说明，室内设计色彩平图', model: '🍌全能图片V2' },
  { id: '3d', icon: Box, label: '生成3D轴测图', group: '平面操作', prompt: '生成3D轴测爆炸图，分解展示空间各层结构和材质，建筑室内设计轴测分析图', model: '🍌全能图片PRO' },
  { id: 'effects', icon: ImageIcon, label: '生成效果图', group: '效果图操作', prompt: '生成室内效果图，展示最终装修效果，逼真渲染，室内设计可视化', model: '🍌全能图片PRO' },
  { id: 'style', icon: RefreshCw, label: '风格替换', group: '效果图操作', prompt: '将现有效果图转换为指定风格，如现代简约、北欧、日式、美式等，风格迁移渲染', model: '🍌全能图片V2' },
  { id: 'lighting', icon: Sun, label: '光阴替换', group: '效果图操作', prompt: '调整效果图的光照效果，日光夜景切换，室内光影渲染调整', model: '🍌全能图片V2' },
  { id: 'storyboard', icon: Film, label: '分镜生成', group: '效果图操作', prompt: '生成设计分镜图，展示空间流线和动线分析，室内设计叙事分镜', model: '🍌全能图片V2' },
  { id: 'panorama', icon: Globe, label: '360全景', group: '效果图操作', prompt: '生成360度全景图视角，沉浸式空间体验，室内全景效果图', model: '🍌全能图片PRO' },
  { id: 'analysis', icon: BarChart3, label: '材料分析图', group: '汇报图操作', prompt: '生成材料分析图，标注材质、面料、色彩比例，材料清单可视化', model: '🍌全能图片V2' },
  { id: 'board', icon: Layers, label: '设计展板', group: '汇报图操作', prompt: '生成设计展板，整合平面图、效果图、材料板、项目说明，室内设计作品集展板', model: '🍌全能图片PRO' },
  { id: 'mood', icon: Heart, label: '情绪材料版', group: '汇报图操作', prompt: '生成情绪板，展示设计灵感和材质面料，室内设计灵感Moodboard', model: '🍌全能图片V2' },
  { id: 'explode', icon: Maximize2, label: '空间爆炸图', group: '汇报图操作', prompt: '生成空间爆炸分析图，分解展示空间层次和构造，室内设计爆炸分析图', model: '🍌全能图片PRO' },
];

// 根据ID获取菜单项
export function getMenuItemById(id: MenuItemId): MenuItemConfig | undefined {
  return menuItemsConfig.find(item => item.id === id);
}
