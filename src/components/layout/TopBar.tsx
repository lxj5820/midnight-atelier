import React from 'react';
import { motion } from 'framer-motion';
import { Key, RefreshCw } from 'lucide-react';
import { useApiKey } from '../../ApiKeyContext';
import type { View } from '../../types';

interface TopBarProps {
  currentView: View;
  setView: (v: View) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  activeTasks?: Array<{ id: string; menuName: string; startedAt: number }>;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  setView,
  showToast,
  activeTasks,
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
          V2.3
        </span>
      </div>
    </header>
  );
};
