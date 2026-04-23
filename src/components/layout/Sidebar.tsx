import React from 'react';
import { Settings, MoreVertical, Key, Zap } from 'lucide-react';
import { useApiKey } from '../../ApiKeyContext';
import { menuItemsConfig } from '../../menuConfig';
import type { MenuItemId } from '../../menuConfig';
import type { View } from '../../types';

interface SidebarProps {
  currentView: View;
  setView: (v: View) => void;
  activeMenuItem: MenuItemId;
  setActiveMenuItem: (id: MenuItemId) => void;
  setModel: (m: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  activeMenuItem,
  setActiveMenuItem,
  setModel,
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
