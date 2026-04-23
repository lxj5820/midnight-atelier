/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { RightPanel } from './components/layout';
import { motion, AnimatePresence } from 'motion/react';
import { LoadingSpinner } from './components/ui/Loading';
import {
  Trash2,
  Plus,
  Download,
  Share2,
  RotateCcw,
  X,
  Check,
  Sparkles,
  LogOut,
  Key,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Star,
  Gift,
  Package,
  Settings,
  MoreVertical,
  Upload,
  User,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Zap,
  RefreshCw,
  Info,
  Maximize2,
  Pencil
} from 'lucide-react';
import { useApiKey } from './ApiKeyContext';

// 持久化状态 hook - 安全访问 localStorage
function usePersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const isClient = typeof window !== 'undefined' && window.localStorage != null;

  const [state, setState] = useState<T>(() => {
    if (!isClient) return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) {
        const parsed = JSON.parse(saved);
        if (parsed != null) {
          return parsed as T;
        }
      }
    } catch {
      // 解析失败，使用默认值
    }
    return defaultValue;
  });

  const setPersistedState: React.Dispatch<React.SetStateAction<T>> = useCallback((value) => {
    setState(prev => {
      const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      if (isClient) {
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // 存储失败，忽略
        }
      }
      return nextValue;
    });
  }, [key, isClient]);

  return [state, setPersistedState];
}

// --- Types ---
type View = 'workspace' | 'gallery' | 'settings' | 'edit';
import type { MenuItemId } from './menuConfig';
import { getPresetsForMenu, type VisualPreset } from './visualPresetConfig';
import { useAuth } from './AuthContext.tsx';
import { GenerationProvider, useGeneration } from './GenerationContext';
import { getPromptPlaceholder } from './menuConfig';

import EditWorkspace from './components/EditWorkspace';
import { WorkspaceView } from './components/views/WorkspaceView';
import PanoramaViewer from './components/PanoramaViewer';
import ImageEditor from './components/ImageEditor';
type GalleryCategory = 'hot' | 'latest' | 'style';

interface GenerationResult {
  status: string;
  request_id: string;
  response_url: string;
  status_url: string;
}

interface GenerationRecord {
  id: string;
  type: MenuItemId;
  prompt: string;
  imageUrl: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  createdAt: string;
  resolution?: {
    width: number;
    height: number;
    quality: string;
    aspectRatio: string;
  };
}

