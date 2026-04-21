import React from 'react';
import { RefreshCw } from 'lucide-react';

export const LoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );
};

export const LoadingPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-[#111317]">
      <div className="text-center">
        <LoadingSpinner className="mb-4" />
        <p className="text-slate-400 text-sm">加载中...</p>
      </div>
    </div>
  );
};
