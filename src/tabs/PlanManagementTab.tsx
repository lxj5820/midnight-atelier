import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { getAdminPlans, createPlan, updatePlan, deletePlan, type SubscriptionPlan, type PlanInput } from '../adminApi';

interface PlanManagementTabProps {
  isLoading: boolean;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  loadPlans: () => void;
}

export default function PlanManagementTab({ isLoading, showToast, loadPlans }: PlanManagementTabProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanInput>({
    id: '',
    name: '',
    price: 0,
    period: '月付',
    monthlyQuota: 0,
    dailySignIn: 0,
    qualities: '[]',
    concurrency: 1,
    watermark: true,
    extras: '[]',
    isActive: true,
    sortOrder: 0,
  });

  const handleSavePlan = async () => {
    if (!planForm.id || !planForm.name || planForm.price <= 0) {
      showToast('error', '请填写完整的套餐信息');
      return;
    }
    try {
      let result;
      if (editingPlan) {
        result = await updatePlan(editingPlan.id, planForm);
      } else {
        result = await createPlan(planForm);
      }
      if (result.success) {
        showToast('success', editingPlan ? '套餐已更新' : '套餐已创建');
        setShowPlanModal(false);
        loadPlans();
      } else {
        showToast('error', result.error || '操作失败');
      }
    } catch (error) {
      showToast('error', '操作失败');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('确定要删除此套餐吗？')) return;
    try {
      const result = await deletePlan(planId);
      if (result.success) {
        showToast('success', '套餐已删除');
        loadPlans();
      } else {
        showToast('error', result.error || '删除失败');
      }
    } catch (error) {
      showToast('error', '删除失败');
    }
  };

  return (
    <>
      <div className="bg-[#1c1f26] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">套餐管理</h2>
          <button
            onClick={() => {
              setEditingPlan(null);
              setPlanForm({
                id: '',
                name: '',
                price: 0,
                period: '月付',
                monthlyQuota: 0,
                dailySignIn: 0,
                qualities: '[]',
                concurrency: 1,
                watermark: true,
                extras: '[]',
                isActive: true,
                sortOrder: 0,
              });
              setShowPlanModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            添加套餐
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#111317]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">套餐名称</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">价格</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">周期</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">月度积分</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">每日积分</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">状态</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-[#111317] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">{plan.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">¥{plan.price}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-400">{plan.period}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-indigo-400">{plan.monthly_quota}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-indigo-400">{plan.daily_sign_in}/天</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {plan.is_active === 1 ? (
                      <span className="inline-flex items-center px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold">启用</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-slate-700/50 text-slate-400 rounded-full text-xs font-medium">禁用</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm({
                            id: plan.id,
                            name: plan.name,
                            price: plan.price,
                            period: plan.period,
                            monthlyQuota: plan.monthly_quota,
                            dailySignIn: plan.daily_sign_in,
                            qualities: plan.qualities,
                            concurrency: plan.concurrency,
                            watermark: plan.watermark === 1,
                            extras: plan.extras,
                            isActive: plan.is_active === 1,
                            sortOrder: plan.sort_order,
                          });
                          setShowPlanModal(true);
                        }}
                        className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">暂无套餐</p>
            </div>
          )}
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1f26] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 bg-[#1c1f26] border-b border-[#2a2e38] p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingPlan ? '编辑套餐' : '添加套餐'}</h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-2 bg-[#111317] hover:bg-[#2a2e38] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">套餐ID</label>
                  <input
                    type="text"
                    value={planForm.id}
                    onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })}
                    placeholder="plan_basic"
                    disabled={!!editingPlan}
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">套餐名称</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="入门版"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">价格(元)</label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseInt(e.target.value) || 0 })}
                    placeholder="29"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">周期</label>
                  <select
                    value={planForm.period}
                    onChange={(e) => setPlanForm({ ...planForm, period: e.target.value })}
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="月付">月付</option>
                    <option value="年付">年付</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">月度积分</label>
                  <input
                    type="number"
                    value={planForm.monthlyQuota}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyQuota: parseInt(e.target.value) || 0 })}
                    placeholder="1900"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">每日积分</label>
                  <input
                    type="number"
                    value={planForm.dailySignIn}
                    onChange={(e) => setPlanForm({ ...planForm, dailySignIn: parseInt(e.target.value) || 0 })}
                    placeholder="15"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">并发数</label>
                  <input
                    type="number"
                    value={planForm.concurrency}
                    onChange={(e) => setPlanForm({ ...planForm, concurrency: parseInt(e.target.value) || 1 })}
                    placeholder="2"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">排序</label>
                  <input
                    type="number"
                    value={planForm.sortOrder}
                    onChange={(e) => setPlanForm({ ...planForm, sortOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">支持的画质(JSON数组)</label>
                <input
                  type="text"
                  value={planForm.qualities}
                  onChange={(e) => setPlanForm({ ...planForm, qualities: e.target.value })}
                  placeholder='["1K", "2K"]'
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">额外权益(JSON数组)</label>
                <input
                  type="text"
                  value={planForm.extras}
                  onChange={(e) => setPlanForm({ ...planForm, extras: e.target.value })}
                  placeholder='["无限画布"]'
                  className="w-full bg-[#111317] border border-white/5 rounded-lg py-2 px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm text-white">启用此套餐</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.watermark}
                    onChange={(e) => setPlanForm({ ...planForm, watermark: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm text-white">显示水印</span>
                </label>
              </div>
              <button
                onClick={handleSavePlan}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isLoading ? '保存中...' : '保存套餐'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

