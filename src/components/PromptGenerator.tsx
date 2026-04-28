import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, RotateCcw, Check, Save, Trash2, BookmarkPlus, Bookmark, ChevronDown } from 'lucide-react';

interface PromptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (prompt: string) => void;
}

interface FieldConfig {
  key: string;
  type: 'select' | 'text';
  label: string;
  options?: string[];
  default?: number;
}

interface SectionConfig {
  title: string;
  desc: string;
  fields: FieldConfig[];
}

interface CustomButton {
  value: string;
  shortLabel: string;
  date: string;
}

interface CustomButtonsData {
  [fieldKey: string]: CustomButton[];
}

interface PresetData {
  id: string;
  name: string;
  selections: Record<string, number>;
  customInputs: Record<string, string>;
  enabledSections: string[];
  createdAt: string;
}

const CONFIG: Record<string, SectionConfig> = {
  task: {
    title: '图生图任务指令',
    desc: '定义图生图的核心任务与转换逻辑',
    fields: [
      { key: '图生图任务', type: 'select', label: '图生图任务', options: ['将sketchup软件模型截图转真实摄影照片', '将酷家乐软件的模型截图转真实摄影照片', '将3Dmax软件模型截图转真实摄影照片', '将sketchup软件模型截图转写实效果图', '将酷家乐软件的模型截图转写实效果图', '将3Dmax软件模型截图转写实效果图', '效果图转真实摄影照片', '效果图转写实效果图', '自定义'], default: 0 },
      { key: '图生图任务_自定义', type: 'text', label: '图生图任务_自定义' },
      { key: '转换逻辑', type: 'select', label: '转换逻辑', options: ['基于模型截图进行写实转换，将所有模型表面替换为高精度 PBR 物理写实材质，严格遵循物理渲染原理，光影、反射、折射完全物理正确，具备真实粗糙度、金属度与法线细节，材质表现完全符合现实世界物理规律。', '由模型截图渲染生成高清超写实照片级室内效果图，核心强化多层自然光影、明暗过渡层次与精细表面肌理，完全还原真实物理光照、光线追踪 Ray Tracing、全局光照 GI、柔和漫反射与真实阴影，高精度 PBR 物理材质，表面纹理细腻丰富，质感高度逼真，物理渲染完全正确。', '自定义'], default: 0 },
      { key: '转换逻辑_自定义', type: 'text', label: '转换逻辑_自定义' }
    ]
  },
  scene: {
    title: '场景类型',
    desc: '配置空间类型、设计风格与外景',
    fields: [
      { key: '空间类型', type: 'select', label: '空间类型', options: ['平层家装室内空间', 'LOFT家装室内空间', '别墅家装室内空间', '办公空间工装空间', '零售展示工装空间', '餐饮工装空间', '酒店住宿工装空间', '教育医疗工装空间', '文化艺术工装空间', '生产制造工装空间', '庭院空间', '室外门头', '别墅外立面', '通用室外', '工装封闭空间', '自定义'], default: 0 },
      { key: '空间类型_自定义', type: 'text', label: '空间类型_自定义' },
      { key: '设计风格', type: 'select', label: '设计风格', options: ['现代室内设计', '现代简约风', '现代极简主义风', '包豪斯风格', '意式极简风', '现代轻奢风', '现代原木风', '轻法式风', '古典法式风', '现代欧式风', '奶油法式风', '法式轻奢风', '美式风格', '地中海风格', '新古典风', '巴洛克风', '洛可可风', '新中式风格', '宋式新中式', '禅意新中式', '传统明清中式', '现代北欧风', '原木北欧风', '北欧轻奢风', '现代日式风', '原木日式风', '侘寂风', '日式禅意风', '奶油风', '现代室外设计（通用风格）', '自定义'], default: 0 },
      { key: '设计风格_自定义', type: 'text', label: '设计风格_自定义' },
      { key: '外景类型', type: 'select', label: '外景类型', options: ['一线江景、滨江风光、河流蜿蜒，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '静谧湖景、湖泊风光、镜面湖，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '无敌海景、蔚蓝大海、海岸线，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '青山连绵、远山如黛、雪山远景，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '城市中央公园、社区园林、森林氧吧，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '稻田风光、茶园梯田、乡村田野，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '广阔天空、蓝天白云、晴空万里，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', 'CBD天际线、摩天大楼群、城市全景，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '璀璨城市夜景、万家灯火、灯光秀，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '老洋房街区、胡同巷弄、骑楼老街，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '大学校园风光、操场、教学楼，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '日式枯山水、中式庭院、禅意园林，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '湿地公园、芦苇荡、候鸟栖息地，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '山谷秘境、云雾山谷、溪流潺潺，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '皑皑白雪、银装素裹、冬日雪景，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '窗外近景、楼下花园、单元门口、清晰可见的细节，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '中楼层视野、小区全景、中央花园、其他楼栋的外立面，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '高楼层视野、俯瞰整个小区、远处的城市建筑、开阔的天空，窗外景观仅为外景贴图，仅提供环境氛围，不改变室内主光源，需要高清4K，超精细完整细节', '独栋别墅自然景观环境，远景连绵起伏山脉，青灰色渐变远山，大气透视朦胧虚化，中景茂密原生树林，高大乔木、松柏、阔叶树混合，层次丰富绿植环绕建筑，近景开阔平整草坪，细腻柔软草皮，轻微自然缓坡，晴朗湛蓝天空，蓬松立体白云，空气通透清新，柔和均匀自然光，真实光影质感，无杂乱元素，低饱和度高级色调，建筑外立面专用背景', '无任何外景，无窗户，无天窗，完全封闭室内空间', '自定义'], default: 17 },
      { key: '外景类型_自定义', type: 'text', label: '外景类型_自定义' },
      { key: '地点', type: 'select', label: '地点', options: ['自动生成最通用的城市近郊环境，无任何特定地域特征，建筑与景观符合大众普遍审美', '哈尔滨', '乌鲁木齐', '北京', '上海', '杭州', '南京', '长沙', '成都', '重庆', '昆明', '广州', '海口', '台北', '纯地下封闭空间', '自定义'], default: 6 },
      { key: '地点_自定义', type: 'text', label: '地点_自定义' }
    ]
  },
  light: {
    title: '光影氛围类型',
    desc: '精细控制光照、色温与氛围',
    fields: [
      { key: '季节', type: 'select', label: '季节', options: ['自动选择最适宜的季节，气候舒适宜人，光线柔和自然', '春季', '夏季', '秋季', '冬季', '自定义'], default: 2 },
      { key: '季节_自定义', type: 'text', label: '季节_自定义' },
      { key: '天气', type: 'select', label: '天气', options: ['自动匹配最适合该室内空间的天气条件', '晴天', '阴天', '雾天', '雨天', '雪天', '风天', '自定义'], default: 1 },
      { key: '天气_自定义', type: 'text', label: '天气_自定义' },
      { key: '时间段', type: 'select', label: '时间段', options: ['凌晨2点', '黎明4点', '清晨6点', '上午9点', '中午12点', '下午16点', '夕阳17点', '傍晚18点', '夜晚20点', '深夜24点', '自定义'], default: 3 },
      { key: '时间段_自定义', type: 'text', label: '时间段_自定义' },
      { key: '窗帘类型', type: 'select', label: '窗帘类型', options: ['默认图中类型', '单层透光纱帘（关闭）', '单层纱帘（打开）', '双层窗帘（打开）', '香格里拉帘', '梦幻帘', '自定义'], default: 0 },
      { key: '窗帘类型_自定义', type: 'text', label: '窗帘类型_自定义' },
      { key: '进光口控制', type: 'select', label: '进光口控制', options: ['唯一主光源来自窗户，自然光从窗户单向稳定入射，严格遵循真实物理光照规律，禁止非窗户方向光源、禁止顶面打光、禁止侧面补光、禁止电视墙方向打光，禁止瞎打光、禁止乱补光，禁止AI乱加光源。', '纯人工照明，无任何自然光，无任何室外光线进入，唯一光源为室内嵌入式筒灯+暗藏灯带+局部重点灯，禁止任何额外光源。', '自定义'], default: 0 },
      { key: '进光口控制_自定义', type: 'text', label: '进光口控制_自定义' },
      { key: '太阳光光影', type: 'select', label: '太阳光光影', options: ['完全无直射阳光进入室内，所有室外光线均为均匀漫射天光，无任何光斑，玻璃仅透过柔和的环境光，无直射光线穿透', '柔和的太阳光透过半透明香格里拉帘，在地面、墙面和家具表面形成清晰的横向平行条纹光影，光影边缘柔和渐变，明暗过渡自然，帘片透光均匀，整体光线温暖柔和，无刺眼强光', '柔和的太阳光透过半透明白纱梦幻帘，在地面、墙面形成朦胧的竖向柔焦条纹光影，光影边缘高度模糊，呈现柔焦雾化效果，明暗过渡极其自然，整体光线温柔治愈，有朦胧的氛围感', '柔和的太阳光透过半透明白纱纱帘，在地面、墙面形成朦胧的竖向柔焦条纹光影，光影边缘高度模糊，呈现柔焦雾化效果，明暗过渡极其自然，整体光线温柔治愈，有朦胧的氛围感', '温暖的太阳光透过窗外的香樟树叶缝隙，在室内地面、墙面和家具表面形成不规则的斑驳树影，光影大小不一，有自然的疏密变化，边缘柔和，呈现出动态的自然质感，整体光线明亮而不刺眼', '强烈的太阳光斜射进入室内，空气中有细微的尘埃颗粒，形成清晰可见的光束状丁达尔效应，光束中可见漂浮的尘埃，光线有明显的体积感和层次感，整体氛围神圣而治愈，室内其他区域保持正常亮度', '太阳光打亮地面与墙面，再自然反弹到顶面，顶面出现柔和真实的反射亮带', '晴天上午柔和侧光，阳光透过高大阔叶树，在墙面上投射大面积、轮廓柔和的斑驳树叶光影，半透明光影层次丰富，边缘自然虚化，光影疏密有致不杂乱，整体光比柔和，空气通透', '自定义'], default: 0 },
      { key: '太阳光光影_自定义', type: 'text', label: '太阳光光影_自定义' },
      { key: '室内光', type: 'select', label: '室内光', options: ['室内无灯光，纯自然光场景，柔和自然漫射光', '开启顶光（天花灯带/射灯/吊灯），打造层次丰富的立体照明效果，营造柔和通透、细腻均匀的室内光影氛围。', '开启顶光（天花灯带/射灯/吊灯）、墙光（壁灯/洗墙灯/窗帘盒灯带）、柜光（柜体灯带/层板灯/柜底灯带/踢脚线灯带）、辅光（落地灯/台灯），打造层次丰富的立体照明效果，营造柔和通透、细腻均匀的室内光影氛围。', '仅开启氛围灯，关闭所有主灯与基础照明，柔和间接照明，温馨静谧', '所有天花嵌入式筒灯全亮，形成均匀漫射的全域基础光；叠加局部定向重点照明；整体低照度高级暗调，沉浸式静谧氛围，明暗过渡丝滑柔和，对比克制有呼吸感，暗部细节完整不死黑', '自定义'], default: 0 },
      { key: '室内光_自定义', type: 'text', label: '室内光_自定义' },
      { key: '室内灯光色温', type: 'select', label: '室内灯光色温', options: ['整体光线的色温在6000K，冷白光。', '整体光线的色温在4500K，中性光。', '整体光线的色温在3500K，暖白光。', '整体光线的色温在2800K，暖黄光。', '自定义'], default: 1 },
      { key: '室内灯光色温_自定义', type: 'text', label: '室内灯光色温_自定义' },
      { key: '后期色调', type: 'select', label: '后期色调', options: ['原生中性微暖后期调色，色彩平衡自然柔和，真实还原材质本色，无过度修饰无色彩失真。', '暖调写实后期，色彩温润统一，低饱和柔和质感，层次细腻雅致。', '冷调写实后期，色彩清透统一，低饱和高级质感，层次清爽干净。', '电影胶片级后期调色，色彩层次温润细腻，低饱和柔化质感，高光柔和、阴影雅致，影调复古通透，色调统一高级，胶片质感自然真实。', '浅暖色中性平衡色调，整体干净通透的浅暖色白调，色温4200K白光（中性偏浅暖），清爽不刺眼，色彩统一和谐，无高饱和跳色。', '浅青色中性平衡色调，整体干净通透的浅青色白调，色温4200K白光（中性偏浅暖），清爽不刺眼，色彩统一和谐，无高饱和跳色。', '自定义'], default: 0 },
      { key: '后期色调_自定义', type: 'text', label: '后期色调_自定义' },
      { key: '光影品质', type: 'select', label: '光影品质', options: ['影调过渡自然平缓，明暗对比均衡适中，亮部柔和不刺眼，暗部保留完整细节且不死黑，光影层次真实通透，整体光影干净克制、还原真实空间光影逻辑，无过度夸张明暗反差。', '光影质感极致温润柔和，明暗过渡细腻虚化，阴影边缘柔和弥散，整体反差偏低舒缓，亮部温润均匀，暗部软糯有层次，光影氛围轻柔雅致、无生硬明暗切割。', '明暗边界清晰利落，光影对比干净凝练，亮部通透锐利，暗部简洁沉稳，层次分明不拖沓，整体光影质感冷峻通透、无模糊柔化。', '影调层次深邃富有韵律，明暗过渡优雅有呼吸感，亮部适度压光柔和，暗部保留细腻质感与微灰层次，光影节奏沉稳高级，整体呈现电影级叙事感光影，氛围厚重雅致。', '影调原生自然，以自然光为唯一主导，明暗过渡真实平缓，对比适中克制，无额外人工补光、无人工光影修饰、最少后期干预，亮部柔和自然，暗部保留原生细节，还原空间真实光影状态，整体光影质朴写实、还原肉眼所见真实感。', '自定义'], default: 4 },
      { key: '光影品质_自定义', type: 'text', label: '光影品质_自定义' }
    ]
  },
  camera: {
    title: '摄影参数',
    desc: '模拟专业相机的拍摄参数',
    fields: [
      { key: '相机的型号', type: 'select', label: '相机型号', options: ['Fuji GFX 100S', 'Hasselblad X2D 100C', 'Nikon Z9', 'Sony A7RV', 'Leica M11', 'Canon R5', 'iPhone17 pro max', '自定义'], default: 1 },
      { key: '相机的型号_自定义', type: 'text', label: '相机型号_自定义' },
      { key: '光圈', type: 'select', label: '光圈', options: ['f/1.4', 'f/2.8', 'f/5.6', 'f/8', 'f/11', '主摄 f/1.6（手机专用）', '自定义'], default: 3 },
      { key: '光圈_自定义', type: 'text', label: '光圈_自定义' },
      { key: '快门速度', type: 'select', label: '快门速度', options: ['1/1000s', '1/250s', '1/30s', '1s', '5s', '30s', '1/15s（手机专用）', '1/60s（手机专用）', '自定义'], default: 3 },
      { key: '快门速度_自定义', type: 'text', label: '快门速度_自定义' },
      { key: 'ISO', type: 'select', label: 'ISO', options: ['50（手机专用）', '100', '200', '400', '800', '1600', '自定义'], default: 1 },
      { key: 'ISO_自定义', type: 'text', label: 'ISO_自定义' },
      { key: '全画幅等效焦距', type: 'select', label: '全画幅等效焦距', options: ['13mm（0.5超广角）超大客厅', '24mm（1倍主摄）常规客餐厅（手机专用）', '28mm（1.2倍裁切）常规卧室', '48mm（2倍裁切）软装特写、材质细节', '90mm（中长焦）', '135mm（长焦）', '自定义'], default: 1 },
      { key: '全画幅等效焦距_自定义', type: 'text', label: '全画幅等效焦距_自定义' },
      { key: '拍摄技法', type: 'select', label: '拍摄技法', options: ['单张直出', '单张直出（原画质模式，真实瑕疵版）', 'HDR 包围曝光', '移轴矫正', '三脚架长曝', '自定义'], default: 0 },
      { key: '拍摄技法_自定义', type: 'text', label: '拍摄技法_自定义' }
    ]
  },
  constraint: {
    title: '核心约束',
    desc: '强制保真约束，确保输出一致性',
    fields: [
      { key: '几何保真度', type: 'select', label: '几何保真度', options: ['强制几何保真，固定空间结构、墙体轮廓、门窗位置、家具尺寸与摆放位置，保持透视、比例、形状完全一致，严禁任何结构修改、形变、位移或重构', '基本保持几何保真，严格保留空间主体结构、布局、透视与比例；允许细节优化、局部微调与视觉美化，禁止整体重构与大幅改动。', '保留整体空间结构、空间感与透视比例不变；允许家具位置轻微微调，以优化画面构图，禁止改动硬装与空间布局。', '自定义'], default: 0 },
      { key: '几何保真度_自定义', type: 'text', label: '几何保真度_自定义' },
      { key: '物体完整一致性', type: 'select', label: '物体完整一致性', options: ['所有物体保持完整一致，原样保留，禁止新增、删除、替换任何物件。', '保持原有物体完整一致，不删除、不替换现有物件；仅允许新增软装配饰丰富画面。', '硬装物体保持完整一致，不可修改；允许替换软装的样式与款式，物体数量可适度调整。', '保持空间结构与物体完整一致性；允许替换软装及硬装的样式、材质与外观。', '自定义'], default: 0 },
      { key: '物体完整一致性_自定义', type: 'text', label: '物体完整一致性_自定义' },
      { key: '材质完整一致性', type: 'select', label: '材质完整一致性', options: ['材质质感为PBR写实材质质感，100%还原模型贴图颜色纹理，禁止修改', '材质质感为 PBR 写实材质质感，允许优化材质纹理与色彩表现，无需严格还原原始贴图，保持物体形态完整即可。', '自定义'], default: 0 },
      { key: '材质完整一致性_自定义', type: 'text', label: '材质完整一致性_自定义' }
    ]
  },
  output: {
    title: '出图参数',
    desc: '输出图像的分辨率与比例设置',
    fields: [
      { key: '出图比例', type: 'select', label: '出图比例', options: ['100%保持原图比例', '16:9 横构图', '4:3 横构图', '1:1 方形构图', '3:4 竖构图', '9:16 竖构图', '自定义'], default: 0 },
      { key: '出图比例_自定义', type: 'text', label: '出图比例_自定义' },
      { key: '分辨率', type: 'select', label: '分辨率', options: ['8K 超高清分辨率，超高像素密度，极度清晰，超精细完整细节', '4K 超高清分辨率，超高像素密度，清晰细腻，完整细节呈现', '自定义'], default: 0 },
      { key: '分辨率_自定义', type: 'text', label: '分辨率_自定义' }
    ]
  }
};

