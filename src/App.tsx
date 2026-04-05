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
  Bell,
  Upload,
  MoreVertical,
  Zap,
  ChevronDown,
  Eye,
  EyeOff,
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
  Sparkles,
  Shield,
  LogOut,
  Clock,
  CheckCircle,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BillingView from './BillingView';

// --- Types ---
type View = 'workspace' | 'gallery' | 'settings' | 'billing' | 'admin';
import type { MenuItemId } from './menuConfig';
import { visualPresetsConfig, type VisualPresetConfig } from './visualPresetConfig';
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
  createdAt: string;
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
  };
}

interface GenerateContentRequest {
  contents: ContentPart[];
  generationConfig?: GenerationConfig;
}

const MAX_HISTORY_PER_TYPE = 3;

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

// 根据公式 y = 500000x + 278 转换实际额度到展示额度
function displayQuota(actualQuota: number): string {
  return ((actualQuota - 278) / 500000).toFixed(2);
}

const MAX_GALLERY_ITEMS = 10;

// Local storage fallback for gallery is being phased out in favor of backend DB.
// Some functions below are kept temporarily to avoid breaking other components that might still depend on them.
function getGalleryItems(): GalleryItem[] {
  const items = localStorage.getItem('atelier_gallery_items');
  return items ? JSON.parse(items) : [];
}

function saveGalleryItem(item: GalleryItem): void {
  // Now actually handled by the backend. We'll leave this empty or minimal.
}

function deleteGalleryItem(id: string): void {
  // Handled by backend.
}

// 管理员相关函数 - 调用后端 API (使用 Bearer Token)
async function approveGalleryItemAPI(id: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/gallery/${id}/approve`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function rejectGalleryItemAPI(id: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/gallery/${id}/reject`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function getGenerationHistory(): GenerationRecord[] {
  const history = localStorage.getItem('atelier_generation_history');
  return history ? JSON.parse(history) : [];
}

async function saveGenerationRecord(record: GenerationRecord): Promise<void> {
  // IndexedDB 容量足够，直接存储完整记录（包括 base64 图片）
  await saveGenerationRecordToDB(record);
}

function getGenerationHistoryByType(type: MenuItemId): GenerationRecord[] {
  return [];
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
    db.close();
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
      const all = getAllRequest.result as GenerationRecord[];
      const sameType = all.filter(r => r.type === record.type).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      // 删除超出限制的旧记录
      sameType.slice(MAX_HISTORY_PER_TYPE - 1).forEach(r => store.delete(r.id));
      // 保存新记录
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    db.close();
  });
}

