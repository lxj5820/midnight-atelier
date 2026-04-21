import React from 'react';
import { Plus, RefreshCw, Zap, Check, Sparkles } from 'lucide-react';
import type { VisualPreset } from '../../visualPresetConfig';
import { Dropdown } from '../ui/Dropdown';

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
  placeholder?: string;
  handlePolishPrompt: () => void;
  handleGenerate: () => void;
  isGenerating: boolean;
  isPolishing: boolean;
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
  placeholder = '输入您的建筑构想...',
  handlePolishPrompt,
  handleGenerate,
  isGenerating,
  isPolishing,
}) => {
  return (
    <aside className="w-80 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-4 overflow-y-auto custom-scrollbar shrink-0 fixed right-0 top-16 h-[calc(100vh-4rem)] z-30">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">引擎与模型</p>
        <Dropdown
          options={models.map(m => ({ value: m, label: m }))}
          value={model}
          onChange={setModel}
          className="w-full"
          direction="down"
        />
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
              <Dropdown
                options={[
                  { value: 'auto', label: '自动' },
                  ...(model === '🍌全能图片V2'
                    ? ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(ratio => ({ value: ratio, label: ratio }))
                    : ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(ratio => ({ value: ratio, label: ratio }))
                  )
                ]}
                value={aspectRatio}
                onChange={setAspectRatio}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">画质</p>
              <Dropdown
                options={['1K', '2K', '4K'].map(q => ({ value: q, label: q }))}
                value={quality}
                onChange={setQuality}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111317] rounded-xl p-4 mb-4">
          <textarea
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-white resize-none outline-none min-h-[80px]"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handlePolishPrompt}
              disabled={isPolishing || !prompt.trim()}
              className="p-1.5 text-slate-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="润色提示"
            >
              <Sparkles className={`w-4 h-4 ${isPolishing ? 'animate-spin' : ''}`} />
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
