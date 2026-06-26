/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast as UIToast } from './components/ui/Toast';
import { LoadingSpinner } from './components/ui/Loading';
import {
  X,
  Key,
  MoreVertical,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  MessageCircle,
  Wallet,
  BarChart3,
  Clock,
  Shield,
  AlertTriangle,
  Sun,
  Moon,
  Menu,
  Video,
} from 'lucide-react';
import { useApiKey } from './ApiKeyContext';
import { useTokenQuery } from './context/TokenQueryContext';
import { useTheme } from './context/ThemeContext';
import type { MenuItemId } from './menuConfig';
import { menuItemsConfig } from './menuConfig';
import { getPresetsForMenu } from './visualPresetConfig';
import { useGeneration } from './GenerationContext';
import type { PreviewImageData, ToastMessage } from './types';
import { useMobile } from './hooks/useMobile';

import EditWorkspace from './components/EditWorkspace';
import VideoView from './components/views/VideoView';
import GalleryView from './components/GalleryView';
import ImagePreviewModal from './components/ImagePreviewModal';
import { WorkspaceView } from './components/views/WorkspaceView';

type View = 'workspace' | 'gallery' | 'settings' | 'edit' | 'video';

const Sidebar = ({
  currentView,
  setView,
  activeMenuItem,
  setActiveMenuItem,
  setModel,
  isMobile,
  isOpen,
  onClose,
}: {
  currentView: View,
  setView: (v: View) => void,
  activeMenuItem: MenuItemId,
  setActiveMenuItem: (id: MenuItemId) => void,
  setModel: (m: string) => void,
  isMobile: boolean,
  isOpen: boolean,
  onClose: () => void,
}) => {
  const menuItems = menuItemsConfig;
  const groups = Array.from(new Set(menuItems.map(item => item.group)));

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    setActiveMenuItem(item.id);
    setModel(item.model);
    if (item.id === 'edit') {
      setView('edit');
    } else if (item.id === 'video') {
      setView('video');
    } else {
      setView('workspace');
    }
    if (isMobile) onClose();
  };

  const sidebarContent = (
    <>
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
            <h1 className="text-sm font-bold text-text-primary tracking-tight font-headline">室内大师</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">AI 工作空间</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        {groups.map(group => (
          <div key={group} className="mb-5">
            <p className="px-4 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">{group}</p>
            {menuItems.filter(item => item.group === group).map(item => (
              <button type="button"
                key={item.id}
                onClick={() => handleMenuItemClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                  activeMenuItem === item.id
                  ? 'bg-indigo-500/15 text-indigo-500 font-semibold'
                  : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeMenuItem === item.id ? 'text-indigo-500' : 'text-text-muted group-hover:text-text-secondary'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto p-2 border-t border-border space-y-2">
        <button
          type="button"
          onClick={() => { setView('settings'); setActiveMenuItem('workspace' as MenuItemId); if (isMobile) onClose(); }}
          className="w-full p-3 bg-surface-1 rounded-xl flex items-center gap-3 group cursor-pointer hover:bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          aria-label="前往 API 配置"
        >
          <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
            <Key className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-text-primary truncate">API配置</p>
            <p className="text-[10px] text-text-muted truncate">设置API与资料</p>
          </div>
          <MoreVertical className="w-3 h-3 text-text-muted" aria-hidden="true" />
        </button>
      </div>
    </>
  );

  // 桌面端：固定侧边栏
  if (!isMobile) {
    return (
      <aside className="w-64 bg-surface-2 h-screen flex flex-col border-r border-border fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>
    );
  }

  // 移动端：overlay 侧边栏
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-64 bg-surface-2 h-screen flex flex-col border-r border-border fixed left-0 top-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-label="导航菜单"
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-sm font-bold text-text-primary">导航</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭导航菜单"
                className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              >
                <X className="w-4 h-4 text-text-muted" aria-hidden="true" />
              </button>
            </div>
            {sidebarContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-subtle border border-border-subtle hover:bg-bg-subtle-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4 text-text-secondary" aria-hidden="true" /> : <Moon className="w-4 h-4 text-text-secondary" aria-hidden="true" />}
    </button>
  );
};

const TopBar = ({
  currentView,
  setView,
  showToast,
  activeTasks,
  isMobile,
  onToggleSidebar,
  onToggleRightPanel,
}: {
  currentView: View,
  setView: (v: View) => void,
  showToast: (type: 'success' | 'error' | 'info', message: string) => void,
  activeTasks?: Array<{ id: string; menuName: string; startedAt: number }>,
  isMobile: boolean,
  onToggleSidebar: () => void,
  onToggleRightPanel: () => void,
}) => {
  const { hasApiKey } = useApiKey();
  const { tokenInfo, loading, usedPercent, formatQuota } = useTokenQuery();
  const isGenerating = activeTasks && activeTasks.length > 0;

  return (
    <header className={`h-14 border-b border-border bg-surface-1 flex items-center justify-between ${isMobile ? 'px-3' : 'px-8'} sticky top-0 z-40`}>
      {isGenerating && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full shadow-lg shadow-indigo-500/10 z-50"
          style={{ maxWidth: isMobile ? 'calc(100% - 2rem)' : 'calc(100% - 400px)' }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {activeTasks!.map((task, idx) => (
              <div key={task.id} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" style={{ animationDelay: `${idx * 0.2}s` }} aria-hidden="true" />
                <span className="text-sm text-indigo-500 font-medium whitespace-nowrap">{task.menuName} 生成中…</span>
                {idx < activeTasks!.length - 1 && <span className="text-indigo-500 mx-1" aria-hidden="true">|</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="打开导航菜单"
            className="p-2 -ml-1 rounded-lg hover:bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          >
            <Menu className="w-5 h-5 text-text-secondary" aria-hidden="true" />
          </button>
        )}
        <nav className="flex items-center gap-4" aria-label="主导航">
          <button type="button"
            onClick={() => setView('workspace')}
            aria-current={currentView === 'workspace' ? 'page' : undefined}
            className={`text-sm font-bold transition-colors relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded ${currentView === 'workspace' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            工作区
            {currentView === 'workspace' && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
          <button type="button"
            onClick={() => setView('gallery')}
            aria-current={currentView === 'gallery' ? 'page' : undefined}
            className={`text-sm font-bold transition-colors relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded ${currentView === 'gallery' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            公共画廊
            {currentView === 'gallery' && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {!hasApiKey && !isMobile && (
          <button
            type="button"
            onClick={() => setView('settings')}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600/10 rounded-full border border-amber-500/20 hover:bg-amber-600/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
            aria-label="未配置 API Key，点击前往设置"
          >
            <Key className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-bold text-amber-400">未配置 API Key</span>
          </button>
        )}

        {hasApiKey && tokenInfo && !isMobile && (
          <button
            type="button"
            onClick={() => setView('settings')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:bg-bg-subtle-hover transition-colors bg-bg-subtle border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            aria-label={`剩余额度 ${tokenInfo.unlimited_quota ? '无限' : formatQuota(tokenInfo.total_available)}，已使用 ${usedPercent.toFixed(0)}%，点击查看详情`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold tabular-nums text-emerald-400">
              {tokenInfo.unlimited_quota ? '∞' : formatQuota(tokenInfo.total_available)}
            </span>
            {!tokenInfo.unlimited_quota && (
              <div className="w-12 h-1 bg-bg-subtle-hover rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(usedPercent)} aria-valuemin={0} aria-valuemax={100} aria-label="额度使用进度">
                <div
                  className={`h-full rounded-full ${
                    usedPercent > 90 ? 'bg-rose-500' : usedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
            )}
          </button>
        )}

        {hasApiKey && loading && !tokenInfo && !isMobile && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-subtle border border-border-subtle"
            role="status"
            aria-live="polite"
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-muted animate-spin" aria-hidden="true" />
            <span className="sr-only">正在加载额度信息</span>
          </div>
        )}

        {!isMobile && (
        <div className="relative group focus-within:block">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            aria-haspopup="true"
            aria-label="反馈菜单"
          >
            <User size={14} className="text-indigo-400" aria-hidden="true" />
            <span className="text-xs font-bold text-indigo-400">反馈</span>
          </button>

          <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-xl bg-surface-2 border border-border-subtle shadow-xl transition-all opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
            <div className="text-sm font-bold mb-2 text-text-primary">反馈</div>

            <a
              href="https://rcn38j826h3o.feishu.cn/share/base/form/shrcnS5hwsaDKsYs0g6fyhsStb8"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span>意见反馈</span>
            </a>
          </div>
        </div>
        )}

        <ThemeToggle />

        {!isMobile && (
          <span className="text-xs font-bold text-text-muted" aria-hidden="true">
            V3.6
          </span>
        )}
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
      showToast('error', '请输入有效的 API Key 后重试');
      return;
    }
    setApiKey(tempApiKey.trim());
    showToast('success', 'API Key 已保存');
  };

  const handleClearApiKey = () => {
    // 破坏性操作，需用户二次确认
    if (window.confirm('确定要清除已保存的 API Key 吗？清除后需要重新配置才能继续使用生成功能。')) {
      clearApiKey();
      setTempApiKey('');
      showToast('info', 'API Key 已清除');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-gradient-indigo tracking-tight">设置</h1>
          <p className="text-text-secondary text-sm">配置您的 API Key 以使用 AI 生成功能。</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Key className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold font-headline text-text-primary">API Key 配置</h2>
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="api-key-input" className="block text-sm font-bold text-text-primary/80">您的 API Key</label>
              <div className="relative">
                <input
                  id="api-key-input"
                  name="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="输入您的 API Key…"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="input-field w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                  aria-pressed={showKey}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded"
                >
                  {showKey ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="text-xs text-text-muted" aria-live="polite">
                {hasApiKey ? '已配置 API Key' : '尚未配置 API Key'}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button"
                onClick={refreshToken}
                disabled={!hasApiKey || tokenLoading}
                className="btn-primary flex-1 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <RefreshCw className={`w-4 h-4 ${tokenLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {tokenLoading ? '查询中…' : '刷新用量'}
              </button>
              <button type="button"
                onClick={handleSaveApiKey}
                className="btn-primary flex-1 text-white py-2.5 rounded-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                保存 API Key
              </button>
              {hasApiKey && (
                <button type="button"
                  onClick={handleClearApiKey}
                  className="px-4 py-2.5 bg-surface-3 hover:bg-rose-500/15 text-rose-400 rounded-xl font-bold transition-colors duration-200 border border-border-subtle hover:border-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30"
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
                  <h3 className="text-sm font-bold text-text-primary">令牌信息</h3>
                </div>
                {tokenInfo && (
                  <span className="text-xs text-text-muted">
                    {tokenInfo.name}
                  </span>
                )}
              </div>

              {tokenLoading && (
                <div
                  className="flex items-center justify-center py-6"
                  role="status"
                  aria-live="polite"
                >
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" aria-hidden="true" />
                  <span className="ml-2 text-sm text-text-secondary">加载中…</span>
                </div>
              )}

              {tokenError && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20"
                  role="alert"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-rose-400">{tokenError}</span>
                </div>
              )}

              {tokenInfo && !tokenLoading && (
                <>
                  {/* 额度概览 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-bg-subtle rounded-xl p-3 border border-border-subtle">
                      <p className="text-[10px] text-text-muted mb-1">总额度</p>
                      <p className="text-sm font-bold text-text-primary tabular-nums">
                        {tokenInfo.unlimited_quota ? '∞' : formatQuota(tokenInfo.total_granted)}
                      </p>
                    </div>
                    <div className="bg-bg-subtle rounded-xl p-3 border border-border-subtle">
                      <p className="text-[10px] text-text-muted mb-1">已使用</p>
                      <p className="text-sm font-bold text-amber-400 tabular-nums">
                        {formatQuota(tokenInfo.total_used)}
                      </p>
                    </div>
                    <div className="bg-bg-subtle rounded-xl p-3 border border-border-subtle">
                      <p className="text-[10px] text-text-muted mb-1">剩余额度</p>
                      <p className="text-sm font-bold text-emerald-400 tabular-nums">
                        {tokenInfo.unlimited_quota ? '∞' : formatQuota(tokenInfo.total_available)}
                      </p>
                    </div>
                  </div>

                  {/* 用量进度条 */}
                  {!tokenInfo.unlimited_quota && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">用量</span>
                        <span className="text-text-secondary tabular-nums">{usedPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-bg-subtle-hover rounded-full overflow-hidden">
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
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-text-muted">到期时间</span>
                      <span className="text-text-primary/80 ml-auto tabular-nums">
                        {formatExpiresAt(tokenInfo.expires_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-text-muted">无限额度</span>
                      <span className={`ml-auto ${tokenInfo.unlimited_quota ? 'text-emerald-400' : 'text-text-secondary'}`}>
                        {tokenInfo.unlimited_quota ? '是' : '否'}
                      </span>
                    </div>
                    {tokenInfo.model_limits_enabled && tokenInfo.model_limits && (
                      <div className="col-span-2 flex items-center gap-2 text-xs">
                        <BarChart3 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span className="text-text-muted shrink-0">模型限制</span>
                        <span className="text-text-primary/80 truncate">
                          {typeof tokenInfo.model_limits === 'string'
                            ? tokenInfo.model_limits
                            : tokenInfo.model_limits
                            ? Object.keys(tokenInfo.model_limits).join(', ')
                            : ''}
                        </span>
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
                <h3 className="text-sm font-bold text-text-primary">调用详情</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left py-2 text-xs font-bold text-text-muted">模型</th>
                      <th className="text-right py-2 text-xs font-bold text-text-muted">调用次数</th>
                      <th className="text-right py-2 text-xs font-bold text-text-muted">消耗额度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logStats.map((stat) => (
                      <tr key={stat.model} className="border-b border-border-subtle/50 last:border-0">
                        <td className="py-2 text-xs font-medium text-text-primary/80 truncate max-w-[200px]">{stat.model}</td>
                        <td className="py-2 text-xs text-text-secondary text-right tabular-nums">{stat.count}</td>
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
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 className="text-lg font-bold font-headline text-text-primary">图片生成价格</h2>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-subtle">
                    <th className="text-left p-4 text-xs font-bold text-text-secondary tracking-wider w-32">模型</th>
                    <th className="text-center p-4 text-xs font-bold text-text-secondary tracking-wider border-l border-border-subtle">1K</th>
                    <th className="text-center p-4 text-xs font-bold text-text-secondary tracking-wider border-l border-border-subtle">2K</th>
                    <th className="text-center p-4 text-xs font-bold text-text-secondary tracking-wider border-l border-border-subtle">4K</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-subtle/50 hover:bg-bg-subtle transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-text-primary">全能图片V2</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.40</td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.40</td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.70</td>
                  </tr>
                  <tr className="border-b border-border-subtle/50 hover:bg-bg-subtle transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-text-primary">全能图片PRO</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.80</td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.80</td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$1.40</td>
                  </tr>
                  <tr className="hover:bg-bg-subtle transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-text-primary">Image 2</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.04</td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.06</td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">$0.10</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 视频生成价格 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold font-headline text-text-primary">视频生成价格</h2>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-subtle">
                    <th className="text-left p-4 text-xs font-bold text-text-secondary tracking-wider w-40">模型</th>
                    <th className="text-center p-4 text-xs font-bold text-text-secondary tracking-wider border-l border-border-subtle">720P</th>
                    <th className="text-center p-4 text-xs font-bold text-text-secondary tracking-wider border-l border-border-subtle">1080P</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-bg-subtle transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-text-primary">视频生成</span>
                    </td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">¥1.26&nbsp;<span className="text-xs text-text-muted font-normal">/秒</span></td>
                    <td className="text-center p-4 text-sm font-bold text-text-primary/80 tabular-nums border-l border-border-subtle">¥2.24&nbsp;<span className="text-xs text-text-muted font-normal">/秒</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-text-muted px-1">视频价格按生成时长计费，例如 720P 生成 5&nbsp;秒 = ¥6.30，1080P 生成 10&nbsp;秒 = ¥22.40。</p>
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
  const isMobile = useMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

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
  const [model, setModel] = useState('全能图片V2');

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
      // 输入框中不触发全局快捷键，避免影响正常输入
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (view === 'workspace') {
          showToast('info', '使用 Cmd/Ctrl + Enter 触发生成');
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        showToast('info', '使用 Cmd/Ctrl + S 保存设置');
      }
      if (e.key === 'Escape') {
        setToasts([]);
      }
      if (!isTyping) {
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
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col ${isMobile ? '' : 'ml-64'} overflow-hidden`}>
        <TopBar
          currentView={view}
          setView={setView}
          showToast={showToast}
          activeTasks={activeTasks}
          isMobile={isMobile}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
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
                    isMobile={isMobile}
                    isRightPanelOpen={isRightPanelOpen}
                    onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
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
                  <EditWorkspace apiKey={apiKey} showToast={showToast} setPreviewImage={setPreviewImage} onNavigateSettings={() => setView('settings')} isMobile={isMobile} isRightPanelOpen={isRightPanelOpen} onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)} />
                </Suspense>
              )}
              {view === 'video' && (
                <VideoView apiKey={apiKey} showToast={showToast} setPreviewImage={setPreviewImage} onNavigateSettings={() => setView('settings')} isMobile={isMobile} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className={`py-4 ${isMobile ? 'px-4' : 'px-8'} border-t border-border text-left text-text-muted text-[10px] w-full`}>
          <p><small>&copy; 2026 Atelier AI. 致力于用 AI 赋能每一位设计师。</small></p>
        </footer>
      </div>

      <AnimatePresence>
        {toasts.map(toast => (
          <UIToast key={toast.id} toast={toast} onDismiss={dismissToast} />
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
