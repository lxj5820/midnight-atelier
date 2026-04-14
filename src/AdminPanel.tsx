import React, { useState, useEffect } from 'react';
import { Users, Settings, Mail, Shield, Trash2, Check, X, Eye, EyeOff, RefreshCw, Zap, Key, Plus, Gift, DollarSign, Minus, XCircle, CreditCard, Calendar, Star } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';
import type { User } from './AuthContext.tsx';
import {
  getAdminUsers,
  deleteUser,
  updateUserAdminStatus,
  getSystemSettings,
  updateSystemSettings,
  updateUserApiKey,
  createUser,
  giftComputePoints,
  compensateComputePoints,
  deductComputePoints,
  clearComputePoints,
  getAdminPlans,
  getUserSubscriptions,
  createUserSubscription,
  cancelUserSubscription,
  extendUserSubscription,
  deleteUserSubscription,
  type SmtpSettings,
  type SubscriptionPlan,
  type UserSubscription,
} from './adminApi';

interface AdminPanelProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function AdminPanel({ showToast }: AdminPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'smtp'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [computePointsInput, setComputePointsInput] = useState('');
  const [computePointsAction, setComputePointsAction] = useState<'gift' | 'compensate' | 'deduct' | 'clear'>('gift');
  const [computePointsReason, setComputePointsReason] = useState('');
  const [editingApiKeyUserId, setEditingApiKeyUserId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', nickname: '' });

  // Subscription management
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionUserId, setSubscriptionUserId] = useState<string | null>(null);
  const [subscriptionUserNickname, setSubscriptionUserNickname] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendSubscriptionId, setExtendSubscriptionId] = useState<string | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribePlanId, setSubscribePlanId] = useState<string | null>(null);
  const [subscribeMonths, setSubscribeMonths] = useState(1);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadSmtpSettings();
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

  const loadSmtpSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getSystemSettings();
      if (result.success && result.data) {
        setSmtpSettings({
          smtp_host: result.data.smtp_host || '',
          smtp_port: result.data.smtp_port || '587',
          smtp_secure: result.data.smtp_secure || 'false',
          smtp_user: result.data.smtp_user || '',
          smtp_pass: result.data.smtp_pass || '',
          smtp_from: result.data.smtp_from || '',
        });
      } else {
        showToast('error', result.error || '加载SMTP设置失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？')) return;

    try {
      const result = await deleteUser(userId);
      if (result.success) {
        showToast('success', '用户已删除');
        loadUsers();
      } else {
        showToast('error', result.error || '删除失败');
      }
    } catch (error) {
      showToast('error', '删除失败');
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      const result = await updateUserAdminStatus(userId, newStatus);
      if (result.success) {
        showToast('success', newStatus === 1 ? '已设为管理员' : '已取消管理员');
        loadUsers();
      } else {
        showToast('error', result.error || '更新失败');
      }
    } catch (error) {
      showToast('error', '更新失败');
    }
  };

  const handleSaveSmtp = async () => {
    if (!smtpSettings.smtp_host || !smtpSettings.smtp_user || !smtpSettings.smtp_pass || !smtpSettings.smtp_from) {
      showToast('error', '请填写完整的SMTP配置');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateSystemSettings(smtpSettings);
      if (result.success) {
        showToast('success', 'SMTP设置已保存');
      } else {
        showToast('error', result.error || '保存失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateComputePoints = async (userId: string) => {
    const points = parseInt(computePointsInput);

    if (computePointsAction !== 'clear' && (isNaN(points) || points <= 0)) {
      showToast('error', '请输入有效的算力值');
      return;
    }

    if (!computePointsReason.trim()) {
      showToast('error', '请输入操作原因');
      return;
    }

    try {
      let result;
      switch (computePointsAction) {
        case 'gift':
          result = await giftComputePoints(userId, points, computePointsReason.trim());
          break;
        case 'compensate':
          result = await compensateComputePoints(userId, points, computePointsReason.trim());
          break;
        case 'deduct':
          result = await deductComputePoints(userId, points, computePointsReason.trim());
          break;
        case 'clear':
          result = await clearComputePoints(userId, computePointsReason.trim());
          break;
      }

      if (result.success) {
        const actionText = {
          gift: '赠送',
          compensate: '补偿',
          deduct: '扣除',
          clear: '清空'
        }[computePointsAction];
        showToast('success', `算力值${actionText}成功`);
        setEditingUserId(null);
        setComputePointsInput('');
        setComputePointsReason('');
        loadUsers();
      } else {
        showToast('error', result.error || '操作失败');
      }
    } catch (error) {
      showToast('error', '操作失败');
    }
  };

  const handleUpdateApiKey = async (userId: string) => {
    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey) {
      showToast('error', '请输入 API Key');
      return;
    }

    try {
      const result = await updateUserApiKey(userId, trimmedKey);
      if (result.success) {
        showToast('success', 'API Key 已更新');
        setEditingApiKeyUserId(null);
        setApiKeyInput('');
        loadUsers();
      } else {
        showToast('error', result.error || '更新失败');
      }
    } catch (error) {
      showToast('error', '更新失败');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.email.includes('@')) {
      showToast('error', '请输入有效的邮箱地址');
      return;
    }
    if (!newUser.password || newUser.password.length < 6) {
      showToast('error', '密码长度至少为 6 位');
      return;
    }
    if (!newUser.nickname || newUser.nickname.trim().length === 0) {
      showToast('error', '请输入昵称');
      return;
    }

    try {
      const result = await createUser(newUser.email, newUser.password, newUser.nickname);
      if (result.success) {
        showToast('success', '用户创建成功');
        setShowCreateUserModal(false);
        setNewUser({ email: '', password: '', nickname: '' });
        loadUsers();
      } else {
        showToast('error', result.error || '创建失败');
      }
    } catch (error) {
      showToast('error', '创建失败');
    }
  };

  const openSubscriptionModal = async (userId: string, nickname: string) => {
    setSubscriptionUserId(userId);
    setSubscriptionUserNickname(nickname);
    setShowSubscriptionModal(true);

    try {
      const [plansResult, subscriptionsResult] = await Promise.all([
        getAdminPlans(),
        getUserSubscriptions(userId)
      ]);

      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data);
      }

      if (subscriptionsResult.success && subscriptionsResult.data) {
        setUserSubscriptions(subscriptionsResult.data.subscriptions || []);
        setActiveSubscription(subscriptionsResult.data.activeSubscription || null);
      }
    } catch (error) {
      showToast('error', '加载订阅信息失败');
    }
  };

  const handleSubscribe = async () => {
    if (!subscriptionUserId || !subscribePlanId) {
      showToast('error', '请选择套餐');
      return;
    }

    try {
      const result = await createUserSubscription(subscriptionUserId, subscribePlanId, subscribeMonths);
      if (result.success) {
        showToast('success', `开通套餐成功！已赠送 ${result.data?.addedPoints || 0} 算力`);
        setShowSubscribeModal(false);
        setSubscribePlanId(null);
        setSubscribeMonths(1);
        // Reload subscriptions
        const subscriptionsResult = await getUserSubscriptions(subscriptionUserId);
        if (subscriptionsResult.success && subscriptionsResult.data) {
          setUserSubscriptions(subscriptionsResult.data.subscriptions || []);
          setActiveSubscription(subscriptionsResult.data.activeSubscription || null);
        }
        loadUsers(); // Reload users to update compute_points
      } else {
        showToast('error', result.error || '开通套餐失败');
      }
    } catch (error) {
      showToast('error', '开通套餐失败');
    }
  };

  const handleExtend = async () => {
    if (!subscriptionUserId || !extendSubscriptionId) {
      showToast('error', '请选择订阅');
      return;
    }

    try {
      const result = await extendUserSubscription(subscriptionUserId, extendSubscriptionId, extendMonths);
      if (result.success) {
        showToast('success', `续费成功！已赠送 ${result.data?.addedPoints || 0} 算力`);
        setShowExtendModal(false);
        setExtendSubscriptionId(null);
        setExtendMonths(1);
        // Reload subscriptions
        const subscriptionsResult = await getUserSubscriptions(subscriptionUserId);
        if (subscriptionsResult.success && subscriptionsResult.data) {
          setUserSubscriptions(subscriptionsResult.data.subscriptions || []);
          setActiveSubscription(subscriptionsResult.data.activeSubscription || null);
        }
        loadUsers();
      } else {
        showToast('error', result.error || '续费失败');
      }
    } catch (error) {
      showToast('error', '续费失败');
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!subscriptionUserId) return;
    if (!confirm('确定要取消此订阅吗？')) return;

    try {
      const result = await cancelUserSubscription(subscriptionUserId, subscriptionId);
      if (result.success) {
        showToast('success', '订阅已取消');
        // Reload subscriptions
        const subscriptionsResult = await getUserSubscriptions(subscriptionUserId);
        if (subscriptionsResult.success && subscriptionsResult.data) {
          setUserSubscriptions(subscriptionsResult.data.subscriptions || []);
          setActiveSubscription(subscriptionsResult.data.activeSubscription || null);
        }
      } else {
        showToast('error', result.error || '取消订阅失败');
      }
    } catch (error) {
      showToast('error', '取消订阅失败');
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!subscriptionUserId) return;
    if (!confirm('确定要删除此订阅记录吗？')) return;

    try {
      const result = await deleteUserSubscription(subscriptionUserId, subscriptionId);
      if (result.success) {
        showToast('success', '订阅记录已删除');
        // Reload subscriptions
        const subscriptionsResult = await getUserSubscriptions(subscriptionUserId);
        if (subscriptionsResult.success && subscriptionsResult.data) {
          setUserSubscriptions(subscriptionsResult.data.subscriptions || []);
          setActiveSubscription(subscriptionsResult.data.activeSubscription || null);
        }
      } else {
        showToast('error', result.error || '删除订阅失败');
      }
    } catch (error) {
      showToast('error', '删除订阅失败');
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
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'smtp' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            SMTP设置
          </button>
        </div>

        {/* Content */}
        {activeTab === 'users' && (
          <div className="bg-[#1c1f26] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">用户列表</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                  创建用户
                </button>
                <button
                  onClick={loadUsers}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-sm font-medium transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#111317]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">用户</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">邮箱</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">角色</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">API密钥</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">算力值</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">注册时间</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#111317] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                              <span className="text-indigo-400 text-sm font-bold">{u.nickname.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-white">{u.nickname}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_admin === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-bold">
                            <Shield className="w-3 h-3" />
                            管理员
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-slate-700/50 text-slate-400 rounded-full text-xs font-medium">
                            普通用户
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingApiKeyUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="输入API密钥"
                                className="w-48 bg-[#111317] border border-white/5 rounded-lg py-1 px-2 pr-8 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                              >
                                {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                            <button
                              onClick={() => handleUpdateApiKey(u.id)}
                              className="p-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingApiKeyUserId(null);
                                setApiKeyInput('');
                                setShowApiKey(false);
                              }}
                              className="p-1 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {u.api_key ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold">
                                <Key className="w-3 h-3" />
                                已配置
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 text-slate-400 rounded-full text-xs font-medium">
                                <Key className="w-3 h-3" />
                                未配置
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingApiKeyUserId(u.id);
                                setApiKeyInput(u.api_key || '');
                                setShowApiKey(false);
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                              title="设置API密钥"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUserId === u.id ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {computePointsAction !== 'clear' && (
                                <input
                                  type="number"
                                  value={computePointsInput}
                                  onChange={(e) => setComputePointsInput(e.target.value)}
                                  placeholder="数量"
                                  className="w-20 bg-[#111317] border border-white/5 rounded-lg py-1 px-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                              )}
                              <select
                                value={computePointsAction}
                                onChange={(e) => setComputePointsAction(e.target.value as 'gift' | 'compensate' | 'deduct' | 'clear')}
                                className="bg-[#111317] border border-white/5 rounded-lg py-1 px-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                              >
                                <option value="gift">赠送</option>
                                <option value="compensate">补偿</option>
                                <option value="deduct">扣除</option>
                                <option value="clear">清空</option>
                              </select>
                            </div>
                            <input
                              type="text"
                              value={computePointsReason}
                              onChange={(e) => setComputePointsReason(e.target.value)}
                              placeholder="操作原因"
                              className="w-full bg-[#111317] border border-white/5 rounded-lg py-1 px-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateComputePoints(u.id)}
                                className="p-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(null);
                                  setComputePointsInput('');
                                  setComputePointsReason('');
                                }}
                                className="p-1 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-bold">
                              <Zap className="w-3 h-3" />
                              {u.compute_points}
                            </span>
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setComputePointsInput('');
                                setComputePointsReason('');
                                setComputePointsAction('gift');
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                              title="管理算力值"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openSubscriptionModal(u.id, u.nickname)}
                            className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-all"
                          >
                            <CreditCard className="w-3 h-3 inline mr-1" />
                            套餐
                          </button>
                          {u.id !== user.id && (
                            <>
                              <button
                                onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-medium transition-all"
                              >
                                {u.is_admin === 1 ? '取消管理员' : '设为管理员'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {u.id === user.id && (
                            <span className="text-xs text-slate-500">当前用户</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">暂无用户</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'smtp' && (
          <div className="bg-[#1c1f26] rounded-2xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">SMTP 邮件服务配置</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">SMTP 服务器</label>
                  <input
                    type="text"
                    value={smtpSettings.smtp_host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">端口</label>
                  <input
                    type="text"
                    value={smtpSettings.smtp_port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                    placeholder="587"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">使用 SSL/TLS</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={smtpSettings.smtp_secure === 'true'}
                      onChange={() => setSmtpSettings({ ...smtpSettings, smtp_secure: 'true' })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-white">是</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={smtpSettings.smtp_secure === 'false'}
                      onChange={() => setSmtpSettings({ ...smtpSettings, smtp_secure: 'false' })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-white">否</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">SMTP 用户名</label>
                <input
                  type="text"
                  value={smtpSettings.smtp_user}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">SMTP 密码</label>
                <div className="relative">
                  <input
                    type={showSmtpPass ? 'text' : 'password'}
                    value={smtpSettings.smtp_pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                    placeholder="密码或授权码"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 pr-12 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">发件人邮箱</label>
                <input
                  type="email"
                  value={smtpSettings.smtp_from}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from: e.target.value })}
                  placeholder="noreply@example.com"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                <Settings className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  配置完成后，用户注册时将通过此邮箱发送验证码。请确保SMTP信息正确，否则验证码无法发送。
                </p>
              </div>

              <button
                onClick={handleSaveSmtp}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isLoading ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 创建用户模态框 */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c1f26] rounded-2xl border border-white/5 p-6 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">创建新用户</h3>
              <button
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUser({ email: '', password: '', nickname: '' });
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">邮箱</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">昵称</label>
                <input
                  type="text"
                  value={newUser.nickname}
                  onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })}
                  placeholder="用户昵称"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">密码</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="至少 6 位"
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUser({ email: '', password: '', nickname: '' });
                }}
                className="flex-1 bg-[#2a2e38] hover:bg-slate-600 text-white py-2.5 rounded-lg font-bold transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateUser}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Management Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1f26] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 bg-[#1c1f26] border-b border-[#2a2e38] p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">套餐管理</h3>
                <p className="text-slate-400 text-sm mt-1">用户：{subscriptionUserNickname}</p>
              </div>
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setUserSubscriptions([]);
                  setActiveSubscription(null);
                }}
                className="p-2 bg-[#111317] hover:bg-[#2a2e38] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Subscription */}
              {activeSubscription ? (
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-indigo-400" />
                      <span className="text-indigo-400 font-bold">当前套餐</span>
                    </div>
                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs font-bold rounded-full">生效中</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">套餐名称</p>
                      <p className="text-white font-bold">{activeSubscription.plan_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">到期时间</p>
                      <p className="text-white font-bold">{new Date(activeSubscription.expire_date).toLocaleDateString('zh-CN')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setExtendSubscriptionId(activeSubscription.id);
                        setShowExtendModal(true);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-bold transition-all"
                    >
                      续费套餐
                    </button>
                    <button
                      onClick={() => handleCancelSubscription(activeSubscription.id)}
                      className="px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 py-2 rounded-lg text-sm font-bold transition-all"
                    >
                      取消订阅
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#111317] border border-[#2a2e38] rounded-xl p-4 text-center">
                  <p className="text-slate-400 mb-4">该用户暂无有效套餐</p>
                </div>
              )}

              {/* Subscription History */}
              <div>
                <h4 className="text-white font-bold mb-3">订阅记录</h4>
                {userSubscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {userSubscriptions.map((sub) => (
                      <div key={sub.id} className="bg-[#111317] border border-[#2a2e38] rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{sub.plan_name}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            开通时间：{new Date(sub.start_date).toLocaleDateString('zh-CN')} |
                            到期时间：{new Date(sub.expire_date).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            sub.status === 'active' ? 'bg-green-600/20 text-green-400' :
                            sub.status === 'cancelled' ? 'bg-rose-600/20 text-rose-400' :
                            'bg-slate-600/20 text-slate-400'
                          }`}>
                            {sub.status === 'active' ? '生效中' : sub.status === 'cancelled' ? '已取消' : sub.status}
                          </span>
                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">暂无订阅记录</p>
                )}
              </div>

              {/* Subscribe Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSubscribeModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all"
                >
                  <Plus className="w-5 h-5" />
                  开通新套餐
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#1c1f26] rounded-2xl w-full max-w-lg">
            <div className="border-b border-[#2a2e38] p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">开通套餐</h3>
              <button
                onClick={() => {
                  setShowSubscribeModal(false);
                  setSubscribePlanId(null);
                  setSubscribeMonths(1);
                }}
                className="p-2 bg-[#111317] hover:bg-[#2a2e38] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">选择套餐</label>
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSubscribePlanId(plan.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        subscribePlanId === plan.id
                          ? 'border-indigo-500 bg-indigo-600/10'
                          : 'border-[#2a2e38] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold">{plan.name}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            每月 {plan.monthly_quota} 积分 | 每日签到 {plan.daily_sign_in} 积分 | {plan.concurrency} 并发
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">¥{plan.price}</p>
                          <p className="text-slate-400 text-xs">/{plan.period}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">开通时长</label>
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSubscribeMonths(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        subscribeMonths === m
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#111317] text-slate-400 hover:bg-[#2a2e38]'
                      }`}
                    >
                      {m} {m === 1 ? '月' : '月'}
                    </button>
                  ))}
                </div>
              </div>

              {subscribePlanId && (
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">预计赠送算力</span>
                    <span className="text-indigo-400 font-bold text-lg">
                      {(() => {
                        const plan = plans.find(p => p.id === subscribePlanId);
                        return plan ? plan.monthly_quota * subscribeMonths : 0;
                      })()} 积分
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={!subscribePlanId}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all"
              >
                确认开通
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#1c1f26] rounded-2xl w-full max-w-md">
            <div className="border-b border-[#2a2e38] p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">续费套餐</h3>
              <button
                onClick={() => {
                  setShowExtendModal(false);
                  setExtendSubscriptionId(null);
                  setExtendMonths(1);
                }}
                className="p-2 bg-[#111317] hover:bg-[#2a2e38] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">续费时长</label>
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      onClick={() => setExtendMonths(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        extendMonths === m
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#111317] text-slate-400 hover:bg-[#2a2e38]'
                      }`}
                    >
                      {m} {m === 1 ? '月' : '月'}
                    </button>
                  ))}
                </div>
              </div>

              {extendSubscriptionId && (
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">预计赠送算力</span>
                    <span className="text-indigo-400 font-bold text-lg">
                      {(() => {
                        const sub = userSubscriptions.find(s => s.id === extendSubscriptionId);
                        const plan = plans.find(p => p.id === sub?.plan_id);
                        return plan ? plan.monthly_quota * extendMonths : 0;
                      })()} 积分
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleExtend}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all"
              >
                确认续费
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
