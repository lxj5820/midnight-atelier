/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Upload,
  MoreVertical,
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  User,
  Info,
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
  ChevronUp,
  History,
  Star,
  Gift,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getComputePointLogs, type ComputePointLog, deductComputePoints, refundComputePoints, getUserSubscription, type UserSubscription, getRegistrationStatus, dailySignIn } from './api';
import { getSystemSettings } from './adminApi';

// --- Types ---
type View = 'workspace' | 'gallery' | 'settings' | 'admin';
import type { MenuItemId } from './menuConfig';
import { getPresetsForMenu, type VisualPreset } from './visualPresetConfig';
import { useAuth } from './AuthContext.tsx';
import AdminPanel from './AdminPanel.tsx';
import { getPromptPlaceholder } from './menuConfig';
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

async function saveGenerationRecord(record: GenerationRecord): Promise<void> {
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

async function deleteGenerationRecordFromDB(id: string): Promise<void> {
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

async function getGenerationHistoryAsync(): Promise<GenerationRecord[]> {
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

const RightPanel = ({
  model,
  setModel,
  models,
  presets,
  selectedPreset,
  setSelectedPreset,
  aspectRatio,
  setAspectRatio,
  quality,
  setQuality,
  prompt,
  setPrompt,
  handleAddToPrompt,
  handleGenerate,
  isGenerating
}: {
  model: string,
  setModel: (m: string) => void,
  models: string[],
  presets: VisualPreset[],
  selectedPreset: string,
  setSelectedPreset: (p: string) => void,
  aspectRatio: string,
  setAspectRatio: (r: string) => void,
  quality: string,
  setQuality: (q: string) => void,
  prompt: string,
  setPrompt: (p: string) => void,
  handleAddToPrompt: () => void,
  handleGenerate: () => void,
  isGenerating: boolean
}) => {
  return (
    <aside className="w-64 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-4 overflow-y-auto custom-scrollbar shrink-0">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">引擎与模型</p>
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

      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">效果预设</p>
        <div className="grid grid-cols-2 gap-3">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.label)}
              className={`aspect-video rounded-lg overflow-hidden relative group border-2 transition-all ${
                selectedPreset === preset.label ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-slate-600'
              }`}
            >
              <img
                src={preset.bgImage}
                alt={preset.label}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">{preset.label}</span>
              {selectedPreset === preset.label && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-[#2a2e38]">
        <div className="mb-4">
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">图像比例</p>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-[#111317] border border-[#2a2e38] rounded-lg py-2 px-3 text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="auto">自动</option>
                {model === '🍌全能图片V2' ? (
                  ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))
                ) : (
                  ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">画质</p>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-[#111317] border border-[#2a2e38] rounded-lg py-2 px-3 text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {(subscription?.qualities || ['1K', '2K']).map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
          {isGenerating ? '生成中...' : `立即生成 (-${getComputePointsCost(model, quality)} 算力)`}
        </button>
      </div>
    </aside>
  );
};

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
  const { user, logout } = useAuth();
  const menuItems = menuItemsConfig;
  const groups = Array.from(new Set(menuItems.map(item => item.group)));

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    setActiveMenuItem(item.id);
    setModel(item.model);
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
            <h1 className="text-sm font-bold text-white tracking-tight font-headline">午夜工坊</h1>
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
        {user && user.is_admin === 1 && (
          <div
            onClick={() => { setView('admin'); setActiveMenuItem('workspace' as MenuItemId); }}
            className="p-3 bg-[#111317] rounded-xl flex items-center gap-3 group cursor-pointer hover:bg-[#2a2e38] transition-colors"
          >
            <div className="w-8 h-8 bg-rose-600/20 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">管理员后台</p>
              <p className="text-[10px] text-slate-500 truncate">用户与系统管理</p>
            </div>
            <MoreVertical className="w-3 h-3 text-slate-500" />
          </div>
        )}

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

        {user && (
          <button
            onClick={async () => {
              await logout();
            }}
            className="w-full p-3 bg-[#111317] hover:bg-rose-500/10 rounded-xl flex items-center gap-3 group transition-colors text-left"
          >
            <div className="w-8 h-8 bg-rose-500/10 rounded-full flex items-center justify-center">
              <LogOut className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">退出登录</p>
              <p className="text-[10px] text-slate-500 truncate">{user.nickname || user.email}</p>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

const TopBar = ({
  currentView,
  setView,
  onShowComputeModal,
  showToast,
}: {
  currentView: View,
  setView: (v: View) => void,
  onShowComputeModal: () => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
}) => {
  const { user, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserSubscription().then(res => {
      if (res.success && res.data) {
        setSubscription(res.data);
      } else {
        setSubscription(null);
      }
    });
  }, [user]);

  const planName = subscription?.plan_name || 'free版';

  return (
    <header className="h-16 border-b border-[#2a2e38] bg-[#111317] flex items-center justify-between px-8 sticky top-0 z-40">
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
          {user && user.is_admin === 1 && (
            <button
              onClick={() => setView('admin')}
              className={`text-sm font-bold transition-all relative py-1 ${currentView === 'admin' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              管理后台
              {currentView === 'admin' && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            {planName !== 'free版' && (
              <button
                onClick={async () => {
                  const result = await dailySignIn();
                  if (result.success) {
                    if (result.data?.signedIn) {
                      showToast('info', '今日已签到');
                    } else {
                      showToast('success', `签到成功！获得 ${result.data?.points} 算力`);
                      refreshUser();
                    }
                  } else {
                    showToast('error', result.error || '签到失败');
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 rounded-full border border-emerald-500/20 cursor-pointer hover:bg-emerald-600/20 transition-colors"
              >
                <Gift className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">签到</span>
              </button>
            )}
            <div
              onClick={onShowComputeModal}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 rounded-full border border-indigo-500/20 cursor-pointer hover:bg-indigo-600/20 transition-colors"
            >
              <Zap className="w-4 h-4 text-indigo-400" />
              <motion.span
                key={user.compute_points}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="text-xs font-bold text-indigo-400"
              >
                {user.compute_points}
              </motion.span>
              <span className="text-[10px] text-slate-500">算力</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-[#1c1f26] rounded-full border border-[#2a2e38]">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}
              <span className="text-xs font-bold text-white">{user.nickname || user.email}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 font-medium">
                {planName}
              </span>
            </div>
          </>
        )}
        <span className="text-xs font-bold text-slate-500">
          V2.0
        </span>
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
  aspectRatio,
  setAspectRatio,
  quality,
  setQuality,
  showToast,
  setPreviewImage
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
  aspectRatio: string,
  setAspectRatio: (r: string) => void,
  quality: string,
  setQuality: (q: string) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
  setPreviewImage: (img: string | null) => void
}) => {
  const { user, refreshUser } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [thumbnailSize, setThumbnailSize] = useState(150);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取用户订阅信息以确定可用的画质选项
  useEffect(() => {
    if (!user) return;
    getUserSubscription().then(res => {
      if (res.success && res.data) {
        setSubscription(res.data);
        // 如果当前画质不在订阅的qualities中，切换到最高可用画质
        const availableQualities = res.data.qualities || ['1K', '2K'];
        if (!availableQualities.includes(quality)) {
          setQuality(availableQualities[availableQualities.length - 1]);
        }
      } else {
        setSubscription(null);
        // 免费用户只能使用1K和2K
        if (quality === '4K') {
          setQuality('2K');
        }
      }
    });
  }, [user, quality, setQuality]);

  // 当模型变化时，检查比例是否支持，不支持则重置
  useEffect(() => {
    const proRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'];
    if (model === '🍌全能图片PRO' && !proRatios.includes(aspectRatio)) {
      setAspectRatio('1:1');
    }
  }, [model, aspectRatio, setAspectRatio]);

  useEffect(() => {
    getGenerationHistoryByTypeAsync(activeMenuItem).then(setGenerationHistory);
  }, [activeMenuItem, historyRefreshKey]);

  // Ctrl+V paste to add image or text to canvas
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // First check for image
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setIsUploading(true);
            try {
              const base64 = await blobToBase64(file);
              const base64Url = `data:${file.type};base64,${base64}`;
              setImageUrls([base64Url]);

              // Auto-detect aspect ratio from image dimensions
              if (aspectRatio === 'auto') {
                const dims = await getImageDimensions(base64Url);
                if (dims) {
                  const closest = getClosestAspectRatio(dims.width, dims.height);
                  setAspectRatio(closest);
                  showToast('success', `已自动选择比例 ${closest}`);
                }
              } else {
                showToast('success', '图片已粘贴');
              }
            } catch (error) {
              showToast('error', `粘贴失败: ${error instanceof Error ? error.message : '未知错误'}`);
            } finally {
              setIsUploading(false);
            }
          }
          return;
        }
      }

      // Then check for text - add to prompt
      const text = e.clipboardData?.getData('text');
      if (text) {
        e.preventDefault();
        setPrompt(prev => prev ? `${prev}\n${text}` : text);
        showToast('info', '文本已添加到提示词');
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showToast, aspectRatio]);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const models = ['🍌全能图片V2', '🍌全能图片PRO'];

  // 获取当前菜单对应的预设
  const filteredPresets = getPresetsForMenu(activeMenuItem);

  // 获取当前菜单的提示词 placeholder
  const promptPlaceholder = getPromptPlaceholder(activeMenuItem);

  // 当 activeMenuItem 变化时，自动切换到该菜单第一个预设（如果当前预设不适用）
  useEffect(() => {
    if (!filteredPresets.find(p => p.label === selectedPreset)) {
      setSelectedPreset(filteredPresets[0]?.label || '');
    }
  }, [activeMenuItem, filteredPresets, selectedPreset, setSelectedPreset]);

  // 将 Blob 转换为 base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          if (!result || !result.includes(',')) {
            reject(new Error('图片格式转换失败'));
            return;
          }
          resolve(result.split(',')[1]);
        } catch (e) {
          reject(new Error('图片数据处理失败'));
        }
      };
      reader.onerror = () => reject(new Error('图片读取失败，请尝试重新上传'));
      reader.readAsDataURL(blob);
    });
  };

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

    // 检查算力值
    const selectedModel = model;
    const requiredPoints = getComputePointsCost(selectedModel, quality);

    if (!user) {
      showToast('error', '请先登录');
      return;
    }

    if (user.compute_points < requiredPoints) {
      showToast('error', `算力值不足，需要 ${requiredPoints} 点，当前仅有 ${user.compute_points} 点`);
      return;
    }

    // 获取内置提示词
    const menuItem = menuItemsConfig.find(item => item.id === activeMenuItem);
    const builtInPrompt = menuItem?.prompt || '';

    // 获取视觉预设提示词
    const presetItem = filteredPresets.find(p => p.label === selectedPreset);
    const presetPrompt = presetItem?.prompt || '';

    // 拼接提示词：内置提示词 + 视觉预设提示词 + 用户输入的自定义提示词
    let promptParts = [];
    if (builtInPrompt) promptParts.push(builtInPrompt);
    if (presetPrompt) promptParts.push(presetPrompt);
    if (prompt.trim()) promptParts.push(prompt.trim());

    const finalPrompt = promptParts.join('，');

    if (!finalPrompt.trim()) {
      showToast('error', '请输入提示词');
      return;
    }

    // 先扣除算力值，再开始生成
    const deductResult = await deductComputePoints(requiredPoints, '生成图片消耗', model, getMenuItemLabel(activeMenuItem));
    if (!deductResult.success) {
      showToast('error', deductResult.error || '算力值不足，扣除失败');
      return;
    }
    let deducted = true;
    await refreshUser();
    setIsGenerating(true);
    try {
      const selectedModel = model;
      const modelMap: Record<string, string> = {
        '🍌全能图片V2': 'gemini-3.1-flash-image-preview',
        '🍌全能图片PRO': 'gemini-3-pro-image-preview'
      };
      const apiModel = modelMap[selectedModel] || 'gemini-2.5-flash-image-preview';
      const apiUrl = `https://newapi.asia/v1beta/models/${apiModel}:generateContent`;

      // 构建请求体 (Gemini API 格式)
      let requestBody: GenerateContentRequest | undefined;
      let hasValidImages = false;

      if (imageUrls.length > 0) {
        // 图生图模式
        const parts = [];
        for (const imgUrl of imageUrls) {
          try {
            const imgResponse = await fetch(imgUrl);
            if (!imgResponse.ok) {
              console.warn('图片加载失败，跳过:', imgUrl);
              continue;
            }
            const blob = await imgResponse.blob();
            const base64 = await blobToBase64(blob);
            parts.push({
              inline_data: {
                mime_type: blob.type || 'image/jpeg',
                data: base64
              }
            });
            hasValidImages = true;
          } catch (e) {
            console.warn('图片加载失败，跳过:', imgUrl);
          }
        }
        if (hasValidImages && parts.length > 0) {
          parts.push({ text: finalPrompt });
          requestBody = {
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                ...(aspectRatio !== 'auto' && { aspectRatio: aspectRatio }),
                imageSize: quality
              }
            }
          };
        }
      }

      // 如果没有有效图片，使用文生图模式
      if (!requestBody) {
        requestBody = {
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              ...(aspectRatio !== 'auto' && { aspectRatio: aspectRatio }),
              imageSize: quality
            }
          }
        };
      }

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800000); // 800秒超时

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        let errorMsg;
        if (status === 401 || status === 403) {
          errorMsg = 'API 密钥无效或余额不足';
        } else if (status === 429) {
          errorMsg = '请求过于频繁，请稍后再试';
        } else if (status >= 500) {
          errorMsg = `服务器繁忙 (${status})，请稍后再试`;
        } else {
          errorMsg = err.error?.message || `请求失败 (${status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('API 响应:', JSON.stringify(data, null, 2));

      if (data.error) {
        throw new Error(data.error.message || 'API 返回错误');
      }

      if (!data.candidates || data.candidates.length === 0) {
        console.log('响应结构:', Object.keys(data));
        throw new Error('未收到有效响应');
      }

      // 从 Gemini API 响应中提取图片
      const parts = data.candidates?.[0]?.content?.parts || [];
      let imageUrl = '';
      for (const part of parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) {
        throw new Error('响应中未找到图片');
      }

      setResult(imageUrl);

      // 生成成功后清除上传的参考图，防止下次生成时被误用
      setImageUrls([]);

      // 获取分辨率信息
      const resolution = aspectRatio !== 'auto' ? getResolution(aspectRatio, quality) : null;

      const record: GenerationRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: activeMenuItem,
        prompt: prompt,
        imageUrl: imageUrl,
        referenceImageUrl: imageUrls[0] || undefined,
        createdAt: new Date().toISOString(),
        resolution: {
          width: resolution?.width || 0,
          height: resolution?.height || 0,
          quality: quality,
          aspectRatio: aspectRatio,
        },
      };
      await saveGenerationRecord(record);
      setHistoryRefreshKey(k => k + 1);

      showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！已消耗 ${requiredPoints} 点算力`);
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const isTimeout = errorMessage === 'signal is aborted without reason' || errorMessage.includes('aborted');
      if (isTimeout) {
        showToast('error', '请求超时（2分钟），可能是网络问题');
      } else {
        showToast('error', `生成失败: ${errorMessage}`);
      }
      // 生成失败，退还算力
      if (deducted) {
        const refundResult = await refundComputePoints(isTimeout ? '请求超时退款' : '生成失败退款');
        if (refundResult.success) {
          showToast('info', '算力已退还');
          await refreshUser();
        }
        deducted = false;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearResult = () => {
    setResult(null);
    setImageUrls([]);
    showToast('info', '已清除生成结果');
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleViewAll = () => {
    getGenerationHistoryAsync().then(history => {
      if (history.length === 0) {
        showToast('info', '暂无历史记录');
        return;
      }
      showToast('info', `共 ${history.length} 条历史记录`);
    });
  };

  const handleClearHistory = () => {
    clearGenerationHistory(activeMenuItem);
    setGenerationHistory([]);
    showToast('info', `已清除 ${getMenuItemLabel(activeMenuItem)} 的历史记录`);
  };

  const handleDownloadHistory = async (record: GenerationRecord) => {
    try {
      const response = await fetch(record.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.type}-${record.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('success', '图片下载开始');
    } catch {
      showToast('error', '下载失败');
    }
  };

  const handleCopyHistoryUrl = async (record: GenerationRecord) => {
    try {
      await navigator.clipboard.writeText(record.imageUrl);
      showToast('success', '图片链接已复制');
    } catch {
      showToast('error', '复制失败');
    }
  };

  const handleDeleteHistory = (id: string) => {
    deleteGenerationRecord(id);
    setGenerationHistory(prev => prev.filter(h => h.id !== id));
    showToast('info', '已删除');
  };

  const handleItemClick = (record: GenerationRecord) => {
    setPrompt(record.prompt);
    if (record.referenceImageUrl) {
      setImageUrls([record.referenceImageUrl]);
    }
    setResult(record.imageUrl);
    showToast('info', '已加载历史图片和参考图');
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!apiKey) {
      showToast('error', '请先在设置中配置 API 密钥');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('error', '不支持的文件类型，仅支持 JPG, PNG, WEBP');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast('error', '文件大小超过 20MB 限制');
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await blobToBase64(file);
      const base64Url = `data:${file.type};base64,${base64}`;
      setImageUrls([base64Url]);

      // Auto-detect aspect ratio from image dimensions
      if (aspectRatio === 'auto') {
        const dims = await getImageDimensions(base64Url);
        if (dims) {
          const closest = getClosestAspectRatio(dims.width, dims.height);
          setAspectRatio(closest);
          showToast('success', `已自动选择比例 ${closest}`);
        }
      } else {
        showToast('success', '参考图片已添加');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error instanceof Error ? error.message : '未知错误';
      showToast('error', `上传失败: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-row flex-1 overflow-hidden w-full h-full" style={{ display: 'flex', flexDirection: 'row' }}>
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 mr-80 custom-scrollbar h-full" style={{ flex: 1, maxWidth: 'calc(100vw - 320px)' }}>
        <div className="max-w-5xl mx-auto">
          {/* Current Action Indicator */}
          <div className="mb-4 flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-600/10 rounded-xl flex items-center gap-2 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">{getMenuItemLabel(activeMenuItem)}</span>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </div>
            )}
          </div>

          {/* Result Area */}
          {result && imageUrls.length > 0 ? (
            /* Comparison Mode: Slider Overlay */
            <div className="mb-6">
              <div
                className="aspect-video rounded-xl overflow-hidden bg-[#1c1f26] relative group shadow-xl shadow-black/20 select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  setSliderPosition(Math.max(0, Math.min(100, x)));
                }}
              >
                {/* Reference Image (Bottom) */}
                <img
                  src={imageUrls[0]}
                  alt="Reference"
                  className="absolute inset-0 w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                {/* Result Image (Top, clipped) */}
                <div
                  className="absolute inset-0 w-full h-full overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={result}
                    alt="Generated Result"
                    className="absolute inset-0 w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                {/* Slider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-lg"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </div>
                </div>
                {/* Labels */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">原图</div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-500/80 text-white text-xs rounded-full">生成图</div>
              </div>
            </div>
          ) : result ? (
            /* Single Result Display */
            <div className="mb-6">
              <div className="aspect-video rounded-xl overflow-hidden bg-[#1c1f26] relative group shadow-xl shadow-black/20">
                <img
                  src={result}
                  alt="Generated Result"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : imageUrls.length > 0 ? (
            /* Reference Image Display */
            <>
              <div
                className={`aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 ${
                  isDragging ? 'border-indigo-500 bg-[#1c1f26]' : 'border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUpload}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                {isUploading ? (
                  <>
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-slate-500 text-sm">上传中...</p>
                  </>
                ) : (
                  <>
                    <img
                      src={imageUrls[0]}
                      alt="参考图"
                      className="w-full h-full object-contain"
                      onClick={handleUpload}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageUrls([]); }}
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Upload Prompt */
            <div
              className={`aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 ${
                isDragging ? 'border-indigo-500 bg-[#1c1f26]' : 'border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUpload}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="w-12 h-12 bg-[#111317] rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">点击或拖拽图片上传</h3>
              <p className="text-slate-500 text-xs">支持 JPG, PNG, WEBP</p>
            </div>
          )}

          {/* Result Actions */}
          {(result || imageUrls.length > 0) && (
            <div className="flex justify-end gap-2 mb-4">
              {result && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors"
                  title="分享"
                >
                  <Share2 className="w-4 h-4" />
                  分享
                </button>
              )}
              <button
                onClick={handleClearResult}
                className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-rose-500/20 text-rose-400 text-sm rounded-lg transition-colors"
                title="清除"
              >
                <Trash2 className="w-4 h-4" />
                {result ? '清除结果' : '清除参考图'}
              </button>
            </div>
          )}

          {/* Recent Generations */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white">{getMenuItemLabel(activeMenuItem)} <span className="text-slate-500 font-normal text-xs ml-2">历史记录</span></h2>
                {generationHistory.length > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded-full">{generationHistory.length}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {generationHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">缩略图</span>
                    <input
                      type="range"
                      min="60"
                      max="300"
                      value={thumbnailSize}
                      onChange={(e) => setThumbnailSize(Number(e.target.value))}
                      className="w-20 h-1 bg-[#2a2e38] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-slate-500 text-xs">{thumbnailSize}px</span>
                  </div>
                )}
                {generationHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-rose-400 text-xs font-medium hover:text-rose-300 transition-colors"
                  >
                    清除记录
                  </button>
                )}
                <button
                  onClick={handleViewAll}
                  className="text-indigo-400 text-xs font-medium hover:text-indigo-300 transition-colors"
                >
                  {generationHistory.length > 0 ? `查看全部 ${generationHistory.length}` : '暂无记录'}
                </button>
              </div>
            </div>
            {generationHistory.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {generationHistory.slice(0, 6).map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-lg overflow-hidden bg-[#1c1f26] relative group cursor-pointer shrink-0"
                    style={{ width: thumbnailSize, height: thumbnailSize }}
                    onClick={() => handleItemClick(record)}
                  >
                    <img 
                      src={record.imageUrl} 
                      alt={record.prompt} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-[10px] text-white font-medium truncate">{record.prompt || '无描述'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {record.resolution && (
                          <span className="ml-1 text-indigo-400">{record.resolution.width > 0 ? `${record.resolution.width}×${record.resolution.height} ` : ''}{record.resolution.quality}</span>
                        )}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPrompt(record.prompt); if (record.referenceImageUrl) { setImageUrls([record.referenceImageUrl]); showToast('success', '已复用提示词和参考图'); } else { showToast('success', '已复用提示词'); } }}
                          className="p-1.5 bg-white/10 rounded hover:bg-indigo-500/50 transition-colors"
                          title="复用"
                        >
                          <RotateCcw className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(record.imageUrl); }}
                          className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors"
                          title="放大"
                        >
                          <Maximize2 className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadHistory(record); }}
                          className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors"
                          title="下载"
                        >
                          <Download className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }}
                          className="p-1.5 bg-white/10 rounded hover:bg-rose-500/50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 rounded-xl">
                <p className="text-slate-500 text-xs">暂无历史记录</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Fixed position on right edge */}
        <aside className="w-80 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-4 overflow-y-auto custom-scrollbar shrink-0 fixed right-0 top-16 h-[calc(100vh-4rem)] z-30">
          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">引擎与模型</p>
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

          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">效果预设</p>
            <div className="grid grid-cols-2 gap-3">
              {filteredPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.label)}
                  className={`aspect-video rounded-lg overflow-hidden relative group border-2 transition-all ${
                    selectedPreset === preset.label ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  {preset.bgImage ? (
                    <img
                      src={preset.bgImage}
                      alt={preset.label}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#111317] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">{preset.label}</span>
                  {selectedPreset === preset.label && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-[#2a2e38]">
            <div className="mb-4">
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">图像比例</p>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-[#111317] border border-[#2a2e38] rounded-lg py-2 px-3 text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="auto">自动</option>
                    {model === '🍌全能图片V2' ? (
                      ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(ratio => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                      ))
                    ) : (
                      ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(ratio => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">画质</p>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full bg-[#111317] border border-[#2a2e38] rounded-lg py-2 px-3 text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    {(subscription?.qualities || ['1K', '2K']).map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#111317] rounded-xl p-4 mb-4">
              <textarea
                placeholder={promptPlaceholder}
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
              {isGenerating ? '生成中...' : `立即生成 (-${getComputePointsCost(model, quality)} 算力)`}
            </button>
          </div>
        </aside>
      </div>
    </div>
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

const WelcomeView = ({ showToast }: { showToast: (type: 'success' | 'error' | 'info', message: string) => void }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const { login, register, sendVerificationCode } = useAuth();

  useEffect(() => {
    // 获取注册开关状态
    const loadSettings = async () => {
      try {
        const result = await getRegistrationStatus();
        if (result?.success && result.data?.registration_enabled !== undefined) {
          setRegistrationEnabled(result.data.registration_enabled);
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast('error', '请输入有效的邮箱地址');
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await sendVerificationCode(email);
      if (result.success) {
        showToast('success', '验证码已发送到您的邮箱');
        setCountdown(60);
      } else {
        showToast('error', result.error || '发送验证码失败');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'register') {
      if (!nickname.trim()) {
        showToast('error', '请输入昵称');
        return;
      }
      if (!verificationCode.trim()) {
        showToast('error', '请输入验证码');
        return;
      }
      if (password.length < 6) {
        showToast('error', '密码长度至少为 6 位');
        return;
      }
      if (password !== confirmPassword) {
        showToast('error', '两次输入的密码不一致');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        showToast('error', '请输入邮箱和密码');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (!result.success) {
          showToast('error', result.error || '登录失败');
        }
      } else {
        const result = await register(email, password, nickname, verificationCode);
        if (!result.success) {
          showToast('error', result.error || '注册失败');
        } else {
          showToast('success', '注册成功');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111317] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-600/30">
            <Zap className="text-white w-8 h-8 fill-current" />
          </div>
          <h1 className="text-4xl font-black font-headline text-white tracking-tight mb-3">MIDNIGHT ATELIER <span className="text-indigo-400">V2.0</span></h1>
          <p className="text-slate-400">AI 赋能的设计工作台</p>
        </div>

        <div className="bg-[#1c1f26] rounded-2xl p-8 border border-white/5 shadow-2xl">
          <div className="flex gap-2 p-1 bg-[#111317] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              登录
            </button>
            {registrationEnabled && (
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                注册
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && registrationEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="您的昵称"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            {mode === 'register' && registrationEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">邮箱验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="输入验证码"
                    className="flex-1 bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode || countdown > 0}
                    className="px-4 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-indigo-400 disabled:text-slate-500 rounded-lg font-bold transition-all whitespace-nowrap text-sm"
                  >
                    {isSendingCode ? '发送中...' : countdown > 0 ? `${countdown}秒` : '发送验证码'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 pr-12 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && registrationEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">确认密码</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
              {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          继续即表示您同意我们的服务条款
        </p>
      </motion.div>
    </div>
  );
};

const SettingsView = ({
  showToast,
}: {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
}) => {
  const { user, updateProfile, updatePassword, logout } = useAuth();
  const [profile, setProfile] = useState({ nickname: user?.nickname || '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [logs, setLogs] = useState<ComputePointLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'info' | 'logs'>('info');
  const [logFilter, setLogFilter] = useState({ type: '', start_date: '', end_date: '' });

  useEffect(() => {
    if (user) {
      setProfile({ nickname: user.nickname || '' });
    }
  }, [user]);

  useEffect(() => {
    if (settingsTab === 'logs') {
      loadLogs();
    }
  }, [settingsTab, logsPage]);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const result = await getComputePointLogs({
        type: logFilter.type || undefined,
        start_date: logFilter.start_date || undefined,
        end_date: logFilter.end_date || undefined,
        limit: 20,
        offset: logsPage * 20,
      });
      if (result.success && result.data) {
        setLogs(result.data.logs);
        setLogsTotal(result.data.total);
      }
    } catch (error) {
      console.error('Load logs error:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveProfile = async () => {
    const result = await updateProfile({ nickname: profile.nickname.trim() });
    if (result.success) {
      showToast('success', '个人资料已更新');
    } else {
      showToast('error', result.error || '更新失败');
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new.length < 6) {
      showToast('error', '新密码长度至少为 6 位');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      showToast('error', '两次输入的新密码不一致');
      return;
    }
    const result = await updatePassword(passwords.current, passwords.new);
    if (result.success) {
      showToast('success', '密码已修改，请重新登录');
      setPasswords({ current: '', new: '', confirm: '' });
      await logout();
    } else {
      showToast('error', result.error || '修改失败');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">个人中心</h1>
          <p className="text-slate-400">管理您的账户资料、算力值与安全选项。</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-[#1c1f26] rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setSettingsTab('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              settingsTab === 'info' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            个人资料
          </button>
          <button
            onClick={() => setSettingsTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              settingsTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            算力记录
          </button>
        </div>

        {/* Personal Info Tab */}
        {settingsTab === 'info' && (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <User className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold font-headline text-white">个人资料</h2>
              </div>
              <div className="bg-[#1c1f26] rounded-2xl p-6 space-y-5 border border-white/5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">昵称</label>
                  <input
                    type="text"
                    value={profile.nickname}
                    onChange={(e) => setProfile(p => ({ ...p, nickname: e.target.value }))}
                    placeholder="您的昵称"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">邮箱</label>
                  <div className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-slate-400">
                    {user?.email}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">当前算力值</p>
                    </div>
                    <div className="text-xl font-black text-indigo-400">{user?.compute_points || 0}</div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-emerald-600/10 rounded-xl border border-emerald-500/20">
                    <Package className="w-5 h-5 text-emerald-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">当前套餐</p>
                    </div>
                    <div className="text-sm font-bold text-emerald-400">free版</div>
                  </div>
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold transition-all"
                >
                  保存资料
                </button>
              </div>
            </section>

            {/* 修改密码 */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <LogOut className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold font-headline text-white">安全</h2>
              </div>
              <div className="bg-[#1c1f26] rounded-2xl p-6 space-y-5 border border-white/5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">当前密码</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                    placeholder="当前密码"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white/80">新密码</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                      placeholder="至少 6 位"
                      className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white/80">确认新密码</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="再次输入新密码"
                      className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleChangePassword}
                  className="w-full bg-[#2a2e38] hover:bg-slate-600 text-white py-2.5 rounded-lg font-bold transition-all"
                >
                  修改密码
                </button>
              </div>
            </section>
          </>
        )}

        {/* Compute Logs Tab */}
        {settingsTab === 'logs' && (
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold font-headline text-white">算力记录</h2>
            </div>
            <div className="bg-[#1c1f26] rounded-2xl border border-white/5 overflow-hidden">
              {/* Filters */}
              <div className="p-4 border-b border-white/5 bg-[#0d0f14]">
                <div className="grid grid-cols-4 gap-3">
                  <select
                    value={logFilter.type}
                    onChange={(e) => setLogFilter(f => ({ ...f, type: e.target.value }))}
                    className="bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">全部类型</option>
                    <option value="gift">赠送</option>
                    <option value="compensation">补偿</option>
                    <option value="deduct">扣除</option>
                    <option value="clear">清空</option>
                    <option value="consume">消费</option>
                    <option value="sign_in">签到</option>
                    <option value="refund">退款</option>
                  </select>
                  <input
                    type="date"
                    placeholder="开始日期"
                    value={logFilter.start_date}
                    onChange={(e) => setLogFilter(f => ({ ...f, start_date: e.target.value }))}
                    className="bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      placeholder="结束日期"
                      value={logFilter.end_date}
                      onChange={(e) => setLogFilter(f => ({ ...f, end_date: e.target.value }))}
                      className="flex-1 bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      onClick={() => { setLogsPage(0); loadLogs(); }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shrink-0"
                    >
                      筛选
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#111317]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">时间</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">类型</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">变动</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#111317] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                          {new Date(log.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            log.type === 'gift' ? 'bg-green-600/20 text-green-400' :
                            log.type === 'compensation' ? 'bg-blue-600/20 text-blue-400' :
                            log.type === 'deduct' ? 'bg-orange-600/20 text-orange-400' :
                            log.type === 'clear' ? 'bg-red-600/20 text-red-400' :
                            log.type === 'sign_in' ? 'bg-emerald-600/20 text-emerald-400' :
                            log.type === 'refund' ? 'bg-cyan-600/20 text-cyan-400' :
                            'bg-purple-600/20 text-purple-400'
                          }`}>
                            {log.type === 'gift' ? '赠送' :
                             log.type === 'compensation' ? '补偿' :
                             log.type === 'deduct' ? '扣除' :
                             log.type === 'clear' ? '清空' :
                             log.type === 'sign_in' ? '签到' :
                             log.type === 'refund' ? '退款' : '消费'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {log.amount > 0 ? '+' : ''}{log.amount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{log.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && !isLoadingLogs && (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">暂无记录</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {logsTotal > 20 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => setLogsPage(p => Math.max(0, p - 1))}
                    disabled={logsPage === 0}
                    className="px-3 py-1.5 bg-[#111317] hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-slate-400">
                    第 {logsPage + 1} 页 / 共 {Math.ceil(logsTotal / 20)} 页
                  </span>
                  <button
                    onClick={() => setLogsPage(p => p + 1)}
                    disabled={(logsPage + 1) * 20 >= logsTotal}
                    className="px-3 py-1.5 bg-[#111317] hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};



// --- Compute Plans Modal ---
const computePlans = [
  {
    name: '入门版',
    price: '29',
    period: '月付',
    monthlyQuota: 1900,
    dailySignIn: 15,
    qualities: ['1K', '2K'],
    concurrency: 2,
    watermark: false,
    extras: []
  },
  {
    name: '基础版',
    price: '69',
    period: '月付',
    monthlyQuota: 5200,
    dailySignIn: 15,
    qualities: ['1K', '2K', '4K'],
    concurrency: 3,
    watermark: false,
    extras: []
  },
  {
    name: '高级版',
    price: '98',
    period: '月付',
    monthlyQuota: 7700,
    dailySignIn: 25,
    qualities: ['1K', '2K', '4K'],
    concurrency: 4,
    watermark: false,
    extras: []
  },
  {
    name: '年付入门版',
    price: '319',
    period: '年付',
    monthlyQuota: 1900,
    dailySignIn: 15,
    qualities: ['1K', '2K'],
    concurrency: 2,
    watermark: false,
    extras: []
  },
  {
    name: '年付基础版',
    price: '799',
    period: '年付',
    monthlyQuota: 7700,
    dailySignIn: 25,
    qualities: ['1K', '2K', '4K'],
    concurrency: 4,
    watermark: false,
    extras: ['无限画布(pro)', '助力AI学习成长1年']
  },
  {
    name: '年付高级版',
    price: '1199',
    period: '年付',
    monthlyQuota: 7700,
    dailySignIn: 25,
    qualities: ['1K', '2K', '4K'],
    concurrency: 4,
    watermark: false,
    extras: ['无限画布(vip)', '助力AI学习成长1年', '优先咨询服务']
  }
];

const ComputePlansModal = ({ onClose }: { onClose: () => void }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const filteredPlans = computePlans.filter(plan =>
    billingCycle === 'monthly' ? plan.period === '月付' : plan.period === '年付'
  );

  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#1c1f26] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      onClick={e => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-[#1c1f26] border-b border-[#2a2e38] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black font-headline text-white">算力套餐</h2>
            <p className="text-slate-400 text-sm mt-1">选择适合您的算力套餐，开启 AI 创作之旅</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#111317] hover:bg-[#2a2e38] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center">
          <div className="bg-[#111317] rounded-full p-1 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              年付
              <span className="text-[10px] bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">优惠</span>
            </button>
          </div>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-[#111317] rounded-xl p-5 border flex flex-col ${
              billingCycle === 'yearly' && plan.name.includes('高级版')
                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                : billingCycle === 'monthly' && plan.name === '高级版'
                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                : 'border-[#2a2e38] hover:border-slate-600'
            } transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              {billingCycle === 'yearly' && plan.name.includes('高级版') && (
                <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-full">推荐</span>
              )}
              {billingCycle === 'monthly' && plan.name === '高级版' && (
                <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-full">推荐</span>
              )}
            </div>
            <div className="mb-4">
              <span className="text-3xl font-black text-white">¥{plan.price}</span>
              <span className="text-slate-500 text-sm">/{plan.period}</span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300">每月赠送 <span className="text-white font-bold">{plan.monthlyQuota}</span> 积分</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-slate-300">每日签到 <span className="text-white font-bold">{plan.dailySignIn}</span> 积分</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300">支持 <span className="text-white font-bold">{plan.qualities.join('、')}</span> 画质</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300"><span className="text-white font-bold">{plan.concurrency}</span> 个并发</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300">高清无水印</span>
              </div>
            </div>
            {plan.extras.length > 0 && (
              <div className="mb-4 p-3 bg-indigo-600/10 rounded-lg">
                <p className="text-xs text-indigo-400 font-bold mb-1">额外权益</p>
                {plan.extras.map((extra, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-slate-300">
                    <Star className="w-3 h-3 text-indigo-400" />
                    {extra}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className={`w-full py-2.5 rounded-lg font-bold transition-all mt-auto ${
                (billingCycle === 'yearly' && plan.name.includes('高级版')) ||
                (billingCycle === 'monthly' && plan.name === '高级版')
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-[#2a2e38] hover:bg-slate-600 text-white'
              }`}
            >
              暂未开放
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  </motion.div>
  );
};

// --- Main App ---
export default function App() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [view, setView] = useState<View>('workspace');
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItemId>('workspace');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Workspace settings state
  const [model, setModel] = useState('🍌全能图片V2');
  const [selectedPreset, setSelectedPreset] = useState(getPresetsForMenu('workspace')[0]?.label || '');
  const [creativity, setCreativity] = useState(45);
  const [structure, setStructure] = useState(82);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [quality, setQuality] = useState('2K');

  // Gallery state
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('hot');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showComputeModal, setShowComputeModal] = useState(false);
  const [defaultApiKey, setDefaultApiKey] = useState<string>('');

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

  // 页面重新可见时刷新算力值
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#111317] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeView showToast={showToast} />;
  }

  const apiKey = user.api_key || defaultApiKey || '';

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
          onShowComputeModal={() => {
            refreshUser();
            setShowComputeModal(true);
          }}
          showToast={showToast}
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
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  quality={quality}
                  setQuality={setQuality}
                  showToast={showToast}
                  setPreviewImage={setPreviewImage}
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
                <SettingsView showToast={showToast} />
              )}
              {view === 'admin' && (
                <AdminPanel showToast={showToast} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="py-8 px-8 mr-80 border-t border-[#2a2e38] text-center text-slate-500 text-xs" style={{ maxWidth: 'calc(100vw - 320px)' }}>
          <p>© 2026 Atelier AI. 致力于用 AI 赋能每一位设计师。</p>
        </footer>
      </div>

      {/* Compute Plans Modal */}
      <AnimatePresence>
        {showComputeModal && (
          <ComputePlansModal onClose={() => setShowComputeModal(false)} />
        )}
      </AnimatePresence>

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
