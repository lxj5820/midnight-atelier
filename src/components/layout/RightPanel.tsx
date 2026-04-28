import React, { useState } from 'react';
import { Plus, RefreshCw, Zap, Check, Sparkles, FileJson, X, Trash2 } from 'lucide-react';
import type { VisualPreset } from '../../visualPresetConfig';
import type { MenuItemId } from '../../menuConfig';
import { Dropdown } from '../ui/Dropdown';
import { PromptGenerator } from '../PromptGenerator';

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
  activeMenuItem?: MenuItemId;
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
  activeMenuItem,
}) => {
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  const showGeneratorButton = activeMenuItem && ['effects', 'style', 'edit'].includes(activeMenuItem);

  return (
    <aside className="w-80 bg-surface-2 border-l border-border flex flex-col shrink-0 fixed right-0 top-14 h-[calc(100vh-3.5rem)] z-30">
      <div className="p-4 pb-3">
        <p className="text-[10px] font-bold text-slate-500/70 uppercase tracking-wider mb-2.5">引擎与模型</p>
        <Dropdown
          options={models.map(m => ({ value: m, label: m }))}
          value={model}
          onChange={setModel}
          className="w-full"
          direction="down"
        />
        {presets.length > 0 && (
          <p className="text-[10px] font-bold text-slate-500/70 uppercase tracking-wider mb-2.5 mt-5">效果预设</p>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-0">
          <div className="grid grid-cols-2 gap-2.5">
            {presets.map(preset => {
              const isSelected = selectedPreset === preset.label;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.label)}
                  className={`preset-card aspect-video rounded-xl overflow-hidden relative group border-2 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 glow-indigo'
                      : 'border-white/[0.04] hover:border-white/[0.12]'
                  }`}
                >
                  <img
                    src={preset.bgImage}
                    alt={preset.label}
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider z-[2] drop-shadow-lg">
                    {preset.label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center z-[3] shadow-lg shadow-indigo-500/30">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border p-4">
        <div className="mb-4">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500/70 uppercase tracking-wider mb-2">图像比例</p>
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
              <p className="text-[10px] font-bold text-slate-500/70 uppercase tracking-wider mb-2">画质</p>
              <Dropdown
                options={['1K', '2K', '4K'].map(q => ({ value: q, label: q }))}
                value={quality}
                onChange={setQuality}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 rounded-xl p-3.5 mb-4 border border-white/[0.04]">
          <textarea
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-white resize-none outline-none min-h-[72px] placeholder:text-slate-600"
          />
          <div className="flex justify-end gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
            {showGeneratorButton && (
              <button
                onClick={() => setShowPromptGenerator(true)}
                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
                title="提示词生成器"
              >
                <FileJson className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handlePolishPrompt}
              disabled={isPolishing || !prompt.trim()}
              className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
              title="润色提示"
            >
              <Sparkles className={`w-4 h-4 ${isPolishing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setPrompt('')}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
              title="清空"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-primary w-full text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 fill-current" />
          )}
          {isGenerating ? '生成中...' : '立即生成'}
        </button>
      </div>

      <PromptGenerator
        isOpen={showPromptGenerator}
        onClose={() => setShowPromptGenerator(false)}
        onApply={(text) => setPrompt(text)}
      />
    </aside>
  );
};