interface GalleryItem {
  id: string;
  author: string;
  authorAvatar: string;
  imageUrl: string;
  description: string;
  type: 'published' | 'pending';
  createdAt: string;
  prompt?: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// Gemini API Types
interface InlineDataPart {
  inline_data: {
    mime_type: string;
    data: string;
  };
}

interface TextPart {
  text: string;
}

interface ContentPart {
  role?: string;
  parts: (InlineDataPart | TextPart)[];
}

interface GenerationConfig {
  responseModalities?: string[];
  imageConfig?: {
    aspectRatio?: string;
    imageSize?: string;
    width?: number;
    height?: number;
  };
}

interface GenerateContentRequest {
  contents: ContentPart[];
  generationConfig?: GenerationConfig;
}

// 分辨率映射表 (Banana 2)
const RESOLUTION_MAP: Record<string, Record<string, { width: number; height: number; tokens: number }>> = {
  '1:1': { '1K': { width: 1024, height: 1024, tokens: 1120 }, '2K': { width: 2048, height: 2048, tokens: 1680 }, '4K': { width: 4096, height: 4096, tokens: 2520 } },
  '1:4': { '1K': { width: 512, height: 2048, tokens: 1120 }, '2K': { width: 1024, height: 4096, tokens: 1680 }, '4K': { width: 2048, height: 8192, tokens: 2520 } },
  '1:8': { '1K': { width: 384, height: 3072, tokens: 1120 }, '2K': { width: 768, height: 6144, tokens: 1680 }, '4K': { width: 1536, height: 12288, tokens: 2520 } },
  '2:3': { '1K': { width: 848, height: 1264, tokens: 1120 }, '2K': { width: 1696, height: 2528, tokens: 1680 }, '4K': { width: 3392, height: 5056, tokens: 2520 } },
  '3:2': { '1K': { width: 1264, height: 848, tokens: 1120 }, '2K': { width: 2528, height: 1696, tokens: 1680 }, '4K': { width: 5056, height: 3392, tokens: 2520 } },
  '3:4': { '1K': { width: 896, height: 1200, tokens: 1120 }, '2K': { width: 1792, height: 2400, tokens: 1680 }, '4K': { width: 3584, height: 4800, tokens: 2520 } },
  '4:1': { '1K': { width: 2048, height: 512, tokens: 1120 }, '2K': { width: 4096, height: 1024, tokens: 1680 }, '4K': { width: 8192, height: 2048, tokens: 2520 } },
  '4:3': { '1K': { width: 1200, height: 896, tokens: 1120 }, '2K': { width: 2400, height: 1792, tokens: 1680 }, '4K': { width: 4800, height: 3584, tokens: 2520 } },
  '4:5': { '1K': { width: 928, height: 1152, tokens: 1120 }, '2K': { width: 1856, height: 2304, tokens: 1680 }, '4K': { width: 3712, height: 4608, tokens: 2520 } },
  '5:4': { '1K': { width: 1152, height: 928, tokens: 1120 }, '2K': { width: 2304, height: 1856, tokens: 1680 }, '4K': { width: 4608, height: 3712, tokens: 2520 } },
  '8:1': { '1K': { width: 3072, height: 384, tokens: 1120 }, '2K': { width: 6144, height: 768, tokens: 1680 }, '4K': { width: 12288, height: 1536, tokens: 2520 } },
  '9:16': { '1K': { width: 768, height: 1376, tokens: 1120 }, '2K': { width: 1536, height: 2752, tokens: 1680 }, '4K': { width: 3072, height: 5504, tokens: 2520 } },
  '16:9': { '1K': { width: 1376, height: 768, tokens: 1120 }, '2K': { width: 2752, height: 1536, tokens: 1680 }, '4K': { width: 5504, height: 3072, tokens: 2520 } },
  '21:9': { '1K': { width: 1584, height: 672, tokens: 1120 }, '2K': { width: 3168, height: 1344, tokens: 1680 }, '4K': { width: 6336, height: 2688, tokens: 2520 } },
};

function getResolution(aspectRatio: string, quality: string): { width: number; height: number; tokens: number } {
  return RESOLUTION_MAP[aspectRatio]?.[quality] || RESOLUTION_MAP['1:1']['2K'];
}

// 根据图片尺寸找到最接近的比例
function getClosestAspectRatio(width: number, height: number): string {
  const imageRatio = width / height;
  const aspectRatios = Object.keys(RESOLUTION_MAP);
  let closest = '1:1';
  let minDiff = Infinity;

  for (const ratio of aspectRatios) {
    const [w, h] = ratio.split(':').map(Number);
    const mapRatio = w / h;
    const diff = Math.abs(imageRatio - mapRatio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }
  return closest;
}

// 获取图片尺寸
function getImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// 根据公式 y = 500000x + 278 转换实际额度到展示额度
function displayQuota(actualQuota: number): string {
  return ((actualQuota - 278) / 500000).toFixed(2);
}

// 计算算力消耗
function getComputePointsCost(model: string, quality: string): number {
  if (model === '🍌全能图片PRO') {
    return quality === '4K' ? 36 : 30;
  }
  return quality === '4K' ? 25 : 15;
}

const MAX_GALLERY_ITEMS = 10;

export async function saveGenerationRecord(record: GenerationRecord): Promise<void> {
  // IndexedDB 容量足够，直接存储完整记录（包括 base64 图片）
  await saveGenerationRecordToDB(record);
}

function deleteGenerationRecord(id: string): void {
  deleteGenerationRecordFromDB(id).catch(console.error);
}

function clearGenerationHistory(type?: MenuItemId): void {
  clearGenerationHistoryFromDB(type).catch(console.error);
}

// IndexedDB 存储历史记录
const DB_NAME = 'atelier_db';
const DB_VERSION = 1;
const STORE_NAME = 'generation_history';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function getAllGenerationRecords(): Promise<GenerationRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveGenerationRecordToDB(record: GenerationRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // 获取同类型记录，清理超出限制的旧记录
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = () => {
      // 直接保存新记录，不限制数量
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteGenerationRecordFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearGenerationHistoryFromDB(type?: MenuItemId): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (type) {
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        (getAllRequest.result as GenerationRecord[])
          .filter(r => r.type === type)
          .forEach(r => store.delete(r.id));
      };
    } else {
      store.clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getGenerationHistoryAsync(): Promise<GenerationRecord[]> {
  try {
    return await getAllGenerationRecords();
  } catch {
    return [];
  }
}

async function getGenerationHistoryByTypeAsync(type: MenuItemId): Promise<GenerationRecord[]> {
  const history = await getGenerationHistoryAsync();
  return history.filter(h => h.type === type);
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

// --- Menu Items Configuration (shared across components) ---
import { menuItemsConfig } from './menuConfig';

// --- Components ---

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
  const { apiKey, hasApiKey } = useApiKey();
  const isGenerating = activeTasks && activeTasks.length > 0;

  return (
    <header className="h-16 border-b border-[#2a2e38] bg-[#111317] flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Global Generating Status */}
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
        <span className="text-xs font-bold text-slate-500">
          V2.2
        </span>
      </div>
    </header>
  );
};

const GalleryView = ({
  category,
  setCategory,
  showToast,
}: {
  category: GalleryCategory;
  setCategory: (c: GalleryCategory) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6 space-y-2">
          <h1 className="text-5xl font-black font-headline text-white tracking-tight">公共画廊</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">探索来自 Atelier 社区的最新创作。由 AI 策划，由艺术家精炼。</p>
        </header>

        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-24 h-24 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6">
            <Globe className="w-12 h-12 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">画廊功能待开放</h2>
          <p className="text-slate-400 max-w-md text-center">
            社区画廊功能正在积极开发中，敬请期待。<br />
            开放后将展示更多精彩作品和创意灵感。
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Settings View (API Key Config) ---
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
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">设置</h1>
          <p className="text-slate-400">配置您的 API Key 以使用 AI 生成功能。</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">API Key 配置</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-6 space-y-5 border border-white/5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80">您的 API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="输入您的 API Key"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 pr-12 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
                  {hasApiKey ? '已配置 API Key' : '尚未配置 API Key'}
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold transition-all"
              >
                保存 API Key
              </button>
              {hasApiKey && (
                <button
                  onClick={handleClearApiKey}
                  className="px-4 py-2.5 bg-[#2a2e38] hover:bg-rose-600/20 text-rose-400 rounded-lg font-bold transition-all"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <Info className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">使用说明</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-6 space-y-4 border border-white/5">
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

// --- Main App ---
export default function App() {
  const { apiKey, hasApiKey } = useApiKey();
  const [view, setView] = useState<View>('workspace');
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItemId>('workspace');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 从 localStorage 读取持久化的状态
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('app_view');
      const savedMenu = localStorage.getItem('app_active_menu');
      if (savedView) setView(JSON.parse(savedView));
      if (savedMenu) setActiveMenuItem(JSON.parse(savedMenu));
    } catch {
      // 忽略错误
    }
  }, []);

  // 持久化状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_view', JSON.stringify(view));
    } catch {
      // 忽略
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('app_active_menu', JSON.stringify(activeMenuItem));
    } catch {
      // 忽略
    }
  }, [activeMenuItem]);

  // Workspace settings state
  const [selectedPreset, setSelectedPreset] = useState(getPresetsForMenu('workspace')[0]?.label || '');
  const [creativity, setCreativity] = useState(45);
  const [structure, setStructure] = useState(82);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [quality, setQuality] = useState('2K');
  const [model, setModel] = useState('🍌全能图片V2');

  // Gallery state
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('hot');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Keyboard shortcuts
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

  // useGeneration 必须在所有条件检查之前调用
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

        <main className="flex-1 flex flex-col bg-[#111317] overflow-hidden">
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
                  category={galleryCategory}
                  setCategory={setGalleryCategory}
                  showToast={showToast}
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

        <footer className="py-8 px-8 border-t border-[#2a2e38] text-left text-slate-500 text-xs w-full">
          <p className="pl-[16.67%]">© 2026 Atelier AI. 致力于用 AI 赋能每一位设计师。</p>
        </footer>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toasts.map(toast => (
          <React.Fragment key={toast.id}>
            <Toast toast={toast} onDismiss={dismissToast} />
          </React.Fragment>
        ))}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
