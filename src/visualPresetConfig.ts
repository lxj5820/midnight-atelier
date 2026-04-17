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
  // ═══════════════ 彩平图/3D轴测图 风格预设 (6种) ═══════════════
  cp_realistic: '写实风格',
  cp_watercolor: '水彩手绘',
  cp_flat: '扁平插画',
  cp_lightcolor: '淡彩风格',
  cp_dark: '暗黑模式',
  cp_vintage: '复古风格',

  // ═══════════════ 效果图/风格替换 预设 (19种) ═══════════════
  // 现代类
  xg_modern_luxury: '现代轻奢',
  xg_modern_simple: '现代简约',
  xg_modern_italian: '现代意式',
  xg_modern_nordic: '现代北欧',
  xg_modern_wood: '现代原木',
  // 复古类
  xg_midcentury: '中古风',
  xg_oldmoney: '复古老钱',
  // 奶油/法式类
  xg_french_cream: '法式奶油',
  xg_modern_cream: '现代奶油风',
  xg_french: '法式风格',
  // 东方类
  xg_newchinese: '新中式风格',
  xg_japanese: '日式风格',
  xg_song: '宋氏风格',
  // 侘寂类
  xg_wabi: '侘寂风格',
  // 其他
  xg_morandi: '莫兰迪风格',
  xg_industrial: '工业风格',
  xg_mediterranean: '地中海风格',
  xg_bohemian: '波西米亚风格',
  xg_tropical: '热带度假风',

  // ═══════════════ 光影替换 预设 (7种) ═══════════════
  gy_direct: '自然光直射',
  gy_diffuse: '漫射天光',
  gy_sidelight: '侧光掠射',
  gy_backlight: '逆光剪影',
  gy_wallwash: '洗墙照明',
  gy_warm: '暖色调氛围光',
  gy_rembrandt: '伦勃朗光',

  // ═══════════════ 分镜生成 预设 ═══════════════
  fj_storyboard: '九宫格分镜',

  // ═══════════════ 汇报图 预设 ═══════════════
  hb_analysis: '材料分析',
  hb_board: '设计展板',
  hb_mood: '情绪材料板',
  hb_explode: '空间爆炸图',

  // ═══════════════ 360全景 预设 ═══════════════
  qj_panorama: '360全景',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第二部分：预设图片定义
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESETS_IMAGES: Record<string, string> = {
  // 彩平图/3D轴测图
  cp_realistic: '/presets/写实风格.jpeg',
  cp_watercolor: '/presets/水彩手绘风格.jpeg',
  cp_flat: '/presets/扁平插画风格.jpeg',
  cp_lightcolor: '/presets/淡彩风格.jpeg',
  cp_dark: '/presets/暗黑模式.jpeg',
  cp_vintage: '/presets/复古风格.jpeg',

  // 效果图/风格替换
  xg_modern_luxury: '/presets/现代轻奢.jpeg',
  xg_modern_simple: '/presets/现代北欧.jpeg',
  xg_modern_italian: '/presets/现代意式.jpeg',
  xg_modern_nordic: '/presets/现代北欧.jpeg',
  xg_modern_wood: '/presets/现代原木.jpeg',
  xg_midcentury: '/presets/中古风.jpeg',
  xg_oldmoney: '/presets/复古老钱.png',
  xg_french_cream: '/presets/法式奶油.jpeg',
  xg_modern_cream: '/presets/现代奶油风.jpeg',
  xg_french: '/presets/法式风格.jpeg',
  xg_newchinese: '/presets/新中式风格.jpeg',
  xg_japanese: '/presets/日式风格.jpeg',
  xg_song: '/presets/宋氏风格.jpeg',
  xg_wabi: '/presets/侘寂风格.jpeg',
  xg_morandi: '/presets/莫兰迪风格.jpeg',
  xg_industrial: '/presets/工业风格.jpeg',
  xg_mediterranean: '/presets/波西米亚风格.jpeg',
  xg_bohemian: '/presets/波西米亚风格.jpeg',
  xg_tropical: '/presets/热带度假风.jpeg',

  // 光影替换
  gy_direct: '/presets/自然光直射.jpeg',
  gy_diffuse: '/presets/漫射天光.jpeg',
  gy_sidelight: '/presets/侧光掠射.jpeg',
  gy_backlight: '/presets/逆光剪影.jpeg',
  gy_wallwash: '/presets/洗墙照明.jpeg',
  gy_warm: '/presets/暖色调氛围光.jpeg',
  gy_rembrandt: '/presets/伦勃朗光.png',

  // 分镜生成
  fj_storyboard: '/presets/写实风格.jpeg',

  // 汇报图
  hb_analysis: '/presets/写实风格.jpeg',
  hb_board: '/presets/写实风格.jpeg',
  hb_mood: '/presets/水彩手绘风格.jpeg',
  hb_explode: '/presets/扁平插画风格.jpeg',

  // 360全景
  qj_panorama: '/presets/写实风格.jpeg',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第三部分：生成提示词定义【修改这里】
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESETS_PROMPTS: Record<string, string> = {
  // ═══════════════ 彩平图/3D轴测图 风格预设 ═══════════════
  cp_realistic: '图片采用写实风格表现，真实地板纹理、家具材质、光影投射，像照片一样逼真',

  cp_watercolor: '图片采用水彩手绘风格，柔和晕染的色块、笔触可见、艺术感强、温暖亲切',

  cp_flat: '图片采用扁平插画风格，纯色块填充、无渐变、无阴影、简洁现代、图标化家具',

  cp_lightcolor: '图片采用淡彩风格，清晰黑色线稿轮廓 + 低饱和度淡色填充，专业严谨',

  cp_dark: '图片采用暗黑模式，深色背景（深灰/藏蓝）+ 亮色家具，科技感强、视觉冲击力大',

  cp_vintage: '图片采用复古风格，泛黄做旧纸张底纹，手绘钢笔线条，水彩晕染效果，橄榄绿赭石砖红深蓝复古配色，温暖怀旧氛围，岁月沉淀感',

  // ═══════════════ 效果图/风格替换 预设 ═══════════════
  xg_modern_luxury: '现代轻奢，金属光泽点缀，天然大理石纹理，丝绒柔软质感，精致细节处理，低调奢华感，高级优雅氛围',

  xg_modern_simple: '现代简约，简洁几何线条，大面积纯色块面，大量留白呼吸感，功能性布局，通透无杂物，冷静理性氛围',

  xg_modern_italian: '意式极简与轻奢的融合，强调几何线条的精准、材质的顶级质感、设计的克制与优雅。参考Minotti、Poliform、B&B Italia的品牌美学，建筑摄影视角，对称或黄金分割构图，35mm镜头，f/4-5.6小光圈保证全景清晰，类似Casa Vogue杂志内页',

  xg_modern_nordic: '现代北欧，浅木温暖色调，纯净白色基底，充沛自然光线，绿植生机点缀，棉麻柔软质感，温馨舒适氛围',

  xg_modern_wood: '现代原木，大量原木材质，温暖自然色调，保留木材纹理，藤编元素融入，柔和漫射光，治愈放松氛围',

  xg_midcentury: '中古风，中性大地色调，舒适柔软质感，复古元素点缀，休闲大气布局，宽敞明亮感，温馨家庭氛围',

  xg_oldmoney: '传承世家老钱风，低调，克制，百年家族沉淀感，有轻微的使用痕迹，少量的现代元素。参考《The World of Interiors》杂志风格。35mm或50mm镜头，f/2.0-f/2.8大光圈，浅景深虚化，生活方式摄影风格，8K超高清，RAW质感，DSLR画质，添加自然瑕疵：光线中的微尘、织物自然褶皱、收藏级的饰品，地毯轻微的使用痕迹、皮革毛孔可见、黄铜氧化痕迹、轻微胶片颗粒感',

  xg_french_cream: '法式奶油，奶油白色基调，柔和弧形线条，精致雕花细节，柔纱过滤光线，浪漫甜美感，优雅轻盈氛围',

  xg_modern_cream: '现代奶油风，奶白奶咖渐变，圆润柔软形态，亲肤柔软材质，无主灯柔和光，软糯治愈感，极简温馨氛围',

  xg_french: '法式风格，水晶璀璨光泽，复杂石膏线条，复古镜面元素，蓝白经典配色，华丽装饰感，宫廷浪漫氛围',

  xg_newchinese: '新中式风格，中式格栅元素，水墨意境留白，实木温润质感，瓷器雅致点缀，米色亚麻调，东方雅致氛围',

  xg_japanese: '日式风格，原木自然色调，极简收纳哲学，障子柔和光线，枯山水禅意，天然材质感，宁静质朴氛围',

  xg_song: '宋氏风格，淡雅低饱和色，简洁直线条，瓷器书画意境，天然竹木藤编，留白含蓄美，清雅文人氛围',

  xg_wabi: '日本美学的不完美之美，强调自然材料的原始质感、时间的痕迹、留白与禅意。参考Axel Vervoordt、比利时侘寂大师的设计哲学，侘寂美学摄影，大量留白，不对称构图，强调空与寂，35mm或50mm镜头，自然光优先，类似Kinfolk或Cereal杂志风格',

  xg_morandi: '莫兰迪风格，莫兰迪灰调色，柔和渐变过渡，丝绒棉麻混搭，低饱和宁静感，温润优雅调，高级舒适氛围',

  xg_industrial: '工业风格，裸露红砖墙面，金属管道结构，复古做旧质感，深色调空间感，粗犷个性美，loft艺术氛围',

  xg_mediterranean: '地中海风格，蓝白经典配色，拱门曲线造型，马赛克拼花砖，海洋元素装饰，明亮充足光，清新度假氛围',

  xg_bohemian: '波西米亚风格，多彩民族织物，丰富图案混搭，藤编自然元素，艺术收藏感，自由随性调，游牧浪漫氛围',

  xg_tropical: '热带度假风，藤编竹制材质，棕榈绿植环绕，明亮热带色彩，百叶光影效果，休闲放松感，海岛度假氛围',

  // ═══════════════ 光影替换 预设 ═══════════════
  gy_direct: '自然光直射、强烈阳光穿透大窗，清晰锐利光影边界，明亮高光与深阴影对比，可见光柱与尘埃粒子，通透空间感，冷静理性氛围',

  gy_diffuse: '漫射天光，均匀柔和散射光，无明显阴影，明亮通透，纯净白色基调，宁静平和，极简舒适感，空气感强',

  gy_sidelight: '侧光掠射，注意光源方向，光线与墙面呈极小夹角平行掠过，强烈强调表面凹凸纹理，粗糙材质肌理清晰可见，长条形阴影横向延伸，明暗交替，雕塑般立体质感，沉静而有力',

  gy_backlight: '逆光剪影，主体沉入深色轮廓，神秘剪影形态，光源明亮过曝，戏剧化留白，诗意神秘感',

  gy_wallwash: '洗墙照明，光线由下而上均匀洗亮墙面，柔和渐变过渡，材质纹理被强调，层次感丰富，现代专业感，优雅洗练',

  gy_warm: '暖色调氛围光，金黄暖光笼罩，2700K色温柔和，光晕边缘羽化，温馨包裹感，放松惬意，家的温度，亲密舒适氛围',

  gy_rembrandt: '伦勃朗光，注意光源方向，单侧强光创造深阴影，明暗对比极端，阴影侧出现倒三角亮区，明暗交界线清晰锐利，深黑阴影占画面大半，古典油画质感，神秘戏剧氛围',

  // ═══════════════ 分镜生成 预设 ═══════════════
  fj_storyboard: '保持方案主体布局一致性不变，生成9个不同环绕角度的效果图，集合成一张9宫格图片',

  // ═══════════════ 汇报图 预设 ═══════════════
  hb_analysis: '分析生成一份室内家具材质分析图，室内设计排版样式，分为2部分，包括:1.原图上将家具材质指引出来，再按分模块，每个模块搭配"材质纹理图标+特性说明"；2.材质性能分析，对比表格(列:材质类型;行:耐用性、维护难度、质感表现、环保等级)。专业住宅室内分析示意图风格，线条利落精准，信息层级清晰，中英文标注',

  hb_board: '将图做成竖向室内设计展板，包含这张图，简约风格，左文右图，统一色调，含项目名称+设计主题，涵盖当前空间的功能/爆炸/材质/手绘/家具分析图，节点剖面图，全景+节点放大效果图，设计说明，3个核心亮点，图文简洁呼应，文学全部用中文',

  hb_mood: '根据底图，生成一张室内设计情绪版，图片中心为底图照片，在其周边采用网格拼贴形式展示材质与色彩搭配，每个样本附有手绘标注（中文）的简洁的标签文字顶部中央标注房间名称。素材相互堆叠以松散但有序的方式拼贴，部分用胶带固定在浅粉蓝色混合的毛毡板上，模拟真实线索版的手工质感。保证底图占画面中心主要位置。整体画面具有高级艺术感与真实感',

  hb_explode: '根据这张室内效果图，保留画面真实感，以3D立体轴测角度的爆炸图展示，提取其中装饰和家具的材质，以高度还原的方式精细呈现其材质纹理。每个材质的纹理缩略图在右侧，各部分均配有清晰中文标注，注明结构名称与功能说明，整体布局兼具专业性与视觉逻辑性，呈现出清晰、整洁且极具科技感的解析示意图。白色背景',

  // ═══════════════ 360全景 预设 ═══════════════
  qj_panorama: '生成360度全景图视角，沉浸式空间体验，室内全景效果图',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 第四部分：菜单-预设映射【修改这里】
// ═══════════════════════════════════════════════════════════════════════════════

export const MENU_PRESET_MAP: Record<MenuItemId, string[]> = {
  // 生成布置图 - 无预设
  workspace: [],

  // 生成彩平图 - 6种风格
  colors: ['cp_realistic', 'cp_watercolor', 'cp_flat', 'cp_lightcolor', 'cp_dark', 'cp_vintage'],

  // 生成3D轴测图 - 6种风格（同彩平图）
  '3d': ['cp_realistic', 'cp_watercolor', 'cp_flat', 'cp_lightcolor', 'cp_dark', 'cp_vintage'],

  // 模型生成效果图 - 19种风格（同风格替换）
  effects: [
    'xg_modern_luxury', 'xg_modern_simple', 'xg_modern_italian',
    'xg_modern_nordic', 'xg_modern_wood', 'xg_midcentury', 'xg_oldmoney',
    'xg_french_cream', 'xg_modern_cream', 'xg_french', 'xg_newchinese', 'xg_japanese',
    'xg_song', 'xg_wabi', 'xg_morandi', 'xg_industrial', 'xg_mediterranean',
    'xg_bohemian', 'xg_tropical'
  ],

  // 风格替换 - 19种风格
  style: [
    'xg_modern_luxury', 'xg_modern_simple', 'xg_modern_italian',
    'xg_modern_nordic', 'xg_modern_wood', 'xg_midcentury', 'xg_oldmoney',
    'xg_french_cream', 'xg_modern_cream', 'xg_french', 'xg_newchinese', 'xg_japanese',
    'xg_song', 'xg_wabi', 'xg_morandi', 'xg_industrial', 'xg_mediterranean',
    'xg_bohemian', 'xg_tropical'
  ],

  // 光影替换 - 7种光影
  lighting: ['gy_direct', 'gy_diffuse', 'gy_sidelight', 'gy_backlight', 'gy_wallwash', 'gy_warm', 'gy_rembrandt'],

  // 分镜生成 - 无预设（直接生成）
  storyboard: [],

  // 360全景 - 无预设
  panorama: [],

  // 材料分析图 - 无预设
  analysis: [],

  // 设计展板 - 无预设
  board: [],

  // 情绪材料版 - 无预设
  mood: [],

  // 空间爆炸图 - 无预设
  explode: [],

  // 全能修改 - 无预设
  edit: [],
};

// 自定义风格预设（无提示词，无背景图）
export const CUSTOM_PRESET: VisualPreset = {
  id: 'custom',
  label: '自定义',
  bgImage: '',
  prompt: ''
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
  const presets = presetIds.map(id => getPresetById(id)).filter((p): p is VisualPreset => p !== undefined);

  // 为风格替换和模型生成效果图菜单添加自定义选项
  if (menuId === 'style' || menuId === 'effects') {
    presets.push(CUSTOM_PRESET);
  }

  return presets;
}

// 导出类型
export type { MenuItemId };
