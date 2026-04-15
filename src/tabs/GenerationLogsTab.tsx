import React, { useState } from 'react';
import { History, Zap } from 'lucide-react';
import { getGenerationLogs, type GenerationLog } from '../adminApi';

interface GenerationLogsTabProps {
  isLoading: boolean;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function GenerationLogsTab({ isLoading, showToast }: GenerationLogsTabProps) {
  const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logFilter, setLogFilter] = useState({ user_id: '', model: '', type: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);

  const loadGenerationLogs = async () => {
    setLoading(true);
    try {
      const result = await getGenerationLogs({
        user_id: logFilter.user_id || undefined,
        model: logFilter.model || undefined,
        type: logFilter.type || undefined,
        start_date: logFilter.start_date || undefined,
        end_date: logFilter.end_date || undefined,
        limit: 20,
        offset: (logsPage - 1) * 20,
      });
      if (result.success && result.data) {
        setGenerationLogs(result.data.logs);
        setLogsTotal(result.data.total);
      }
    } catch (error) {
      console.error('Failed to load generation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLogs = () => {
    setLogsPage(1);
    loadGenerationLogs();
  };

  return (
    <div className="bg-[#1c1f26] rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white">生图日志</h2>
        <p className="text-slate-400 text-sm mt-1">共 {logsTotal} 条记录</p>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-white/5 bg-[#0d0f14]">
        <div className="grid grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="用户昵称"
            value={logFilter.user_id}
            onChange={(e) => setLogFilter({ ...logFilter, user_id: e.target.value })}
            className="bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <input
            type="text"
            placeholder="模型"
            value={logFilter.model}
            onChange={(e) => setLogFilter({ ...logFilter, model: e.target.value })}
            className="bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <input
            type="text"
            placeholder="类型"
            value={logFilter.type}
            onChange={(e) => setLogFilter({ ...logFilter, type: e.target.value })}
            className="bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <input
            type="date"
            placeholder="开始日期"
            value={logFilter.start_date}
            onChange={(e) => setLogFilter({ ...logFilter, start_date: e.target.value })}
            className="bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <div className="flex gap-2">
            <input
              type="date"
              placeholder="结束日期"
              value={logFilter.end_date}
              onChange={(e) => setLogFilter({ ...logFilter, end_date: e.target.value })}
              className="flex-1 bg-[#1c1f26] border border-white/5 rounded-lg py-2 px-3 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              onClick={handleSearchLogs}
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
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">时间</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">用户</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">模型</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">类型</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">消耗算力</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {generationLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#111317] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{log.userNickname || '未知'}</span>
                    <span className="text-xs text-slate-500">{log.userEmail || ''}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{log.model}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-medium">
                    {log.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600/20 text-rose-400 rounded-full text-xs font-bold">
                    <Zap className="w-3 h-3" />
                    {log.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {generationLogs.length === 0 && !loading && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">暂无生图记录</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {logsTotal > 20 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => { setLogsPage(p => Math.max(1, p - 1)); loadGenerationLogs(); }}
            disabled={logsPage === 1}
            className="px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-slate-400">
            第 {logsPage} / {Math.ceil(logsTotal / 20)} 页
          </span>
          <button
            onClick={() => { setLogsPage(p => p + 1); loadGenerationLogs(); }}
            disabled={logsPage >= Math.ceil(logsTotal / 20)}
            className="px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
