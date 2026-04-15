import React, { useState, useEffect } from 'react';
import { Users, Settings, Mail, Shield, History, Package } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';
import type { User } from './AuthContext.tsx';
import {
  getAdminUsers,
  getAdminPlans,
  getSystemSettings,
  getEmailTemplates,
  updateDefaultApiKey,
  type SubscriptionPlan,
} from './adminApi';
import UserManagementTab from './tabs/UserManagementTab.tsx';
import GenerationLogsTab from './tabs/GenerationLogsTab.tsx';
import PlanManagementTab from './tabs/PlanManagementTab.tsx';
import SettingsTab from './tabs/SettingsTab.tsx';

interface AdminPanelProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function AdminPanel({ showToast }: AdminPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'plans' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [smtpSettings, setSmtpSettings] = useState<{ default_api_key?: string }>({});

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'plans') {
      loadPlans();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        showToast('error', result.error || '加载用户列表失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminPlans();
      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        showToast('error', result.error || '加载套餐列表失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSmtpSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getSystemSettings();
      if (result.success && result.data) {
        setSmtpSettings({ default_api_key: result.data.default_api_key || '' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      await getEmailTemplates();
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  };

  if (!user || user.is_admin !== 1) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">权限不足</h2>
          <p className="text-slate-400">您没有访问管理员后台的权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">管理员后台</h1>
          <p className="text-slate-400">管理用户、配置系统设置</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[#1c1f26] rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            用户管理
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            生图日志
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            套餐管理
          </button>
          <button
            onClick={() => {
              setActiveTab('settings');
              loadSmtpSettings();
              loadEmailTemplates();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            注册与邮件
          </button>
        </div>

        {/* Content */}
        {activeTab === 'users' && (
          <UserManagementTab
            user={user}
            users={users}
            isLoading={isLoading}
            plans={plans}
            smtpSettings={smtpSettings}
            showToast={showToast}
            loadUsers={loadUsers}
            loadPlans={loadPlans}
          />
        )}

        {activeTab === 'logs' && (
          <GenerationLogsTab
            isLoading={isLoading}
            showToast={showToast}
          />
        )}

        {activeTab === 'plans' && (
          <PlanManagementTab
            isLoading={isLoading}
            showToast={showToast}
            loadPlans={loadPlans}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            isLoading={isLoading}
            showToast={showToast}
            loadSmtpSettings={loadSmtpSettings}
            loadEmailTemplates={loadEmailTemplates}
          />
        )}
      </div>
    </div>
  );
}
