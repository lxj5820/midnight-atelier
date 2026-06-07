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
  MessageCircle,
  Wallet,
  BarChart3,
  Clock,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useApiKey } from './ApiKeyContext';
import { TokenQueryProvider, useTokenQuery } from './context/TokenQueryContext';
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
            <p className="text-xs font-bold text-white truncate">API配置</p>
            <p className="text-[10px] text-slate-500 truncate">设置API与资料</p>
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
  const { tokenInfo, loading, usedPercent, formatQuota } = useTokenQuery();
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

        {hasApiKey && tokenInfo && (
          <div
            onClick={() => setView('settings')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer hover:bg-white/[0.04] transition-colors bg-white/[0.02] border-white/[0.06]"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold tabular-nums text-emerald-400">
              {tokenInfo.unlimited_quota ? '∞' : formatQuota(tokenInfo.total_available)}
            </span>
            {!tokenInfo.unlimited_quota && (
              <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    usedPercent > 90 ? 'bg-rose-500' : usedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {hasApiKey && loading && !tokenInfo && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06]">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
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
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37" className="w-full h-auto"><path d="M0,0h7v1h-7zM11,0h2v1h-2zM15,0h3v1h-3zM20,0h2v1h-2zM23,0h1v1h-1zM25,0h2v1h-2zM28,0h1v1h-1zM30,0h7v1h-7zM0,1h1v1h-1zM6,1h1v1h-1zM9,1h2v1h-2zM12,1h2v1h-2zM16,1h3v1h-3zM26,1h2v1h-2zM30,1h1v1h-1zM36,1h1v1h-1zM0,2h1v1h-1zM2,2h3v1h-3zM6,2h1v1h-1zM8,2h3v1h-3zM12,2h1v1h-1zM14,2h1v1h-1zM19,2h1v1h-1zM21,2h3v1h-3zM30,2h1v1h-1zM32,2h3v1h-3zM36,2h1v1h-1zM0,3h1v1h-1zM2,3h3v1h-3zM6,3h1v1h-1zM8,3h3v1h-3zM13,3h1v1h-1zM17,3h1v1h-1zM22,3h2v1h-2zM25,3h1v1h-1zM27,3h1v1h-1zM30,3h1v1h-1zM32,3h3v1h-3zM36,3h1v1h-1zM0,4h1v1h-1zM2,4h3v1h-3zM6,4h1v1h-1zM8,4h1v1h-1zM10,4h1v1h-1zM12,4h1v1h-1zM17,4h4v1h-4zM23,4h1v1h-1zM26,4h1v1h-1zM28,4h1v1h-1zM30,4h1v1h-1zM32,4h3v1h-3zM36,4h1v1h-1zM0,5h1v1h-1zM6,5h1v1h-1zM8,5h1v1h-1zM10,5h5v1h-5zM16,5h2v1h-2zM20,5h3v1h-3zM27,5h2v1h-2zM30,5h1v1h-1zM36,5h1v1h-1zM0,6h7v1h-7zM8,6h1v1h-1zM10,6h1v1h-1zM12,6h1v1h-1zM14,6h1v1h-1zM16,6h1v1h-1zM18,6h1v1h-1zM20,6h1v1h-1zM22,6h1v1h-1zM24,6h1v1h-1zM26,6h1v1h-1zM28,6h1v1h-1zM30,6h7v1h-7zM8,7h2v1h-2zM11,7h1v1h-1zM14,7h1v1h-1zM21,7h2v1h-2zM24,7h1v1h-1zM0,8h1v1h-1zM2,8h5v1h-5zM10,8h1v1h-1zM12,8h4v1h-4zM17,8h1v1h-1zM19,8h2v1h-2zM23,8h2v1h-2zM26,8h2v1h-2zM30,8h5v1h-5zM0,9h3v1h-3zM4,9h1v1h-1zM7,9h2v1h-2zM11,9h1v1h-1zM13,9h1v1h-1zM15,9h6v1h-6zM22,9h2v1h-2zM28,9h1v1h-1zM30,9h2v1h-2zM33,9h3v1h-3zM0,10h1v1h-1zM4,10h1v1h-1zM6,10h2v1h-2zM10,10h1v1h-1zM12,10h1v1h-1zM14,10h1v1h-1zM18,10h1v1h-1zM20,10h2v1h-2zM24,10h4v1h-4zM29,10h4v1h-4zM35,10h2v1h-2zM0,11h1v1h-1zM2,11h1v1h-1zM5,11h1v1h-1zM7,11h1v1h-1zM9,11h2v1h-2zM12,11h1v1h-1zM16,11h1v1h-1zM21,11h1v1h-1zM23,11h2v1h-2zM28,11h3v1h-3zM32,11h1v1h-1zM36,11h1v1h-1zM1,12h3v1h-3zM6,12h1v1h-1zM10,12h3v1h-3zM17,12h2v1h-2zM22,12h1v1h-1zM24,12h3v1h-3zM29,12h8v1h-8zM1,13h1v1h-1zM3,13h1v1h-1zM5,13h1v1h-1zM7,13h1v1h-1zM12,13h1v1h-1zM14,13h3v1h-3zM18,13h3v1h-3zM22,13h2v1h-2zM25,13h1v1h-1zM28,13h1v1h-1zM31,13h1v1h-1zM36,13h1v1h-1zM0,14h3v1h-3zM4,14h3v1h-3zM8,14h1v1h-1zM11,14h1v1h-1zM13,14h6v1h-6zM20,14h3v1h-3zM26,14h2v1h-2zM31,14h3v1h-3zM35,14h2v1h-2zM0,15h2v1h-2zM5,15h1v1h-1zM8,15h1v1h-1zM11,15h1v1h-1zM13,15h2v1h-2zM16,15h1v1h-1zM19,15h4v1h-4zM26,15h2v1h-2zM31,15h2v1h-2zM35,15h2v1h-2zM0,16h2v1h-2zM5,16h2v1h-2zM8,16h4v1h-4zM14,16h4v1h-4zM20,16h1v1h-1zM22,16h1v1h-1zM25,16h2v1h-2zM29,16h2v1h-2zM32,16h1v1h-1zM34,16h1v1h-1zM4,17h1v1h-1zM7,17h1v1h-1zM13,17h3v1h-3zM17,17h5v1h-5zM23,17h1v1h-1zM25,17h1v1h-1zM27,17h2v1h-2zM30,17h2v1h-2zM33,17h3v1h-3zM2,18h3v1h-3zM6,18h2v1h-2zM9,18h5v1h-5zM15,18h3v1h-3zM20,18h3v1h-3zM24,18h5v1h-5zM30,18h2v1h-2zM35,18h2v1h-2zM1,19h1v1h-1zM3,19h2v1h-2zM7,19h1v1h-1zM11,19h2v1h-2zM15,19h1v1h-1zM19,19h5v1h-5zM26,19h1v1h-1zM29,19h1v1h-1zM31,19h1v1h-1zM36,19h1v1h-1zM0,20h4v1h-4zM6,20h1v1h-1zM8,20h3v1h-3zM15,20h2v1h-2zM19,20h2v1h-2zM24,20h7v1h-7zM32,20h2v1h-2zM0,21h2v1h-2zM5,21h1v1h-1zM12,21h2v1h-2zM16,21h2v1h-2zM19,21h3v1h-3zM23,21h1v1h-1zM25,21h2v1h-2zM28,21h1v1h-1zM33,21h1v1h-1zM0,22h1v1h-1zM3,22h4v1h-4zM11,22h1v1h-1zM14,22h2v1h-2zM17,22h1v1h-1zM20,22h1v1h-1zM22,22h1v1h-1zM24,22h5v1h-5zM31,22h3v1h-3zM35,22h2v1h-2zM0,23h1v1h-1zM2,23h1v1h-1zM4,23h2v1h-2zM7,23h2v1h-2zM10,23h1v1h-1zM12,23h3v1h-3zM19,23h3v1h-3zM23,23h1v1h-1zM27,23h1v1h-1zM31,23h2v1h-2zM35,23h2v1h-2zM1,24h2v1h-2zM4,24h1v1h-1zM6,24h8v1h-8zM15,24h1v1h-1zM17,24h1v1h-1zM19,24h2v1h-2zM22,24h1v1h-1zM24,24h3v1h-3zM29,24h2v1h-2zM34,24h1v1h-1zM0,25h1v1h-1zM2,25h1v1h-1zM4,25h2v1h-2zM7,25h3v1h-3zM12,25h1v1h-1zM15,25h4v1h-4zM20,25h1v1h-1zM22,25h2v1h-2zM25,25h1v1h-1zM28,25h1v1h-1zM31,25h1v1h-1zM33,25h1v1h-1zM0,26h1v1h-1zM2,26h1v1h-1zM4,26h5v1h-5zM10,26h1v1h-1zM13,26h2v1h-2zM18,26h1v1h-1zM20,26h1v1h-1zM22,26h1v1h-1zM27,26h1v1h-1zM29,26h1v1h-1zM31,26h6v1h-6zM0,27h1v1h-1zM2,27h1v1h-1zM4,27h1v1h-1zM7,27h2v1h-2zM11,27h1v1h-1zM13,27h1v1h-1zM16,27h1v1h-1zM20,27h2v1h-2zM23,27h1v1h-1zM28,27h1v1h-1zM31,27h1v1h-1zM35,27h2v1h-2zM0,28h1v1h-1zM2,28h2v1h-2zM6,28h2v1h-2zM9,28h2v1h-2zM13,28h1v1h-1zM17,28h1v1h-1zM19,28h1v1h-1zM22,28h13v1h-13zM36,28h1v1h-1zM8,29h2v1h-2zM13,29h4v1h-4zM19,29h1v1h-1zM21,29h1v1h-1zM23,29h1v1h-1zM25,29h1v1h-1zM27,29h2v1h-2zM32,29h2v1h-2zM35,29h1v1h-1zM0,30h7v1h-7zM10,30h2v1h-2zM14,30h2v1h-2zM24,30h3v1h-3zM28,30h1v1h-1zM30,30h1v1h-1zM32,30h1v1h-1zM34,30h3v1h-3zM0,31h1v1h-1zM6,31h1v1h-1zM8,31h3v1h-3zM12,31h3v1h-3zM18,31h4v1h-4zM23,31h1v1h-1zM28,31h1v1h-1zM32,31h2v1h-2zM0,32h1v1h-1zM2,32h3v1h-3zM6,32h1v1h-1zM8,32h2v1h-2zM12,32h2v1h-2zM15,32h1v1h-1zM17,32h1v1h-1zM19,32h1v1h-1zM22,32h2v1h-2zM26,32h7v1h-7zM34,32h2v1h-2zM0,33h1v1h-1zM2,33h3v1h-3zM6,33h1v1h-1zM8,33h1v1h-1zM13,33h1v1h-1zM15,33h1v1h-1zM18,33h4v1h-4zM23,33h2v1h-2zM26,33h1v1h-1zM29,33h2v1h-2zM32,33h5v1h-5zM0,34h1v1h-1zM2,34h3v1h-3zM6,34h1v1h-1zM8,34h2v1h-2zM11,34h1v1h-1zM13,34h1v1h-1zM15,34h2v1h-2zM18,34h1v1h-1zM20,34h1v1h-1zM25,34h1v1h-1zM29,34h1v1h-1zM33,34h1v1h-1zM35,34h2v1h-2zM0,35h1v1h-1zM6,35h1v1h-1zM9,35h2v1h-2zM15,35h2v1h-2zM19,35h4v1h-4zM27,35h2v1h-2zM32,35h1v1h-1zM36,35h1v1h-1zM0,36h7v1h-7zM8,36h1v1h-1zM10,36h4v1h-4zM15,36h1v1h-1zM19,36h1v1h-1zM22,36h1v1h-1zM24,36h2v1h-2zM30,36h1v1h-1zM32,36h5v1h-5z"/></svg>
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
          V3.1
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
  const { tokenInfo, logStats, loading: tokenLoading, error: tokenError, refresh: refreshToken, usedPercent, formatQuota, formatExpiresAt } = useTokenQuery();

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
                onClick={refreshToken}
                disabled={!hasApiKey || tokenLoading}
                className="btn-primary flex-1 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${tokenLoading ? 'animate-spin' : ''}`} />
                {tokenLoading ? '查询中...' : '刷新用量'}
              </button>
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

          {/* 令牌信息 */}
          {hasApiKey && (
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">令牌信息</h3>
                </div>
                {tokenInfo && (
                  <span className="text-xs text-slate-500">
                    {tokenInfo.name}
                  </span>
                )}
              </div>

              {tokenLoading && (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="ml-2 text-sm text-slate-400">加载中...</span>
                </div>
              )}

              {tokenError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-sm text-rose-400">{tokenError}</span>
                </div>
              )}

              {tokenInfo && !tokenLoading && (
                <>
                  {/* 额度概览 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <p className="text-[10px] text-slate-500 mb-1">总额度</p>
                      <p className="text-sm font-bold text-white tabular-nums">
                        {tokenInfo.unlimited_quota ? '∞' : formatQuota(tokenInfo.total_granted)}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <p className="text-[10px] text-slate-500 mb-1">已使用</p>
                      <p className="text-sm font-bold text-amber-400 tabular-nums">
                        {formatQuota(tokenInfo.total_used)}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <p className="text-[10px] text-slate-500 mb-1">剩余额度</p>
                      <p className="text-sm font-bold text-emerald-400 tabular-nums">
                        {tokenInfo.unlimited_quota ? '∞' : formatQuota(tokenInfo.total_available)}
                      </p>
                    </div>
                  </div>

                  {/* 用量进度条 */}
                  {!tokenInfo.unlimited_quota && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">用量</span>
                        <span className="text-slate-400 tabular-nums">{usedPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            usedPercent > 90 ? 'bg-rose-500' : usedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${usedPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 详细信息 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500">到期时间</span>
                      <span className="text-white/80 ml-auto tabular-nums">
                        {formatExpiresAt(tokenInfo.expires_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500">无限额度</span>
                      <span className={`ml-auto ${tokenInfo.unlimited_quota ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {tokenInfo.unlimited_quota ? '是' : '否'}
                      </span>
                    </div>
                    {tokenInfo.model_limits_enabled && tokenInfo.model_limits && (
                      <div className="col-span-2 flex items-center gap-2 text-xs">
                        <BarChart3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-500 shrink-0">模型限制</span>
                        <span className="text-white/80 truncate">{tokenInfo.model_limits}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 调用详情 */}
          {hasApiKey && logStats.length > 0 && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">调用详情</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 text-xs font-bold text-slate-500">模型</th>
                      <th className="text-right py-2 text-xs font-bold text-slate-500">调用次数</th>
                      <th className="text-right py-2 text-xs font-bold text-slate-500">消耗额度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logStats.map((stat, idx) => (
                      <tr key={idx} className="border-b border-white/[0.03] last:border-0">
                        <td className="py-2 text-xs font-medium text-white/80 truncate max-w-[200px]">{stat.model}</td>
                        <td className="py-2 text-xs text-slate-400 text-right tabular-nums">{stat.count}</td>
                        <td className="py-2 text-xs text-amber-400 text-right tabular-nums font-medium">{formatQuota(stat.quota)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 className="text-lg font-bold font-headline text-white">价格总览</h2>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left p-4 text-xs font-bold text-slate-400 tracking-wider w-32">模型</th>
                    <th className="text-center p-4 text-xs font-bold text-slate-400 tracking-wider border-l border-white/[0.06]">1K</th>
                    <th className="text-center p-4 text-xs font-bold text-slate-400 tracking-wider border-l border-white/[0.06]">2K</th>
                    <th className="text-center p-4 text-xs font-bold text-slate-400 tracking-wider border-l border-white/[0.06]">4K</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-white">全能图片V2</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.25</td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.25</td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.45</td>
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-white">全能图片PRO</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.50</td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.50</td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.88</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-white">Image 2</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.04</td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.06</td>
                    <td className="text-center p-4 text-sm font-bold text-white/80 tabular-nums border-l border-white/[0.06]">$0.10</td>
                  </tr>
                </tbody>
              </table>
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
                    onNavigateSettings={() => setView('settings')}
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
                  <EditWorkspace apiKey={apiKey} showToast={showToast} setPreviewImage={setPreviewImage} onNavigateSettings={() => setView('settings')} />
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
