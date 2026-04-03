/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutGrid, 
  Palette, 
  Box, 
  Image as ImageIcon, 
  RefreshCw, 
  Sun, 
  Film, 
  Globe, 
  BarChart3, 
  Layers, 
  Heart, 
  Maximize2, 
  Settings, 
  Bell, 
  Search, 
  Upload, 
  MoreVertical, 
  Zap,
  ChevronDown,
  Eye,
  CreditCard,
  User,
  Camera,
  Info,
  Trash2,
  Plus,
  Download,
  Share2,
  Copy,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type View = 'workspace' | 'gallery' | 'settings' | 'billing';
type MenuItemId = 'workspace' | 'colors' | '3d' | 'effects' | 'style' | 'lighting' | 'storyboard' | 'panorama' | 'analysis' | 'board' | 'mood' | 'explode';
type GalleryCategory = 'hot' | 'latest' | 'style';

interface GenerationResult {
  status: string;
  request_id: string;
  response_url: string;
  status_url: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// --- Toast Notification Component ---
const Toast = ({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
        toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'
      } text-white`}
    >
      {toast.type === 'success' && <Check className="w-5 h-5" />}
      {toast.type === 'error' && <X className="w-5 h-5" />}
      {toast.type === 'info' && <Info className="w-5 h-5" />}
      <span className="font-medium">{toast.message}</span>
    </motion.div>
  );
};

// --- Components ---

const Sidebar = ({ 
  currentView, 
  setView, 
  activeMenuItem, 
  setActiveMenuItem 
}: { 
  currentView: View, 
  setView: (v: View) => void,
  activeMenuItem: MenuItemId,
  setActiveMenuItem: (id: MenuItemId) => void
}) => {
  const menuItems: { id: MenuItemId; icon: React.ComponentType<{ className?: string }>; label: string; group: string }[] = [
    { id: 'workspace', icon: LayoutGrid, label: '生成布置图', group: '平面操作' },
    { id: 'colors', icon: Palette, label: '生成色彩平图', group: '平面操作' },
    { id: '3d', icon: Box, label: '生成3D轴测图', group: '平面操作' },
    { id: 'effects', icon: ImageIcon, label: '生成效果图', group: '效果图操作' },
    { id: 'style', icon: RefreshCw, label: '风格替换', group: '效果图操作' },
    { id: 'lighting', icon: Sun, label: '光阴替换', group: '效果图操作' },
    { id: 'storyboard', icon: Film, label: '分镜生成', group: '效果图操作' },
    { id: 'panorama', icon: Globe, label: '360全景', group: '效果图操作' },
    { id: 'analysis', icon: BarChart3, label: '材料分析图', group: '汇报图操作' },
    { id: 'board', icon: Layers, label: '设计展板', group: '汇报图操作' },
    { id: 'mood', icon: Heart, label: '情绪材料版', group: '汇报图操作' },
    { id: 'explode', icon: Maximize2, label: '空间爆炸图', group: '汇报图操作' },
  ];

  const groups = Array.from(new Set(menuItems.map(item => item.group)));

  const handleMenuItemClick = (id: MenuItemId) => {
    setActiveMenuItem(id);
    setView('workspace');
  };

  return (
    <aside className="w-64 bg-[#1c1f26] h-screen flex flex-col border-r border-[#2a2e38] fixed left-0 top-0 z-40">
      <div className="p-6 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight font-headline">MIDNIGHT ATELIER</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI WORKSPACE</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2">
        {groups.map(group => (
          <div key={group} className="mb-6">
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group}</p>
            {menuItems.filter(item => item.group === group).map(item => (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                  activeMenuItem === item.id 
                  ? 'bg-indigo-600/10 text-indigo-400' 
                  : 'text-slate-400 hover:bg-[#2a2e38] hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeMenuItem === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto p-2 border-t border-[#2a2e38]">
        <button 
          onClick={() => { setView('billing'); setActiveMenuItem('workspace' as MenuItemId); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${currentView === 'billing' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-[#2a2e38] hover:text-white'}`}
        >
          <CreditCard className="w-4 h-4" />
          <span className="text-sm font-medium">账单管理</span>
        </button>
        <button 
          onClick={() => { setView('settings'); setActiveMenuItem('workspace' as MenuItemId); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'settings' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-[#2a2e38] hover:text-white'}`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">设置</span>
        </button>
        <div className="mt-2 p-3 bg-[#111317] rounded-xl flex items-center gap-3 group cursor-pointer hover:bg-[#2a2e38] transition-colors">
          <img 
            src="https://picsum.photos/seed/artist/100/100" 
            alt="User" 
            className="w-8 h-8 rounded-full border border-white/10"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">Julian Vane</p>
            <p className="text-[10px] text-slate-500 truncate">账号类型: 专业版</p>
          </div>
          <MoreVertical className="w-3 h-3 text-slate-500" />
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ 
  currentView, 
  setView, 
  searchQuery, 
  setSearchQuery,
  onExport 
}: { 
  currentView: View, 
  setView: (v: View) => void,
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  onExport: () => void
}) => {
  return (
    <header className="h-16 border-b border-[#2a2e38] bg-[#111317] flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-6">
          <button 
            onClick={() => setView('workspace')}
            className={`text-sm font-bold transition-all relative py-1 ${currentView === 'workspace' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            工作区
            {currentView === 'workspace' && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
          <button 
            onClick={() => setView('gallery')}
            className={`text-sm font-bold transition-all relative py-1 ${currentView === 'gallery' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            公共画廊
            {currentView === 'gallery' && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search workspace..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1c1f26] border-none rounded-full py-1.5 pl-10 pr-4 text-xs w-64 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none"
          />
        </div>
        <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
        <button 
          onClick={onExport}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          导出
        </button>
      </div>
    </header>
  );
};

const WorkspaceView = ({ 
  apiKey, 
  activeMenuItem, 
  model,
  setModel,
  selectedPreset,
  setSelectedPreset,
  creativity,
  setCreativity,
  structure,
  setStructure,
  showToast
}: { 
  apiKey: string,
  activeMenuItem: MenuItemId,
  model: string,
  setModel: (m: string) => void,
  selectedPreset: string,
  setSelectedPreset: (p: string) => void,
  creativity: number,
  setCreativity: (c: number) => void,
  structure: number,
  setStructure: (s: number) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png'
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const presets = ['Realistic', 'Cyberpunk', 'Minimalist', 'Cinematic'];
  const models = ['🍌全能图片V2', '🍌全能图片PRO'];

  const getMenuItemLabel = (id: MenuItemId): string => {
    const items: Record<MenuItemId, string> = {
      'workspace': '布置图',
      'colors': '色彩平图',
      '3d': '3D轴测图',
      'effects': '效果图',
      'style': '风格替换',
      'lighting': '光阴替换',
      'storyboard': '分镜生成',
      'panorama': '360全景',
      'analysis': '材料分析图',
      'board': '设计展板',
      'mood': '情绪材料版',
      'explode': '空间爆炸图'
    };
    return items[id];
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      showToast('error', '请先在设置中配置 API 密钥');
      return;
    }
    if (!prompt.trim()) {
      showToast('error', '请输入提示词');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('https://yunwu.ai/fal-ai/nano-banana/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt,
          image_urls: imageUrls,
          num_images: 1
        })
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data: GenerationResult = await response.json();
      setResult(data.response_url);
      showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！`);
    } catch (error) {
      console.error('Generation error:', error);
      showToast('error', `生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearResult = () => {
    setResult(null);
    showToast('info', '已清除生成结果');
  };

  const handleUpload = () => {
    showToast('info', '上传功能已触发');
  };

  const handleViewAll = () => {
    showToast('info', '正在加载全部历史记录...');
  };

  const handleAddToPrompt = () => {
    const additions = ['细节丰富', '高精度', '现代风格', '专业渲染'];
    const randomAdd = additions[Math.floor(Math.random() * additions.length)];
    setPrompt(prev => prev ? `${prev}, ${randomAdd}` : randomAdd);
  };

  const handleCopyResult = async () => {
    if (result) {
      try {
        await navigator.clipboard.writeText(result);
        showToast('success', '图片链接已复制到剪贴板');
      } catch {
        showToast('error', '复制失败');
      }
    }
  };

  const handleShare = () => {
    if (result) {
      showToast('info', '分享功能开发中...');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    showToast('info', '文件上传功能已触发');
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          {/* Current Action Indicator */}
          <div className="mb-6 flex items-center gap-3">
            <div className="px-4 py-2 bg-indigo-600/10 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">当前: {getMenuItemLabel(activeMenuItem)}</span>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                生成中...
              </div>
            )}
          </div>

          {/* Result Area */}
          {result ? (
            <div className="aspect-video rounded-2xl overflow-hidden bg-[#1c1f26] mb-12 relative group">
              <img 
                src={result} 
                alt="Generated Result" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handleCopyResult}
                  className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                  title="复制链接"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                  title="分享"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleClearResult}
                  className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Upload Area */
            <div 
              className={`aspect-video rounded-2xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-12 ${
                isDragging ? 'border-indigo-500 bg-[#1c1f26]' : 'border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUpload}
            >
              <div className="w-16 h-16 bg-[#111317] rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">点击或拖拽图片到此处上传</h3>
              <p className="text-slate-500 text-sm mb-4">Click or drag image here to upload</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">支持 JPG, PNG, WEBP (最大 20MB)</p>
            </div>
          )}

          {/* Recent Generations */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">最近生成 <span className="text-slate-500 font-normal text-sm ml-2">Recent Generations</span></h2>
              <button 
                onClick={handleViewAll}
                className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors"
              >
                查看全部
              </button>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="aspect-[3/4] rounded-xl overflow-hidden bg-[#1c1f26] relative group cursor-pointer"
                >
                  <img 
                    src={`https://picsum.photos/seed/arch${i}/600/800`} 
                    alt="Recent" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="text-xs text-white font-medium">Architecture Concept #{i}</p>
                    <div className="flex gap-2 mt-2">
                      <button className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors">
                        <Download className="w-3 h-3 text-white" />
                      </button>
                      <button className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors">
                        <Share2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <aside className="w-80 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-6 overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">引擎与模型</p>
          <div className="relative group">
            <select 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#111317] border border-[#2a2e38] rounded-xl py-3 px-4 text-sm text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-[#1c1f26] hover:border-slate-600 shadow-inner"
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">视觉预设</p>
          <div className="grid grid-cols-2 gap-3">
            {presets.map(preset => (
              <button 
                key={preset}
                onClick={() => setSelectedPreset(preset)}
                className={`aspect-video rounded-lg overflow-hidden relative group border-2 transition-all ${
                  selectedPreset === preset ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-slate-600'
                }`}
              >
                <img 
                  src={`https://picsum.photos/seed/${preset}/300/200`} 
                  alt={preset} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">{preset}</span>
                {selectedPreset === preset && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8 space-y-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">参数设置</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-slate-400">创造力 (随机性)</label>
                <span className="text-xs text-indigo-400 font-bold">{creativity}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-slate-400">结构忠实度</label>
                <span className="text-xs text-indigo-400 font-bold">{structure}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={structure}
                onChange={(e) => setStructure(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[#2a2e38]">
          <div className="bg-[#111317] rounded-xl p-4 mb-4">
            <textarea 
              placeholder="输入您的建筑构想..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-white resize-none outline-none min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={handleAddToPrompt}
                className="p-1.5 text-slate-500 hover:text-white transition-colors"
                title="添加提示词"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPrompt('')}
                className="p-1.5 text-slate-500 hover:text-white transition-colors"
                title="清空"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-current" />
            )}
            {isGenerating ? '生成中...' : '立即生成'}
          </button>
        </div>
      </aside>
    </div>
  );
};

const GalleryView = ({ 
  category, 
  setCategory,
  showToast 
}: { 
  category: GalleryCategory,
  setCategory: (c: GalleryCategory) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}) => {
  const categories: { id: GalleryCategory; label: string }[] = [
    { id: 'hot', label: '热门推荐' },
    { id: 'latest', label: '最新发布' },
    { id: 'style', label: '风格流派' }
  ];

  const items = [
    { id: 1, type: 'pending', title: '您的作品审核中...', eta: '预计 2 分钟内完成', img: 'https://picsum.photos/seed/pending/600/800' },
    { id: 2, author: '@NeoSoul', time: '2小时前', desc: '霓虹灯火映照下的未来都市，雨后的街道倒映着璀璨的电子幻梦...', img: 'https://picsum.photos/seed/cyber/600/800' },
    { id: 3, author: '@LiquidDreams', time: '4小时前', desc: '流动的金属质感，如同宇宙尘埃凝聚而成的液态生命体...', img: 'https://picsum.photos/seed/liquid/600/800' },
    { id: 4, author: '@AstraArt', time: '昨天发布', desc: '漂浮在星云深处的奇幻岛屿，粉紫色的梦境森林...', img: 'https://picsum.photos/seed/nebula/600/800' },
    { id: 5, author: '@ZenithSpace', time: '1天前', desc: '极简主义建筑的光影实验，流动的几何曲线...', img: 'https://picsum.photos/seed/arch/600/800' },
    { id: 6, author: '@EcoAI', time: '2天前', desc: '深海珊瑚的宏观纹理，黄金比例的自然生长规律...', img: 'https://picsum.photos/seed/coral/600/800' },
    { id: 7, author: '@CyberPioneer', time: '3天前', desc: '赛博格的觉醒之眼，蓝色光纤中流淌的数字灵魂...', img: 'https://picsum.photos/seed/cyborg/600/800' },
    { id: 8, author: '@VanGoghAI', time: '4天前', desc: '印象派风格的熏衣草田，夕阳下的色彩堆叠与情感宣泄...', img: 'https://picsum.photos/seed/lavender/600/800' },
  ];

  const handleLoadMore = () => {
    showToast('info', '正在加载更多作品...');
  };

  const handleItemClick = (id: number) => {
    showToast('info', `正在打开作品 #${id}...`);
  };

  const handleDownload = (e: React.MouseEvent, img: string) => {
    e.stopPropagation();
    showToast('success', '开始下载图片...');
  };

  const handleShareItem = (e: React.MouseEvent, author: string) => {
    e.stopPropagation();
    showToast('info', `分享 ${author} 的作品...`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-black font-headline text-white tracking-tight">公共画廊</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">探索来自 Atelier 社区的最新创作。由 AI 策划，由艺术家精炼。</p>
          <div className="flex justify-center gap-3 pt-4">
            {categories.map((cat, i) => (
              <button 
                key={cat.id} 
                onClick={() => setCategory(cat.id)}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  category === cat.id ? 'bg-indigo-600/10 text-indigo-400' : 'bg-[#1c1f26] text-slate-500 hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map(item => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => handleItemClick(item.id)}
              className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#1c1f26] relative group cursor-pointer shadow-2xl"
            >
              <img 
                src={item.img} 
                alt="Gallery" 
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${item.type === 'pending' ? 'opacity-40 grayscale blur-sm' : ''}`}
                referrerPolicy="no-referrer"
              />
              
              {item.type === 'pending' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="font-bold text-white text-lg">{item.title}</p>
                  <p className="text-slate-500 text-xs mt-2">{item.eta}</p>
                </div>
              ) : (
                <>
                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-2 py-1 rounded bg-black/60 backdrop-blur text-[10px] font-bold text-white uppercase tracking-tighter">已发布</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{item.author}</p>
                        <p className="text-[10px] text-slate-500">{item.time}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 italic line-clamp-2 leading-relaxed">"{item.desc}"</p>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={(e) => handleDownload(e, item.img)}
                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        下载
                      </button>
                      <button 
                        onClick={(e) => handleShareItem(e, item.author || '')}
                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-1"
                      >
                        <Share2 className="w-3 h-3" />
                        分享
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button 
            onClick={handleLoadMore}
            className="bg-[#1c1f26] hover:bg-[#2a2e38] text-white px-10 py-3 rounded-full font-bold transition-all flex items-center gap-3 mx-auto border border-white/5"
          >
            加载更多作品
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ 
  apiKey, 
  setApiKey,
  showToast 
}: { 
  apiKey: string, 
  setApiKey: (key: string) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}) => {
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  const [nickname, setNickname] = useState('NightShade_Artist');

  const handleSave = () => {
    setApiKey(localKey);
    localStorage.setItem('atelier_api_key', localKey);
    showToast('success', '设置已保存');
  };

  const handleClearKey = () => {
    setLocalKey('');
    showToast('info', 'API 密钥已清除');
  };

  const handleToggleKeyVisibility = () => {
    setShowKey(!showKey);
  };

  const handleCancel = () => {
    setLocalKey(apiKey);
    setNickname('NightShade_Artist');
    showToast('info', '已取消更改');
  };

  const handleUploadAvatar = () => {
    showToast('info', '头像上传功能已触发');
  };

  const handleChangeAvatar = () => {
    showToast('info', '更换头像功能已触发');
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">账户设置</h1>
          <p className="text-slate-400">管理您的个人资料、API 访问权限及偏好设置。</p>
        </div>

        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">个人资料</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-8 space-y-8 border border-white/5">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="relative group w-24 h-24">
                <img 
                  src="https://picsum.photos/seed/avatar/200/200" 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div 
                  className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={handleChangeAvatar}
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={handleUploadAvatar}
                  className="px-6 py-2.5 bg-[#2a2e38] hover:bg-[#333742] text-white rounded-lg transition-all font-medium flex items-center gap-2 border border-white/5"
                >
                  <Upload className="w-4 h-4" />
                  更换头像
                </button>
                <p className="text-xs text-slate-500">建议尺寸 400x400px。支持 JPG, PNG 或 WebP。</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-white/80">昵称</label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
              <p className="text-xs text-slate-500">这是您在社区中显示的公开名称。</p>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">API 设置</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-8 space-y-6 border border-white/5">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-white/80">API 密钥 (Bearer Token)</label>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                  {apiKey ? '已配置' : '未配置'}
                </span>
              </div>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"} 
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="输入您的 API 密钥..."
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white font-mono text-sm outline-none pr-12"
                />
                <button 
                  onClick={handleToggleKeyVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showKey ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                <p className="text-sm text-slate-400 leading-relaxed">
                  用于连接 yunwu.ai 接口。请妥善保管您的密钥，切勿分享给他人。
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-4">
              <button 
                onClick={handleClearKey}
                className="text-rose-400 hover:text-rose-300 text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清除密钥
              </button>
            </div>
          </div>
        </section>

        <div className="pt-8 flex items-center justify-end gap-4">
          <button 
            onClick={handleCancel}
            className="px-8 py-3 text-slate-400 hover:text-white transition-colors font-bold"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

const BillingView = ({ showToast }: { showToast: (type: 'success' | 'error' | 'info', message: string) => void }) => {
  const billingHistory = [
    { date: '2024-03-01', amount: '¥199.00', status: '已支付', desc: '专业版月度订阅' },
    { date: '2024-02-01', amount: '¥199.00', status: '已支付', desc: '专业版月度订阅' },
    { date: '2024-01-01', amount: '¥199.00', status: '已支付', desc: '专业版月度订阅' },
  ];

  const handleRenew = () => {
    showToast('success', '正在跳转到续费页面...');
  };

  const handleChangePlan = () => {
    showToast('info', '正在打开计划选择页面...');
  };

  const handleBuyCredits = () => {
    showToast('info', '正在打开购买页面...');
  };

  const handleEditPayment = () => {
    showToast('info', '正在编辑支付方式...');
  };

  const handleDownloadInvoice = (date: string) => {
    showToast('success', `正在下载 ${date} 的发票...`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">账单管理</h1>
          <p className="text-slate-400">查看您的订阅计划、支付方式及历史账单。</p>
        </div>

        {/* Current Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">当前计划</p>
                  <h2 className="text-3xl font-black font-headline">专业版 (Pro)</h2>
                </div>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">按月计费</span>
              </div>
              <div className="flex items-end gap-2 mb-8">
                <span className="text-4xl font-black font-headline">¥199</span>
                <span className="text-indigo-200 text-sm mb-1">/ 月</span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleRenew}
                  className="bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors"
                >
                  续费订阅
                </button>
                <button 
                  onClick={handleChangePlan}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors"
                >
                  更改计划
                </button>
              </div>
            </div>
            <Zap className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
          </div>

          <div className="bg-[#1c1f26] rounded-2xl p-8 border border-white/5 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">AI 额度使用</p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black font-headline text-white">842</span>
                  <span className="text-slate-500 text-xs">/ 1000 额度</span>
                </div>
                <div className="w-full bg-[#111317] h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '84.2%' }}
                    className="h-full bg-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">额度将于 2024-04-01 重置</p>
              </div>
            </div>
            <button 
              onClick={handleBuyCredits}
              className="w-full mt-6 text-indigo-400 text-xs font-bold hover:text-indigo-300 transition-colors flex items-center justify-center gap-2"
            >
              购买额外额度 <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">支付方式</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-6 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-[#111317] rounded flex items-center justify-center border border-white/5">
                <span className="text-[10px] font-bold text-slate-400">VISA</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Visa 尾号 4242</p>
                <p className="text-xs text-slate-500">有效期至 12/2026</p>
              </div>
            </div>
            <button 
              onClick={handleEditPayment}
              className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              编辑
            </button>
          </div>
        </section>

        {/* Billing History */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">历史账单</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl overflow-hidden border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111317] text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">日期</th>
                  <th className="px-6 py-4">描述</th>
                  <th className="px-6 py-4">金额</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {billingHistory.map((item, i) => (
                  <tr key={i} className="text-white hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.date}</td>
                    <td className="px-6 py-4 text-slate-400">{item.desc}</td>
                    <td className="px-6 py-4 font-bold">{item.amount}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">{item.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDownloadInvoice(item.date)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold text-xs"
                      >
                        下载发票
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [view, setView] = useState<View>('workspace');
  const [apiKey, setApiKey] = useState(localStorage.getItem('atelier_api_key') || '');
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItemId>('workspace');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Workspace settings state
  const [model, setModel] = useState('🍌全能图片V2');
  const [selectedPreset, setSelectedPreset] = useState('Realistic');
  const [creativity, setCreativity] = useState(45);
  const [structure, setStructure] = useState(82);
  
  // Gallery state
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('hot');

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleExport = () => {
    showToast('success', '正在导出项目...');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter: Generate
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (view === 'workspace') {
          showToast('info', '快捷键: Cmd/Ctrl + Enter 触发生成');
        }
      }
      
      // Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        showToast('info', '快捷键: Cmd/Ctrl + S 保存设置');
      }
      
      // Cmd/Ctrl + E: Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      
      // Escape: Close modal/dismiss
      if (e.key === 'Escape') {
        setToasts([]);
      }
      
      // Cmd/Ctrl + 1: Workspace
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setView('workspace');
      }
      
      // Cmd/Ctrl + 2: Gallery
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setView('gallery');
      }
      
      // Cmd/Ctrl + 3: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        setView('settings');
      }
      
      // Cmd/Ctrl + 4: Billing
      if ((e.metaKey || e.ctrlKey) && e.key === '4') {
        e.preventDefault();
        setView('billing');
      }
      
      // G then H: Gallery Hot
      // G then L: Gallery Latest
      // G then S: Gallery Style
      if (view === 'gallery' && e.key === 'g') {
        // Could implement golf-style shortcuts
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, showToast]);

  return (
    <div className="flex min-h-screen font-sans">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        activeMenuItem={activeMenuItem}
        setActiveMenuItem={setActiveMenuItem}
      />
      
      <div className="flex-1 flex flex-col ml-64">
        <TopBar 
          currentView={view} 
          setView={setView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onExport={handleExport}
        />
        
        <main className="flex-1 flex flex-col bg-[#111317]">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {view === 'workspace' && (
                <WorkspaceView 
                  apiKey={apiKey}
                  activeMenuItem={activeMenuItem}
                  model={model}
                  setModel={setModel}
                  selectedPreset={selectedPreset}
                  setSelectedPreset={setSelectedPreset}
                  creativity={creativity}
                  setCreativity={setCreativity}
                  structure={structure}
                  setStructure={setStructure}
                  showToast={showToast}
                />
              )}
              {view === 'gallery' && (
                <GalleryView 
                  category={galleryCategory}
                  setCategory={setGalleryCategory}
                  showToast={showToast}
                />
              )}
              {view === 'settings' && (
                <SettingsView 
                  apiKey={apiKey} 
                  setApiKey={setApiKey}
                  showToast={showToast}
                />
              )}
              {view === 'billing' && <BillingView showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="py-8 px-8 border-t border-[#2a2e38] text-center text-slate-500 text-xs">
          <p>© 2024 Atelier AI. 致力于用 AI 赋能每一位艺术家。</p>
        </footer>
      </div>

      {/* Floating Action Button for Gallery */}
      {view === 'gallery' && (
        <button 
          onClick={() => setView('workspace')}
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center group hover:scale-110 transition-transform z-40"
        >
          <Plus className="w-8 h-8" />
          <span className="absolute right-full mr-4 bg-[#1c1f26] text-white px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/5">
            开始创作
          </span>
        </button>
      )}

      {/* Toast Notifications */}
      <AnimatePresence>
        {toasts.map(toast => (
          <React.Fragment key={toast.id}>
            <Toast toast={toast} onDismiss={dismissToast} />
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
}