const SECTION_COLORS: Record<string, string> = {
  task: '#8b5cf6',
  scene: '#10b981',
  light: '#f59e0b',
  camera: '#3b82f6',
  constraint: '#ef4444',
  output: '#ec4899'
};

// Custom buttons localStorage management
function getCustomButtons(): CustomButtonsData {
  try {
    const saved = localStorage.getItem('promptGeneratorCustomButtons');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveCustomButtons(data: CustomButtonsData) {
  localStorage.setItem('promptGeneratorCustomButtons', JSON.stringify(data));
}

function addCustomButton(fieldKey: string, value: string, shortLabel: string): boolean {
  const data = getCustomButtons();
  if (!data[fieldKey]) data[fieldKey] = [];
  if (data[fieldKey].some((b: CustomButton) => b.value === value)) return false;
  data[fieldKey].push({ value, shortLabel, date: new Date().toISOString() });
  saveCustomButtons(data);
  return true;
}

function removeCustomButton(fieldKey: string, value: string) {
  const data = getCustomButtons();
  if (!data[fieldKey]) return;
  data[fieldKey] = data[fieldKey].filter((b: CustomButton) => b.value !== value);
  if (data[fieldKey].length === 0) delete data[fieldKey];
  saveCustomButtons(data);
}

const PRESETS_KEY = 'promptGeneratorPresets';

function getPresets(): PresetData[] {
  try {
    const saved = localStorage.getItem(PRESETS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: PresetData[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function addPreset(preset: PresetData): boolean {
  const presets = getPresets();
  if (presets.some(p => p.name === preset.name)) return false;
  presets.unshift(preset);
  savePresets(presets);
  return true;
}

function deletePreset(id: string) {
  const presets = getPresets().filter(p => p.id !== id);
  savePresets(presets);
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({ isOpen, onClose, onApply }) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customButtons, setCustomButtons] = useState<CustomButtonsData>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['task', 'scene', 'light', 'camera', 'constraint', 'output']));
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set(['task', 'scene', 'light', 'camera', 'constraint', 'output']));
  const [presets, setPresets] = useState<PresetData[]>([]);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
      }
    };
    if (showPresetMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresetMenu]);

  useEffect(() => {
    if (isOpen) {
      setCustomButtons(getCustomButtons());
      setPresets(getPresets());

      const initial: Record<string, number> = {};
      for (const [sectionId, section] of Object.entries(CONFIG)) {
        for (const field of section.fields) {
          if (field.type === 'select' && field.default !== undefined) {
            initial[`${sectionId}__${field.key}`] = field.default;
          }
        }
      }
      setSelections(initial);
      setCustomInputs({});
      setShowPresetMenu(false);
      setShowSaveDialog(false);
      setPresetName('');
      setActivePresetName(null);
    }
  }, [isOpen]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleSectionEnabled = (sectionId: string) => {
    setEnabledSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
    setActivePresetName(null);
  };

  const handleSelect = (sectionId: string, fieldKey: string, index: number) => {
    setSelections(prev => ({ ...prev, [`${sectionId}__${fieldKey}`]: index }));
    setActivePresetName(null);
  };

  const handleCustomInput = (sectionId: string, fieldKey: string, value: string) => {
    setCustomInputs(prev => ({ ...prev, [`${sectionId}__${fieldKey}`]: value }));
    setActivePresetName(null);
  };

  const handleSaveCustomButton = (sectionId: string, fieldKey: string) => {
    const baseFieldKey = fieldKey.replace('_自定义', '');
    const inputKey = `${sectionId}__${fieldKey}`;
    const value = customInputs[inputKey]?.trim();
    if (!value) return;

    // Check if value already exists in built-in options
    const field = CONFIG[sectionId]?.fields.find(f => f.key === fieldKey);
    if (field?.options?.includes(value)) return;

    const shortLabel = value.length > 10 ? value.substring(0, 10) + '...' : value;
    const added = addCustomButton(baseFieldKey, value, shortLabel);
    if (added) {
      setCustomButtons(getCustomButtons());
      // Switch to custom option
      const fieldOptions = field?.options || [];
      handleSelect(sectionId, fieldKey, fieldOptions.length - 1);
    }
  };

  const handleDeleteCustomButton = (fieldKey: string, value: string) => {
    removeCustomButton(fieldKey, value);
    setCustomButtons(getCustomButtons());
  };

  const buildJSON = () => {
    const json: any = {};

    const addField = (sectionId: string, fieldKey: string) => {
      const section = CONFIG[sectionId];
      const field = section?.fields.find(f => f.key === fieldKey);
      if (!field || field.type !== 'select') return;

      // Skip if section is disabled (except task which is always enabled)
      if (sectionId !== 'task' && !enabledSections.has(sectionId)) return;

      const selectionIndex = selections[`${sectionId}__${fieldKey}`] ?? field.default ?? 0;
      const options = field.options || [];
      const baseFieldKey = fieldKey.replace('_自定义', '');

      // Get section title from CONFIG
      const sectionTitle = section.title;

      // Ensure section object exists
      if (!json[sectionTitle]) {
        json[sectionTitle] = {};
      }

      // Check if selected is a custom button
      if (selectionIndex >= options.length - 1) {
        // Custom option selected - use input value
        const customValue = customInputs[`${sectionId}__${fieldKey}`];
        if (customValue) {
          json[sectionTitle][baseFieldKey] = customValue;
        }
      } else {
        json[sectionTitle][baseFieldKey] = options[selectionIndex] || '';
      }
    };

    // Always add task section
    addField('task', '图生图任务');
    addField('task', '转换逻辑');

    // Only add scene section if enabled
    if (enabledSections.has('scene')) {
      addField('scene', '空间类型');
      addField('scene', '设计风格');
      addField('scene', '外景类型');
      addField('scene', '地点');
    }

    // Only add light section if enabled
    if (enabledSections.has('light')) {
      addField('light', '季节');
      addField('light', '天气');
      addField('light', '时间段');
      addField('light', '窗帘类型');
      addField('light', '进光口控制');
      addField('light', '太阳光光影');
      addField('light', '室内光');
      addField('light', '室内灯光色温');
      addField('light', '后期色调');
      addField('light', '光影品质');
    }

    // Only add camera section if enabled
    if (enabledSections.has('camera')) {
      addField('camera', '相机的型号');
      addField('camera', '光圈');
      addField('camera', '快门速度');
      addField('camera', 'ISO');
      addField('camera', '全画幅等效焦距');
      addField('camera', '拍摄技法');
    }

    // Always add constraint and output sections
    addField('constraint', '几何保真度');
    addField('constraint', '物体完整一致性');
    addField('constraint', '材质完整一致性');

    addField('output', '出图比例');
    addField('output', '分辨率');

    return json;
  };

  const syntaxHighlight = (str: string): string => {
    return str.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'text-yellow-400';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-purple-400' : 'text-green-400';
      } else if (/true|false/.test(match)) {
        cls = 'text-blue-400';
      } else if (/null/.test(match)) {
        cls = 'text-red-400';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  };

  const json = buildJSON();
  const previewContent = JSON.stringify(json, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(previewContent);
  };

  const handleApply = () => {
    const text = JSON.stringify(json, null, 2);
    onApply(text);
    onClose();
  };

  const handleReset = () => {
    const initial: Record<string, number> = {};
    for (const [sectionId, section] of Object.entries(CONFIG)) {
      for (const field of section.fields) {
        if (field.type === 'select' && field.default !== undefined) {
          initial[`${sectionId}__${field.key}`] = field.default;
        }
      }
    }
    setSelections(initial);
    setCustomInputs({});
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset: PresetData = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      selections: { ...selections },
      customInputs: { ...customInputs },
      enabledSections: Array.from(enabledSections),
      createdAt: new Date().toISOString(),
    };
    const added = addPreset(preset);
    if (added) {
      setPresets(getPresets());
      setPresetName('');
      setShowSaveDialog(false);
    }
  };

  const handleLoadPreset = (preset: PresetData) => {
    setSelections(preset.selections);
    setCustomInputs(preset.customInputs);
    setEnabledSections(new Set(preset.enabledSections));
    setActivePresetName(preset.name);
    setShowPresetMenu(false);
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets(getPresets());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} style={{ paddingLeft: 'calc(16rem + 1rem)', paddingTop: 'calc(3.5rem + 1rem)' }}>
      <div
        className="bg-surface-1 rounded-2xl border border-white/[0.08] w-full max-w-4xl max-h-[calc(100vh-3.5rem-2rem)] overflow-hidden flex flex-col shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-base">AI 提示词生成器</h3>
            <div className="relative" ref={presetMenuRef}>
              <button
                onClick={() => { setShowPresetMenu(!showPresetMenu); setShowSaveDialog(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-2 hover:bg-surface-3 text-slate-300 hover:text-white text-[11px] font-medium rounded-lg border border-white/[0.06] transition-all"
              >
                <Bookmark className="w-3.5 h-3.5" />
                预设
                {activePresetName && <span className="max-w-[80px] truncate text-indigo-400 font-bold">{activePresetName}</span>}
                {presets.length > 0 && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded">{presets.length}</span>}
                <ChevronDown className={`w-3 h-3 transition-transform ${showPresetMenu ? 'rotate-180' : ''}`} />
              </button>
              {showPresetMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-surface-2 border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => { setShowSaveDialog(true); setShowPresetMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      保存当前配置为预设
                    </button>
                  </div>
                  {presets.length > 0 && (
                    <div className="border-t border-white/[0.06] max-h-[200px] overflow-y-auto custom-scrollbar">
                      {presets.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                          onClick={() => handleLoadPreset(preset)}
                        >
                          <Bookmark className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium text-white truncate">{preset.name}</div>
                            <div className="text-[9px] text-slate-500">
                              {new Date(preset.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                            className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {presets.length === 0 && (
                    <div className="px-3 py-3 text-[11px] text-slate-500 text-center border-t border-white/[0.06]">
                      暂无保存的预设
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showSaveDialog && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/5 border-b border-indigo-500/10">
            <BookmarkPlus className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowSaveDialog(false); }}
              placeholder="输入预设名称..."
              className="input-field flex-1 py-1.5 px-2.5 text-xs"
              autoFocus
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-[11px] font-medium rounded-lg transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => { setShowSaveDialog(false); setPresetName(''); }}
              className="px-3 py-1.5 bg-surface-3 hover:bg-surface-2 text-slate-300 text-[11px] font-medium rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="w-1/2 border-r border-white/[0.06] overflow-y-auto p-4 custom-scrollbar">
            {Object.entries(CONFIG).map(([sectionId, section]) => {
              const isToggleable = ['scene', 'light', 'camera'].includes(sectionId);
              const isEnabled = enabledSections.has(sectionId);

              return (
              <div key={sectionId} className={`mb-3 bg-surface-2 rounded-xl border border-white/[0.04] overflow-hidden ${!isEnabled ? 'opacity-60' : ''}`}>
                <div
                  className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  onClick={() => toggleSection(sectionId)}
                >
                  <div className="flex items-center gap-2.5">
                    {isToggleable && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: isEnabled ? SECTION_COLORS[sectionId] + '30' : '#333', color: isEnabled ? SECTION_COLORS[sectionId] : '#666' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionEnabled(sectionId);
                        }}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isEnabled ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}>
                          {isEnabled && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                    )}
                    {!isToggleable && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: SECTION_COLORS[sectionId] + '30', color: SECTION_COLORS[sectionId] }}
                      >
                        {section.title[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium text-sm">{section.title}</div>
                      <div className="text-slate-500 text-[11px]">{section.desc}</div>
                    </div>
                  </div>
                  <div className={`transform transition-transform ${openSections.has(sectionId) ? 'rotate-180' : ''}`}>
                    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {openSections.has(sectionId) && (
                  <div className="p-2.5 border-t border-white/[0.04]">
                    <div className="space-y-2.5">
                      {section.fields.filter(f => f.type === 'select').map(field => {
                        const key = `${sectionId}__${field.key}`;
                        const options = field.options || [];
                        const baseFieldKey = field.key.replace('_自定义', '');
                        const customBtns = customButtons[baseFieldKey] || [];
                        const totalOptions = options.length;
                        const selectedIndex = selections[key] ?? field.default ?? 0;
                        const isCustom = selectedIndex === options.length - 1;

                        const builtInCount = options.length - 1;
                        const customBtnCount = customBtns.length;
                        const isCustomBtnSelected = selectedIndex < builtInCount + customBtnCount && selectedIndex >= builtInCount;

                        return (
                          <div key={field.key}>
                            <label className="text-slate-400 text-[11px] font-medium mb-1 block">{field.label}</label>
                            <div className="flex flex-wrap gap-1">
                              {options.slice(0, -1).map((opt, idx) => (
                                <button
                                  key={`built-in-${idx}`}
                                  onClick={() => handleSelect(sectionId, field.key, idx)}
                                  className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                                    selectedIndex === idx
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-surface-1 text-slate-400 hover:bg-surface-3'
                                  }`}
                                >
                                  {opt.length > 10 ? opt.substring(0, 10) + '...' : opt}
                                </button>
                              ))}

                              {customBtns.map((btn, idx) => (
                                <button
                                  key={`custom-${idx}`}
                                  onClick={() => handleSelect(sectionId, field.key, builtInCount + idx)}
                                  className={`px-2 py-0.5 rounded-md text-[11px] transition-all group relative ${
                                    selectedIndex === builtInCount + idx
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-surface-1 text-slate-400 hover:bg-surface-3'
                                  }`}
                                >
                                  {btn.shortLabel}
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCustomButton(baseFieldKey, btn.value);
                                    }}
                                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full items-center justify-center text-white hidden group-hover:flex"
                                  >
                                    <Trash2 className="w-2 h-2" />
                                  </span>
                                </button>
                              ))}

                              <button
                                onClick={() => handleSelect(sectionId, field.key, options.length - 1)}
                                className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                                  isCustom
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-surface-1 text-slate-400 hover:bg-surface-3'
                                }`}
                              >
                                自定义
                              </button>
                            </div>

                            {(isCustom || isCustomBtnSelected) && (
                              <div className="mt-1.5 flex gap-1.5">
                                <input
                                  type="text"
                                  value={customInputs[key] || ''}
                                  onChange={e => handleCustomInput(sectionId, field.key, e.target.value)}
                                  placeholder={isCustomBtnSelected ? '' : '请输入自定义内容'}
                                  className="input-field flex-1 py-1.5 px-2.5 text-xs"
                                />
                                {isCustom && (
                                  <button
                                    onClick={() => handleSaveCustomButton(sectionId, field.key)}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap"
                                  >
                                    <Save className="w-2.5 h-2.5" />
                                    保存
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>

          <div className="w-1/2 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <div className="text-slate-400 text-[11px] font-medium">实时预览</div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                  title="复制"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                  title="重置"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar min-h-0">
              <pre
                className="text-xs font-mono whitespace-pre-wrap text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(previewContent) }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 p-3 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-3 text-white text-sm font-medium hover:bg-surface-2 transition-all border border-white/[0.04]"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="btn-primary px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            确认填入
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptGenerator;