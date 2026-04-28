/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoadingSpinner } from './components/ui/Loading';
import {
  X,
  Check,
  Key,
  MoreVertical,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
  MessageCircle
} from 'lucide-react';
import { useApiKey } from './ApiKeyContext';
import type { MenuItemId } from './menuConfig';
import { getPresetsForMenu } from './visualPresetConfig';
import { useGeneration } from './GenerationContext';
import type { PreviewImageData } from './types';

import EditWorkspace from './components/EditWorkspace';
import GalleryView from './components/GalleryView';
import ImagePreviewModal from './components/ImagePreviewModal';
import { WorkspaceView } from './components/views/WorkspaceView';

type View = 'workspace' | 'gallery' | 'settings' | 'edit';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const Toast = ({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
        toast.type === 'success'
          ? 'bg-emerald-600/90 border-emerald-400/20'
          : toast.type === 'error'
          ? 'bg-rose-600/90 border-rose-400/20'
          : 'bg-indigo-600/90 border-indigo-400/20'
      } text-white`}
    >
      {toast.type === 'success' && <Check className="w-4 h-4" />}
      {toast.type === 'error' && <X className="w-4 h-4" />}
      {toast.type === 'info' && <Info className="w-4 h-4" />}
      <span className="text-sm font-medium">{toast.message}</span>
    </motion.div>
  );
};

import { menuItemsConfig } from './menuConfig';

const Sidebar = ({
  currentView,
  setView,
  activeMenuItem,
  setActiveMenuItem,
  setModel,
}: {
  currentView: View,
  setView: (v: View) => void,
  activeMenuItem: MenuItemId,
  setActiveMenuItem: (id: MenuItemId) => void,
  setModel: (m: string) => void,
}) => {
  const menuItems = menuItemsConfig;
  const groups = Array.from(new Set(menuItems.map(item => item.group)));

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    setActiveMenuItem(item.id);
    setModel(item.model);
    if (item.id === 'edit') {
      setView('edit');
    } else {
      setView('workspace');
    }
  };

  return (
    <aside className="w-64 bg-[#1c1f26] h-screen flex flex-col border-r border-[#2a2e38] fixed left-0 top-0 z-40">
      <div className="p-6 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="12" y1="3" x2="12" y2="12" />
              <line x1="8" y1="12" x2="8" y2="21" />
              <line x1="16" y1="12" x2="16" y2="21" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight font-headline">室内大师</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI 工作空间</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        {groups.map(group => (
          <div key={group} className="mb-5">
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group}</p>
            {menuItems.filter(item => item.group === group).map(item => (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item)}
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

      <div className="mt-auto p-2 border-t border-[#2a2e38] space-y-2">
        <div
          onClick={() => { setView('settings'); setActiveMenuItem('workspace' as MenuItemId); }}
          className="p-3 bg-[#111317] rounded-xl flex items-center gap-3 group cursor-pointer hover:bg-[#2a2e38] transition-colors"
        >
          <div className="w-8 h-8 bg-indigo-600/20 rounded-full flex items-center justify-center">
            <Key className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">个人中心</p>
            <p className="text-[10px] text-slate-500 truncate">API 配置与资料</p>
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
  showToast,
  activeTasks,
}: {
  currentView: View,
  setView: (v: View) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
  activeTasks?: Array<{ id: string; menuName: string; startedAt: number }>,
}) => {
  const { hasApiKey } = useApiKey();
  const isGenerating = activeTasks && activeTasks.length > 0;

  return (
    <header className="h-16 border-b border-[#2a2e38] bg-[#111317] flex items-center justify-between px-8 sticky top-0 z-40">
      {isGenerating && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full shadow-lg shadow-indigo-500/10 z-50" style={{ maxWidth: 'calc(100% - 400px)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            {activeTasks!.map((task, idx) => (
              <div key={task.id} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDelay: `${idx * 0.2}s` }} />
                <span className="text-sm text-indigo-300 font-medium whitespace-nowrap">{task.menuName} 生成中...</span>
                {idx < activeTasks!.length - 1 && <span className="text-indigo-500 mx-1">|</span>}
              </div>
            ))}
          </div>
        </div>
      )}
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
        {!hasApiKey && (
          <div
            onClick={() => setView('settings')}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600/10 rounded-full border border-amber-500/20 cursor-pointer hover:bg-amber-600/20 transition-colors"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">请先配置 API Key</span>
          </div>
        )}

        <div className="relative group">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 cursor-pointer hover:bg-indigo-600/20 transition-colors"
          >
            <User size={14} className="text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400">社区</span>
          </div>

          <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-xl bg-[#1c1f26] border border-white/10 shadow-xl transition-all opacity-0 invisible group-hover:opacity-100 group-hover:visible">
            <div className="text-sm font-bold mb-2 text-white">社区</div>

            <div className="p-3 rounded-lg bg-[#111317] border border-white/5">
              <div className="text-xs font-medium mb-2 text-slate-400">微信群</div>
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <img
                  src="https://lxj-picgo.oss-cn-chengdu.aliyuncs.com/20260425151212856.png"
                  alt="微信群二维码"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                扫码加入微信群，获取更多福利
              </p>
            </div>

            <a
              href="https://ucnuixcl6oxb.feishu.cn/share/base/form/shrcniNMkVC2dV3UTReYsGjTCwb"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
            >
              <MessageCircle size={14} />
              <span>意见反馈</span>
            </a>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-500">
          V2.2
        </span>
      </div>
    </header>
  );
};



const SettingsView = ({
  showToast,
}: {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
}) => {
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setTempApiKey(apiKey);
  }, [apiKey]);

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) {
      showToast('error', '请输入有效的 API Key');
      return;
    }
    setApiKey(tempApiKey.trim());
    showToast('success', 'API Key 已保存');
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setTempApiKey('');
    showToast('info', 'API Key 已清除');
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-gradient-indigo tracking-tight">设置</h1>
          <p className="text-slate-400 text-sm">配置您的 API Key 以使用 AI 生成功能。</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Key className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold font-headline text-white">API Key 配置</h2>
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80">您的 API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="输入您的 API Key"
                  className="input-field w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {hasApiKey ? '✓ 已配置 API Key' : '尚未配置 API Key'}
                </p>
                <a
                  href="https://newapi.asia/console/token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />获取 API Key
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveApiKey}
                className="btn-primary flex-1 text-white py-2.5 rounded-xl font-bold"
              >
                保存 API Key
              </button>
              {hasApiKey && (
                <button
                  onClick={handleClearApiKey}
                  className="px-4 py-2.5 bg-surface-3 hover:bg-rose-500/15 text-rose-400 rounded-xl font-bold transition-all duration-200 border border-white/[0.04] hover:border-rose-500/20"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Info className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold font-headline text-white">使用说明</h2>
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="space-y-3 text-sm text-slate-400">
              <p>1. 点击"获取 API Key"按钮前往 API 服务商网站</p>
              <p>2. 注册/登录后创建一个新的 API Key</p>
              <p>3. 复制 API Key 并粘贴到上方输入框</p>
              <p>4. 点击"保存 API Key"按钮保存配置</p>
              <p>5. 回到工作区即可开始使用 AI 生成功能</p>
              <p>6. 您的 API Key 仅存储在本地浏览器中，不会上传到任何服务器</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  const { apiKey } = useApiKey();
  const [view, setView] = useState<View>('workspace');
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItemId>('workspace');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      const savedView = localStorage.getItem('app_view');
      const savedMenu = localStorage.getItem('app_active_menu');
      if (savedView) setView(JSON.parse(savedView));
      if (savedMenu) setActiveMenuItem(JSON.parse(savedMenu));
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('app_view', JSON.stringify(view));
    } catch {
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('app_active_menu', JSON.stringify(activeMenuItem));
    } catch {
    }
  }, [activeMenuItem]);

  const [selectedPreset, setSelectedPreset] = useState(getPresetsForMenu('workspace')[0]?.label || '');
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [quality, setQuality] = useState('2K');
  const [model, setModel] = useState('🍌全能图片V2');

  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (view === 'workspace') {
          showToast('info', '快捷键: Cmd/Ctrl + Enter 触发生成');
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        showToast('info', '快捷键: Cmd/Ctrl + S 保存设置');
      }
      if (e.key === 'Escape') {
        setToasts([]);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setView('workspace');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setView('gallery');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        setView('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, showToast]);

  const { activeTasks } = useGeneration();
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      <Sidebar
        currentView={view}
        setView={setView}
        activeMenuItem={activeMenuItem}
        setActiveMenuItem={setActiveMenuItem}
        setModel={setModel}
      />

      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <TopBar
          currentView={view}
          setView={setView}
          showToast={showToast}
          activeTasks={activeTasks}
        />

        <main className="flex-1 flex flex-col bg-surface-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-row overflow-hidden w-full h-full"
              style={{ display: 'flex', flexDirection: 'row' }}
            >
              {view === 'workspace' && (
                <Suspense fallback={<LoadingSpinner className="h-full" />}>
                  <WorkspaceView
                    activeMenuItem={activeMenuItem}
                    model={model}
                    setModel={setModel}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    quality={quality}
                    setQuality={setQuality}
                    showToast={showToast}
                    setPreviewImage={setPreviewImage}
                    editingImageIndex={editingImageIndex}
                    setEditingImageIndex={setEditingImageIndex}
                  />
                </Suspense>
              )}
              {view === 'gallery' && (
                <GalleryView
                  showToast={showToast}
                  setPreviewImage={setPreviewImage}
                />
              )}
              {view === 'settings' && (
                <SettingsView showToast={showToast} />
              )}
              {view === 'edit' && (
                <Suspense fallback={<LoadingSpinner className="h-full" />}>
                  <EditWorkspace apiKey={apiKey} showToast={showToast} setPreviewImage={setPreviewImage} />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="py-6 px-8 border-t border-border text-left text-slate-600 text-[10px] w-full">
          <p>© 2026 Atelier AI. 致力于用 AI 赋能每一位设计师。</p>
        </footer>
      </div>

      <AnimatePresence>
        {toasts.map(toast => (
          <React.Fragment key={toast.id}>
            <Toast toast={toast} onDismiss={dismissToast} />
          </React.Fragment>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <ImagePreviewModal
            imageUrl={previewImage.url}
            imageName={previewImage.name}
            imageSize={previewImage.size}
            prompt={previewImage.prompt}
            createdAt={previewImage.createdAt}
            author={previewImage.author}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
