import { motion } from 'motion/react';
import { CreditCard, BarChart3, Zap, Plus } from 'lucide-react';

interface BillingViewProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface BillingHistoryItem {
  date: string;
  amount: string;
  status: string;
  desc: string;
}

export default function BillingView({ showToast }: BillingViewProps) {
  const billingHistory: BillingHistoryItem[] = [
    { date: '2026-03-01', amount: '¥199.00', status: '已支付', desc: '专业版月度订阅' },
    { date: '2026-02-01', amount: '¥199.00', status: '已支付', desc: '专业版月度订阅' },
    { date: '2026-01-01', amount: '¥199.00', status: '已支付', desc: '专业版月度订阅' },
  ];

  const handleRenew = () => {
    showToast('success', '正在跳转到续费页面...');
  };

  const handleChangePlan = () => {
    showToast('info', '正在打开计划选择页面...');
  };

  const handleBuyCredits = () => {
    showToast('info', '正在打开购买页面...');
  };

  const handleEditPayment = () => {
    showToast('info', '正在编辑支付方式...');
  };

  const handleDownloadInvoice = (date: string) => {
    showToast('success', `正在下载 ${date} 的发票...`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline text-white tracking-tight">账单管理</h1>
          <p className="text-slate-400">查看您的订阅计划、支付方式及历史账单。</p>
        </div>

        {/* Current Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">当前计划</p>
                  <h2 className="text-3xl font-black font-headline">专业版 (Pro)</h2>
                </div>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">按月计费</span>
              </div>
              <div className="flex items-end gap-2 mb-8">
                <span className="text-4xl font-black font-headline">¥199</span>
                <span className="text-indigo-200 text-sm mb-1">/ 月</span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleRenew}
                  className="bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors"
                >
                  续费订阅
                </button>
                <button
                  onClick={handleChangePlan}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors"
                >
                  更改计划
                </button>
              </div>
            </div>
            <Zap className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
          </div>

          <div className="bg-[#1c1f26] rounded-2xl p-8 border border-white/5 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">AI 额度使用</p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black font-headline text-white">842</span>
                  <span className="text-slate-500 text-xs">/ 1000 额度</span>
                </div>
                <div className="w-full bg-[#111317] h-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '84.2%' }}
                    className="h-full bg-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">额度将于 2026-04-01 重置</p>
              </div>
            </div>
            <button
              onClick={handleBuyCredits}
              className="w-full mt-6 text-indigo-400 text-xs font-bold hover:text-indigo-300 transition-colors flex items-center justify-center gap-2"
            >
              购买额外额度 <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">支付方式</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl p-6 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-[#111317] rounded flex items-center justify-center border border-white/5">
                <span className="text-[10px] font-bold text-slate-400">VISA</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Visa 尾号 4242</p>
                <p className="text-xs text-slate-500">有效期至 12/2026</p>
              </div>
            </div>
            <button
              onClick={handleEditPayment}
              className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              编辑
            </button>
          </div>
        </section>

        {/* Billing History */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-headline text-white">历史账单</h2>
          </div>
          <div className="bg-[#1c1f26] rounded-2xl overflow-hidden border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111317] text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">日期</th>
                  <th className="px-6 py-4">描述</th>
                  <th className="px-6 py-4">金额</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {billingHistory.map((item, i) => (
                  <tr key={i} className="text-white hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.date}</td>
                    <td className="px-6 py-4 text-slate-400">{item.desc}</td>
                    <td className="px-6 py-4 font-bold">{item.amount}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">{item.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(item.date)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold text-xs"
                      >
                        下载发票
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
