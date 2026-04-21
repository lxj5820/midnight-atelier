import React from 'react';
import { ChevronDown, Check, Plus, RefreshCw, Zap } from 'lucide-react';
import type { VisualPreset } from '../../visualPresetConfig';

interface RightPanelProps {
  model: string;
  setModel: (m: string) => void;
  models: string[];
  presets: VisualPreset[];
  selectedPreset: string;
  setSelectedPreset: (p: string) => void;
  aspectRatio: string;
  setAspectRatio: (r: string) => void;
  quality: string;
  setQuality: (q: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  handleAddToPrompt: () => void;
  handleGenerate: () => void;
  isGenerating: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  model,
  setModel,
  models,
  presets,
  selectedPreset,
  setSelectedPreset,
  aspectRatio,
  setAspectRatio,
  quality,
  setQuality,
  prompt,
  setPrompt,
  handleAddToPrompt,
  handleGenerate,
  isGenerating,
}) => {
  return (
    <aside className="w-64 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-4 overflow-y-auto custom-scrollbar shrink-0">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">引擎与模型</p>
        <div className="relative group">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-[#111317] border border-[#2a2e38] rounded-xl py-3 px-4 text-sm text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-[#1c1f26] hover:border-slate-600 shadow-inner"
          >
            {models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-indigo-400 transition-colors" />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">效果预设</p>
        <div className="grid grid-cols-2 gap-3">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.label)}
              className={`aspect-video rounded-lg overflow-hidden relative group border-2 transition-all ${
                selectedPreset === preset.label ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-slate-600'
              }`}
            >
              <img
                src={preset.bgImage}
                alt={preset.label}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">{preset.label}</span>
              {selectedPreset === preset.label && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-[#2a2e38]">
        <div className="mb-4">
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">图像比例</p>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-[#111317] border border-[#2a2e38] rounded-lg py-2 px-3 text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="auto">自动</option>
                {model === '🍌全能图片V2' ? (
                  ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))
                ) : (
                  ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">画质</p>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-[#111317] border border-[#2a2e38] rounded-lg py-2 px-3 text-xs text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {['1K', '2K', '4K'].map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[#111317] rounded-xl p-4 mb-4">
          <textarea
            placeholder="输入您的建筑构想..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-white resize-none outline-none min-h-[80px]"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleAddToPrompt}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="添加提示词"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPrompt('')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="清空"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 fill-current" />
          )}
          {isGenerating ? '生成中...' : '立即生成'}
        </button>
      </div>
    </aside>
  );
};