async function deleteGenerationRecordFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    db.close();
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
    db.close();
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
  presets: VisualPresetConfig[],
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
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">视觉预设</p>
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
                {['1K', '2K', '4K'].map(q => (
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
          {isGenerating ? '生成中...' : '立即生成'}
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
  userAvatar,
  userNickname,
  userQuota
}: {
  currentView: View,
  setView: (v: View) => void,
  activeMenuItem: MenuItemId,
  setActiveMenuItem: (id: MenuItemId) => void,
  setModel: (m: string) => void,
  userAvatar: string,
  userNickname: string,
  userQuota: number
}) => {
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
            <h1 className="text-sm font-bold text-white tracking-tight font-headline">MIDNIGHT ATELIER</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI WORKSPACE</p>
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

      <div className="mt-auto p-2 border-t border-[#2a2e38]">
        <button
          onClick={() => { setView('billing'); setActiveMenuItem('workspace' as MenuItemId); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${currentView === 'billing' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-[#2a2e38] hover:text-white'}`}
        >
          <CreditCard className="w-4 h-4" />
          <span className="text-sm font-medium">账单管理</span>
        </button>
        <div
          onClick={() => { setView('settings'); setActiveMenuItem('workspace' as MenuItemId); }}
          className="mt-2 p-3 bg-[#111317] rounded-xl flex items-center gap-3 group cursor-pointer hover:bg-[#2a2e38] transition-colors"
        >
          <img
            src={userAvatar || "https://picsum.photos/seed/artist/100/100"}
            alt="User"
            className="w-8 h-8 rounded-full border border-white/10"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{userNickname}</p>
            <p className="text-[10px] text-slate-500 truncate">
              额度: {displayQuota(userQuota).toLocaleString()}
            </p>
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
}: {
  currentView: View,
  setView: (v: View) => void,
}) => {
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
        </nav>
      </div>
      <div className="flex items-center">
        <span className="text-xs font-bold text-slate-500">
          V0.5
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
  openPublishModal,
  onGenerationComplete
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
  openPublishModal: (imageUrl: string, prompt: string) => void,
  onGenerationComplete?: () => void
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const presets = visualPresetsConfig;
  const models = ['🍌全能图片V2', '🍌全能图片PRO'];

  // 将 Blob 转换为 base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
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

    // 获取内置提示词
    const menuItem = menuItemsConfig.find(item => item.id === activeMenuItem);
    const builtInPrompt = menuItem?.prompt || '';

    // 获取视觉预设提示词
    const presetItem = visualPresetsConfig.find(p => p.label === selectedPreset);
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
          const resolution = aspectRatio === 'auto' ? null : getResolution(aspectRatio, quality);
          requestBody = {
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              ...(resolution && {
                imageConfig: {
                  aspectRatio: aspectRatio
                }
              })
            }
          };
        }
      }

      // 如果没有有效图片，使用文生图模式
      if (!requestBody) {
        const resolution = aspectRatio === 'auto' ? null : getResolution(aspectRatio, quality);
        requestBody = {
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            ...(resolution && {
              imageConfig: {
                aspectRatio: aspectRatio
              }
            })
          }
        };
      }

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时

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

      const record: GenerationRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: activeMenuItem,
        prompt: prompt,
        imageUrl: imageUrl,
        createdAt: new Date().toISOString()
      };
      await saveGenerationRecord(record);
      setHistoryRefreshKey(k => k + 1);

      showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！`);
      // 生图成功后刷新额度
      onGenerationComplete?.();
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

  const handlePublishHistoryItem = (record: GenerationRecord) => {
    openPublishModal(record.imageUrl, record.prompt);
  };

  const handleItemClick = (record: GenerationRecord) => {
    setResult(record.imageUrl);
    showToast('info', '已加载历史图片');
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
      showToast('success', '参考图片已添加');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublishToGallery = async () => {
    if (!result) {
      showToast('error', '请先生成图片');
      return;
    }
    if (!apiKey) {
      showToast('error', '请先登录后再发布');
      return;
    }
    openPublishModal(result, prompt);
  };

  return (
    <div className="flex flex-row flex-1 overflow-hidden w-full h-full" style={{ display: 'flex', flexDirection: 'row' }}>
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 mr-64 custom-scrollbar h-full" style={{ flex: 1, maxWidth: 'calc(100vw - 256px)' }}>
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
          {result ? (
            <div className="mb-6">
              <div className="aspect-video rounded-xl overflow-hidden bg-[#1c1f26] relative group shadow-xl shadow-black/20">
                <img
                  src={result.startsWith('/uploads') ? `${API_BASE_URL.replace('/api', '')}${result}` : result}
                  alt="Generated Result"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>
          ) : imageUrls.length > 0 ? (
            /* Reference Images Area */
            <div className="mb-6">
              <div
                className={`aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all relative overflow-hidden ${
                  isDragging ? 'border-indigo-500 bg-[#1c1f26]' : 'border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
            </div>
          ) : (
            /* Upload Area */
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
                  <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-slate-500 text-sm">上传中...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#111317] rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">点击或拖拽图片上传</h3>
                  <p className="text-slate-500 text-xs">支持 JPG, PNG, WEBP</p>
                </>
              )}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                {generationHistory.slice(0, 6).map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="aspect-square rounded-lg overflow-hidden bg-[#1c1f26] relative group cursor-pointer"
                    style={{ minHeight: '80px' }}
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
                      </p>
                      <div className="flex gap-1 mt-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadHistory(record); }}
                          className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors"
                          title="下载"
                        >
                          <Download className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePublishHistoryItem(record); }}
                          className="p-1.5 bg-indigo-500/20 rounded hover:bg-indigo-500/40 transition-colors"
                          title="发布到画廊"
                        >
                          <Globe className="w-3 h-3 text-indigo-400" />
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
              <div className="flex flex-col items-center justify-center py-6 bg-[#1c1f26]/30 rounded-xl border border-dashed border-[#2a2e38]">
                <p className="text-slate-500 text-xs">暂无历史记录</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Fixed position on right edge */}
        <aside className="w-64 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-4 overflow-y-auto custom-scrollbar shrink-0 fixed right-0 top-16 h-[calc(100vh-4rem)] z-30">
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
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">视觉预设</p>
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
                    {['1K', '2K', '4K'].map(q => (
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
              {isGenerating ? '生成中...' : '立即生成'}
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
  apiKey
}: {
  category: GalleryCategory,
  setCategory: (c: GalleryCategory) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
  apiKey: string
}) => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [likedItems, setLikedItems] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('atelier_liked_items');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const categories: { id: GalleryCategory; label: string }[] = [
    { id: 'hot', label: '热门推荐' },
    { id: 'latest', label: '最新发布' },
    { id: 'style', label: '风格流派' }
  ];

  useEffect(() => {
    fetchGalleryItems(true);
  }, [category]);

  // 保存点赞状态到 localStorage
  useEffect(() => {
    localStorage.setItem('atelier_liked_items', JSON.stringify([...likedItems]));
  }, [likedItems]);

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  const fetchGalleryItems = async (reset: boolean = false, currentOffset?: number) => {
    const newOffset = reset ? 0 : (currentOffset ?? offset);

    try {
      const response = await fetch(`${API_BASE_URL}/gallery?limit=20&offset=${newOffset}`);
      if (!response.ok) throw new Error('获取画廊数据失败');

      const data = await response.json();
      let items: GalleryItem[] = [];

      if (data.data && Array.isArray(data.data)) {
        items = data.data.map((item: Record<string, unknown>) => ({
          id: String(item.id || ''),
          author: String(item.author || '匿名用户'),
          authorAvatar: String(item.author_avatar || ''),
          imageUrl: String(item.image_url || ''),
          description: String(item.description || ''),
          type: (item.type as 'published' | 'pending') || 'pending',
          createdAt: String(item.created_at || new Date().toISOString())
        }));
      }

      // 根据分类排序
      if (category === 'latest') {
        items = items.reverse(); // 最新：反转顺序
      }

      if (reset) {
        setGalleryItems(items);
        setOffset(items.length);
      } else {
        setGalleryItems(prev => [...prev, ...items]);
        setOffset(newOffset + items.length);
      }

      setHasMore(items.length === 20);
    } catch (error) {
      console.error('Failed to fetch gallery items:', error);
      showToast('error', '加载画廊数据失败');
      if (reset) {
        setGalleryItems([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setOffset(0);
    fetchGalleryItems(true, 0);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      fetchGalleryItems(false);
    }
  };

  const handleItemClick = (item: GalleryItem) => {
    if (item.type !== 'pending') {
      setSelectedItem(item);
    }
  };

  const handleDownload = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    try {
      const fullUrl = imageUrl.startsWith('/uploads') ? `${API_BASE_URL.replace('/api', '')}${imageUrl}` : imageUrl;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atelier-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('success', '图片开始下载');
    } catch {
      showToast('error', '下载失败');
    }
  };

  const handleShare = async (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/gallery/${item.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('success', '链接已复制到剪贴板');
    } catch {
      showToast('info', '分享链接：' + shareUrl);
    }
  };

  const handleLike = (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    const isCurrentlyLiked = likedItems.has(item.id);
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      return newSet;
    });
    showToast(isCurrentlyLiked ? 'info' : 'success', isCurrentlyLiked ? '已取消点赞' : '已点赞');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}${url}`;
    }
    return url;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6 space-y-2">
          <h1 className="text-5xl font-black font-headline text-white tracking-tight">公共画廊</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">探索来自 Atelier 社区的最新创作。由 AI 策划，由艺术家精炼。</p>

          <div className="flex justify-center items-center gap-4 pt-4">
            <div className="flex justify-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); handleRefresh(); }}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    category === cat.id ? 'bg-indigo-600/10 text-indigo-400' : 'bg-[#1c1f26] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 bg-[#1c1f26] text-slate-500 hover:text-white rounded-full transition-colors"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400">加载中...</p>
          </div>
        ) : galleryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ImageIcon className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg mb-2">暂无作品</p>
            <p className="text-slate-600 text-sm">成为第一个发布作品的人！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {galleryItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleItemClick(item)}
                className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#1c1f26] relative group cursor-pointer shadow-2xl"
              >
                {failedImages.has(item.imageUrl) ? (
                  <div className="w-full h-full flex items-center justify-center bg-[#1c1f26]">
                    <ImageIcon className="w-12 h-12 text-slate-600" />
                  </div>
                ) : (
                  <img
                    src={getImageUrl(item.imageUrl)}
                    alt="Gallery"
                    onError={() => handleImageError(item.imageUrl)}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${item.type === 'pending' ? 'opacity-40 grayscale blur-sm' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                )}

                {item.type === 'pending' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <p className="font-bold text-white text-lg">审核中...</p>
                    <p className="text-slate-500 text-xs mt-2">预计 2 分钟内完成</p>
                  </div>
                ) : (
                  <>
                    {/* 点赞数 */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur">
                      <Heart className={`w-3 h-3 ${likedItems.has(item.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                      <span className="text-[10px] font-bold text-white">{likedItems.has(item.id) ? '已赞' : '点赞'}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden">
                          {item.authorAvatar ? (
                            <img src={item.authorAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{item.author}</p>
                          <p className="text-[10px] text-slate-500">{formatTime(item.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 italic line-clamp-2 leading-relaxed">"{item.description}"</p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={(e) => handleLike(e, item)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                            likedItems.has(item.id)
                              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${likedItems.has(item.id) ? 'fill-current' : ''}`} />
                          {likedItems.has(item.id) ? '已赞' : '点赞'}
                        </button>
                        <button
                          onClick={(e) => handleDownload(e, item.imageUrl)}
                          className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          下载
                        </button>
                        <button
                          onClick={(e) => handleShare(e, item)}
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
        )}

        {!isLoading && galleryItems.length > 0 && (
          <div className="mt-16 text-center">
            <button
              onClick={handleLoadMore}
              disabled={!hasMore || isLoadingMore}
              className={`bg-[#1c1f26] hover:bg-[#2a2e38] text-white px-10 py-3 rounded-full font-bold transition-all flex items-center gap-3 mx-auto border border-white/5 ${(!hasMore || isLoadingMore) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  加载中...
                </>
              ) : hasMore ? (
                <>
                  加载更多作品
                  <ChevronDown className="w-4 h-4" />
                </>
              ) : (
                '没有更多作品了'
              )}
            </button>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-8"
          onClick={() => setSelectedItem(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1c1f26] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">作品详情</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col md:flex-row">
                {/* 左侧图片 */}
                <div className="md:w-1/2 bg-black/20 flex items-center justify-center p-4">
                  <img
                    src={getImageUrl(selectedItem.imageUrl)}
                    alt="Gallery"
                    className="max-w-full max-h-[60vh] object-contain rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* 右侧信息 */}
                <div className="md:w-1/2 p-6 space-y-5">
                  {/* 作者信息 */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden">
                      {selectedItem.authorAvatar ? (
                        <img src={selectedItem.authorAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{selectedItem.author || '匿名用户'}</p>
                      <p className="text-xs text-slate-500">{formatTime(selectedItem.createdAt)}</p>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">描述</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selectedItem.description || '无描述'}</p>
                  </div>

                  {/* 提示词 */}
                  {'prompt' in selectedItem && selectedItem.prompt && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">使用的提示词</p>
                      <p className="text-sm text-slate-400 leading-relaxed bg-[#111317] rounded-lg p-3 italic">"{selectedItem.prompt}"</p>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLike(e, selectedItem); }}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                        likedItems.has(selectedItem.id)
                          ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${likedItems.has(selectedItem.id) ? 'fill-current' : ''}`} />
                      {likedItems.has(selectedItem.id) ? '已点赞' : '点赞'}
                    </button>
                    <button
                      onClick={(e) => handleDownload(e, selectedItem.imageUrl)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      下载图片
                    </button>
                    <button
                      onClick={(e) => handleShare(e, selectedItem)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      分享链接
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const WelcomeView = ({
  onComplete,
  showToast
}: {
  onComplete: (userData?: { id: string; nickname: string; avatar: string }) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}) => {
  const [step, setStep] = useState<'input-key' | 'register' | 'login'>('input-key');
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [existingUser, setExistingUser] = useState<{ id: string; nickname: string; avatar: string } | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', '图片大小不能超过 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatarPreview(result);
      };
      reader.onerror = () => {
        showToast('error', '头像上传失败');
      };
      reader.readAsDataURL(file);
    }
  };

  // 验证 API Key 并获取账号信息
  const handleVerifyKey = async () => {
    if (!userId.trim() || !authToken.trim()) {
      showToast('error', '请输入账户 ID 和授权令牌');
      return;
    }

    setIsValidating(true);
    try {
      // 调用登录接口
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId.trim(),
          authToken: authToken.trim()
        })
      });
      const loginResult = await loginResponse.json();

      if (loginResult.success && loginResult.data) {
        const user = loginResult.data;
        // 保存登录信息
        localStorage.setItem('atelier_user_id', user.userId || userId.trim());
        localStorage.setItem('atelier_auth_token', authToken.trim());
        localStorage.setItem('atelier_api_key', '');
        localStorage.setItem('atelier_nickname', user.nickname);
        localStorage.setItem('atelier_avatar', user.avatar || '');
        localStorage.setItem('atelier_quota', user.quota || 0);
        localStorage.setItem('atelier_initialized', 'true');

        showToast('success', '登录成功，请在设置中选择令牌');
        setTimeout(() => onComplete(user), 500);
      } else {
        throw new Error(loginResult.error || '登录失败');
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsValidating(false);
    }
  };

  // 注册新用户
  const handleRegister = async () => {
    if (!nickname.trim()) {
      showToast('error', '请输入昵称');
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          nickname: nickname.trim(),
          avatar: avatarPreview
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '注册失败');
      }

      const user = result.data;
      localStorage.setItem('atelier_api_key', apiKey.trim());
      localStorage.setItem('atelier_nickname', user.nickname);
      localStorage.setItem('atelier_avatar', user.avatar || '');
      localStorage.setItem('atelier_initialized', 'true');
      localStorage.setItem('atelier_user_id', user.id);

      showToast('success', '注册成功，正在进入...');
      setTimeout(() => onComplete(user), 500);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '注册失败，请检查 API 密钥后重试');
    } finally {
      setIsValidating(false);
    }
  };

  // 登录已有账号
  const handleLogin = () => {
    if (!existingUser) return;

    localStorage.setItem('atelier_api_key', apiKey.trim());
    localStorage.setItem('atelier_nickname', existingUser.nickname);
    localStorage.setItem('atelier_avatar', existingUser.avatar || '');
    localStorage.setItem('atelier_initialized', 'true');
    localStorage.setItem('atelier_user_id', existingUser.id);

    showToast('success', '欢迎回来，正在进入...');
    setTimeout(() => onComplete(existingUser), 500);
  };

  // 修改昵称后更新
  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      showToast('error', '请输入昵称');
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          avatar: avatarPreview
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '更新失败');
      }

      const user = result.data || { id: existingUser?.id, nickname: nickname.trim(), avatar: avatarPreview };
      localStorage.setItem('atelier_api_key', apiKey.trim());
      localStorage.setItem('atelier_nickname', nickname.trim());
      localStorage.setItem('atelier_avatar', avatarPreview);
      localStorage.setItem('atelier_initialized', 'true');
      localStorage.setItem('atelier_user_id', existingUser?.id || '');

      showToast('success', '资料已更新，正在进入...');
      setTimeout(() => onComplete(user), 500);
    } catch (error) {
      // 如果API更新失败，直接保存本地
      const user = { id: existingUser?.id || '', nickname: nickname.trim(), avatar: avatarPreview };
      localStorage.setItem('atelier_api_key', apiKey.trim());
      localStorage.setItem('atelier_nickname', nickname.trim());
      localStorage.setItem('atelier_avatar', avatarPreview);
      localStorage.setItem('atelier_initialized', 'true');
      localStorage.setItem('atelier_user_id', existingUser?.id || '');

      showToast('success', '资料已更新，正在进入...');
      setTimeout(() => onComplete(user), 500);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBack = () => {
    setStep('input-key');
    setExistingUser(null);
    setNickname('');
    setAvatarPreview('');
  };

  return (
    <div className="min-h-screen bg-[#111317] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-600/30">
            <Zap className="text-white w-8 h-8 fill-current" />
          </div>
          <h1 className="text-4xl font-black font-headline text-white tracking-tight mb-3">MIDNIGHT ATELIER</h1>
          <p className="text-slate-400">AI 赋能的设计工作台</p>
        </div>

        <div className="bg-[#1c1f26] rounded-2xl p-8 border border-white/5 shadow-2xl">
          {/* 步骤1: 输入账户信息 */}
          {step === 'input-key' && (
            <>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                登录 / 注册
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">账户 ID</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyKey()}
                    placeholder="输入您的账户 ID"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">授权令牌</label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyKey()}
                    placeholder="输入您的授权令牌"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    点击
                    <a
                      href="https://newapi.asia/console/personal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline mx-1"
                    >
                      个人设置
                    </a>
                    获取ID和令牌，令牌在安全设置中获取。
                  </p>
                </div>

                <div className="flex gap-3">
                  <a
                    href="https://newapi.asia/register?channel=c_dlerkk4t"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    注册账号
                  </a>
                  <button
                    onClick={handleVerifyKey}
                    disabled={isValidating}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        登录
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 步骤2: 注册新用户 */}
          {step === 'register' && (
            <>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                创建新账号
              </h2>
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group w-20 h-20">
                    <img
                      src={avatarPreview || "https://picsum.photos/seed/artist/100/100"}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div
                      className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-full"
                      onClick={handleAvatarClick}
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500">点击上传头像（可选）</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">昵称</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="您希望被如何称呼？"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 bg-[#2a2e38] hover:bg-[#333742] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" />
                    返回
                  </button>
                  <button
                    onClick={handleRegister}
                    disabled={isValidating}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        注册中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        创建账号
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 步骤3: 已有用户登录 */}
          {step === 'login' && existingUser && (
            <>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                欢迎回来
              </h2>
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                  <div className="relative group w-20 h-20">
                    <img
                      src={avatarPreview || "https://picsum.photos/seed/artist/100/100"}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/30"
                      referrerPolicy="no-referrer"
                    />
                    <div
                      className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-full"
                      onClick={handleAvatarClick}
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">{existingUser.nickname || '用户'}</p>
                    <p className="text-emerald-400 text-xs">已有账号</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">更新昵称（可选）</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="修改昵称..."
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 bg-[#2a2e38] hover:bg-[#333742] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" />
                    返回
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isValidating}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        进入工作台
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          继续即表示您同意我们的服务条款
        </p>
      </motion.div>
    </div>
  );
};

const SettingsView = ({
  apiKey,
  setApiKey,
  showToast,
  userAvatar,
  setUserAvatar,
  userNickname,
  setUserNickname,
  userQuota,
  setUserQuota,
  onLogout
}: {
  apiKey: string,
  setApiKey: (key: string) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
  userAvatar: string,
  setUserAvatar: (avatar: string) => void,
  userNickname: string,
  setUserNickname: (nickname: string) => void,
  userQuota: number,
  setUserQuota: (quota: number) => void,
  onLogout: () => void
}) => {
  const [avatarPreview, setAvatarPreview] = useState(userAvatar);
  const [tokenList, setTokenList] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('atelier_user_id') || '';

  // 自动加载令牌列表
  useEffect(() => {
    handleRefreshTokens();
  }, []);

  // 加载时从服务器获取最新用户信息（含头像）
  useEffect(() => {
    const uid = localStorage.getItem('atelier_user_id');
    const authToken = localStorage.getItem('atelier_auth_token');
    if (uid && authToken) {
      fetch(`${API_BASE_URL}/user/info`, {
        headers: {
          'new-api-user': uid,
          'Authorization': authToken
        }
      }).then(res => res.json()).then(result => {
        if (result.success && result.data) {
          if (result.data.avatar) {
            setUserAvatar(result.data.avatar);
          }
          if (result.data.nickname) {
            setUserNickname(result.data.nickname);
          }
        }
      }).catch(console.error);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('atelier_api_key');
    localStorage.removeItem('atelier_nickname');
    localStorage.removeItem('atelier_avatar');
    localStorage.removeItem('atelier_initialized');
    localStorage.removeItem('atelier_user_id');
    localStorage.removeItem('atelier_auth_token');
    setApiKey('');
    setUserNickname('');
    setUserAvatar('');
    onLogout();
    showToast('info', '已退出登录');
  };

  const handleRefreshTokens = async () => {
    const uid = localStorage.getItem('atelier_user_id');
    const authToken = localStorage.getItem('atelier_auth_token');

    if (!uid || !authToken) {
      setTokenError('请先登录');
      showToast('error', '请先登录');
      return;
    }

    setIsLoadingTokens(true);
    setTokenError('');

    try {
      const response = await fetch(`${API_BASE_URL}/tokens?p=0&size=50`, {
        method: 'GET',
        headers: {
          'new-api-user': uid,
          'Authorization': authToken
        }
      });

      const result = await response.json();

      if (result.success === false) {
        const errMsg = result.message || '获取令牌列表失败';
        setTokenError(errMsg);
        showToast('error', errMsg);
        setTokenList([]);
      } else {
        const data = result.data || {};
        const tokens = data.list || data.data || data.tokens || data.items || data;
        if (Array.isArray(tokens)) {
          setTokenList(tokens);
          if (tokens.length === 0) {
            setTokenError('暂无可用令牌');
          }
        } else {
          const errMsg = '获取令牌列表失败';
          setTokenError(errMsg);
          showToast('error', errMsg);
          setTokenList([]);
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '获取令牌列表失败';
      setTokenError(errMsg);
      showToast('error', errMsg);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleSelectToken = async (token: any) => {
    const tokenValue = token.key || token.token || token.api_key || '';
    if (!tokenValue) {
      showToast('error', '令牌格式无效');
      return;
    }

    setApiKey(tokenValue);
    localStorage.setItem('atelier_api_key', tokenValue);
    showToast('success', '令牌已选用');

    // 刷新额度
    const uid = localStorage.getItem('atelier_user_id');
    const authToken = localStorage.getItem('atelier_auth_token');
    if (uid && authToken) {
      try {
        const res = await fetch(`${API_BASE_URL}/user/info`, {
          headers: {
            'new-api-user': uid,
            'Authorization': authToken
          }
        });
        const result = await res.json();
        if (result.success && result.data) {
          const newQuota = result.data.quota || 0;
          setUserQuota(newQuota);
          localStorage.setItem('atelier_quota', newQuota);
        }
      } catch (e) {
        console.error('刷新额度失败', e);
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', '图片大小不能超过 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setAvatarPreview(result);

        // 自动保存头像 - 使用 userId 作为 API key（与登录流程一致）
        const uid = localStorage.getItem('atelier_user_id');
        const authToken = localStorage.getItem('atelier_auth_token');
        if (uid && authToken) {
          try {
            const response = await fetch(`${API_BASE_URL}/user/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${uid}`
              },
              body: JSON.stringify({ avatar: result })
            });
            const data = await response.json();
            if (data.success) {
              setUserAvatar(result);
              showToast('success', '头像已保存');
            } else {
              showToast('error', data.error || '保存头像失败');
            }
          } catch (err) {
            showToast('error', '保存头像失败');
          }
        } else {
          showToast('error', '请先登录');
        }
      };
      reader.onerror = () => {
        showToast('error', '头像上传失败');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">账户设置</h1>
          <p className="text-slate-400">管理您的个人资料、API 访问权限及偏好设置。</p>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">个人资料</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-6 space-y-6 border border-white/5">
            <div className="flex items-center gap-6">
              <div className="relative group shrink-0">
                <img
                  src={avatarPreview || userAvatar || "https://picsum.photos/seed/artist/100/100"}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleAvatarClick}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-medium flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {avatarPreview ? '更换头像' : '上传头像'}
                </button>
                <p className="text-xs text-slate-500">建议 400x400px，JPG/PNG/WebP，最大 5MB</p>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">用户ID</label>
                <div className="bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-slate-500 text-sm truncate">
                  {userId || '未登录'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">昵称</label>
                <div className="bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white text-sm truncate">
                  {userNickname}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI 额度</label>
                <button
                  onClick={() => {
                    const uid = localStorage.getItem('atelier_user_id');
                    const authToken = localStorage.getItem('atelier_auth_token');
                    if (uid && authToken) {
                      setIsLoadingTokens(true);
                      fetch(`${API_BASE_URL}/user/info`, {
                        headers: {
                          'new-api-user': uid,
                          'Authorization': authToken
                        }
                      }).then(res => res.json()).then(result => {
                        if (result.success && result.data) {
                          setUserQuota(result.data.quota || 0);
                        }
                      }).catch(console.error).finally(() => setIsLoadingTokens(false));
                    }
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTokens ? 'animate-spin' : ''}`} />
                  刷新
                </button>
              </div>
              <div className="bg-[#111317] border border-white/5 rounded-lg py-3 px-4 flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-medium">
                  {displayQuota(userQuota).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">令牌管理</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-6 space-y-4 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">令牌列表</label>
              <button
                onClick={handleRefreshTokens}
                disabled={isLoadingTokens}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingTokens ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>

            {tokenError && (
              <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <p className="text-rose-400 text-sm">{tokenError}</p>
              </div>
            )}

            {tokenList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {tokenList.map((token: any) => (
                  <div
                    key={token.id}
                    className={`w-full flex items-center p-3 rounded-lg border transition-all gap-3 ${
                      apiKey === (token.key || token.token || token.api_key)
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-[#111317] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {token.name || token.key?.substring(0, 20) + '...'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          apiKey === (token.key || token.token || token.api_key)
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : token.status === 1
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {apiKey === (token.key || token.token || token.api_key) ? '使用中' : (token.status === 1 ? '可用' : '禁用')}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1 font-mono truncate">
                        {token.key?.substring(0, 40)}...
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectToken(token)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        apiKey === (token.key || token.token || token.api_key)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#2a2e38] text-slate-300 hover:bg-[#333742]'
                      }`}
                    >
                      {apiKey === (token.key || token.token || token.api_key) ? '已选用' : '选用'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !isLoadingTokens && !tokenError && (
                <div className="text-center py-6 text-slate-500">
                  <Key className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无令牌</p>
                </div>
              )
            )}
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 text-rose-400 hover:text-rose-300 transition-colors font-medium flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
};



// --- Main App ---
export default function App() {
  const [view, setView] = useState<View>('workspace');
  const [apiKey, setApiKey] = useState(localStorage.getItem('atelier_api_key') || '');
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItemId>('workspace');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(!localStorage.getItem('atelier_initialized'));

  // Workspace settings state
  const [model, setModel] = useState('🍌全能图片V2');
  const [selectedPreset, setSelectedPreset] = useState(visualPresetsConfig[0].label);
  const [creativity, setCreativity] = useState(45);
  const [structure, setStructure] = useState(82);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [quality, setQuality] = useState('2K');
  
  // Gallery state
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('hot');

  // User profile state
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('atelier_avatar') || '');
  const [userNickname, setUserNickname] = useState(localStorage.getItem('atelier_nickname') || 'NightShade_Artist');
  const [userQuota, setUserQuota] = useState<number>(parseFloat(localStorage.getItem('atelier_quota') || '0'));

  // Publish modal state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishModalData, setPublishModalData] = useState<{ imageUrl: string; prompt: string } | null>(null);
  const [publishDescription, setPublishDescription] = useState('');

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 刷新用户额度
  const refreshUserQuota = useCallback(() => {
    const userId = localStorage.getItem('atelier_user_id');
    const authToken = localStorage.getItem('atelier_auth_token');
    if (userId && authToken) {
      fetch(`${API_BASE_URL}/user/info`, {
        headers: {
          'new-api-user': userId,
          'Authorization': authToken
        }
      }).then(res => res.json()).then(result => {
        if (result.success && result.data) {
          setUserQuota(result.data.quota || 0);
          localStorage.setItem('atelier_quota', result.data.quota || 0);
        }
      }).catch(console.error);
    }
  }, [setUserQuota]);

  const handleWelcomeComplete = useCallback((userData?: { id: string; nickname: string; avatar: string; quota?: number }) => {
    setApiKey(localStorage.getItem('atelier_api_key') || '');
    setUserNickname(userData?.nickname || localStorage.getItem('atelier_nickname') || 'NightShade_Artist');
    setUserAvatar(userData?.avatar || localStorage.getItem('atelier_avatar') || '');
    setUserQuota(userData?.quota || parseFloat(localStorage.getItem('atelier_quota') || '0'));
    setIsFirstVisit(false);
  }, [setUserAvatar, setUserNickname, setUserQuota]);

  const handleLogout = useCallback(() => {
    setApiKey('');
    setUserNickname('');
    setUserAvatar('');
    setIsFirstVisit(true);
    setView('workspace');
  }, [setUserAvatar, setUserNickname]);

  // Publish modal handlers
  const handleOpenPublishModal = useCallback((imageUrl: string, prompt: string) => {
    setPublishModalData({ imageUrl, prompt });
    setPublishDescription(prompt || '');
    setIsPublishModalOpen(true);
  }, []);

  const handleConfirmPublish = useCallback(async () => {
    if (!publishModalData || !publishModalData.imageUrl) {
      showToast('error', '发布数据异常');
      return;
    }

    const userId = localStorage.getItem('atelier_user_id');
    if (!userId) {
      showToast('error', '请先登录');
      return;
    }

    showToast('info', '正在上传图片...');

    try {
      const response = await fetch(`${API_BASE_URL}/gallery/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          description: publishDescription || publishModalData.prompt || '',
          imageBase64: publishModalData.imageUrl
        })
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      if (data.success) {
        showToast('success', '图片已发布到画廊！');
      } else {
        throw new Error(data.error || '上传失败');
      }
    } catch (error) {
      console.error('Publish error:', error);
      showToast('error', `发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    setIsPublishModalOpen(false);
    setPublishModalData(null);
    setPublishDescription('');
  }, [publishModalData, publishDescription, showToast]);

  const handleClosePublishModal = useCallback(() => {
    setIsPublishModalOpen(false);
    setPublishModalData(null);
    setPublishDescription('');
  }, []);

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

  if (isFirstVisit) {
    return <WelcomeView onComplete={handleWelcomeComplete} showToast={showToast} />;
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      <Sidebar
        currentView={view}
        setView={setView}
        activeMenuItem={activeMenuItem}
        setActiveMenuItem={setActiveMenuItem}
        setModel={setModel}
        userAvatar={userAvatar}
        userNickname={userNickname}
        userQuota={userQuota}
      />

      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <TopBar
          currentView={view}
          setView={setView}
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
                  openPublishModal={handleOpenPublishModal}
                  onGenerationComplete={refreshUserQuota}
                />
              )}
              {view === 'gallery' && (
                <GalleryView 
                  category={galleryCategory}
                  setCategory={setGalleryCategory}
                  showToast={showToast}
                  apiKey={apiKey}
                />
              )}
              {view === 'settings' && (
                <SettingsView
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  showToast={showToast}
                  userAvatar={userAvatar}
                  setUserAvatar={setUserAvatar}
                  userNickname={userNickname}
                  setUserNickname={setUserNickname}
                  userQuota={userQuota}
                  setUserQuota={setUserQuota}
                  onLogout={handleLogout}
                />
              )}
              {view === 'billing' && <BillingView showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="py-8 px-8 mr-64 border-t border-[#2a2e38] text-center text-slate-500 text-xs" style={{ maxWidth: 'calc(100vw - 256px)' }}>
          <p>© 2026 Atelier AI. 致力于用 AI 赋能每一位设计师。</p>
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

      {/* Publish Modal */}
      {isPublishModalOpen && publishModalData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-8"
          onClick={handleClosePublishModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1c1f26] rounded-2xl overflow-hidden max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                发布到画廊
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-[#111317]">
                <img
                  src={publishModalData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">描述（选填）</label>
                <textarea
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="为你的作品添加描述..."
                  className="w-full bg-[#111317] border border-white/5 rounded-xl py-3 px-4 text-white text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  rows={3}
                />
                <p className="text-xs text-slate-500">发布后将进入审核队列，待管理员批准后公开展示</p>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 flex gap-3">
              <button
                onClick={handleClosePublishModal}
                className="flex-1 py-2.5 bg-[#2a2e38] hover:bg-[#333742] text-white rounded-xl text-sm font-bold transition-all"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPublish}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                确认发布
              </button>
            </div>
          </motion.div>
        </motion.div>
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
