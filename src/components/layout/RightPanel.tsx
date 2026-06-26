import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Zap, Check, Sparkles, FileJson, X, Trash2 } from 'lucide-react';
import type { VisualPreset } from '../../visualPresetConfig';
import type { MenuItemId } from '../../menuConfig';
import { Dropdown } from '../ui/Dropdown';
import { PromptGenerator } from '../PromptGenerator';
import { getPrice } from '../../utils/cost';

const ASPECT_RATIO_ICONS: Record<string, React.ReactNode> = {
  "1:1": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="4" y="0" width="16" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "16:9": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="3" y="3" width="18" height="10" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "9:16": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="7.5" y="0" width="9" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "4:3": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="3" y="1.5" width="18" height="13" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "3:4": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="6" y="0" width="12" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "21:9": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="3" y="4" width="18" height="8" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "3:2": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="3" y="2" width="18" height="12" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "2:3": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="8" y="0" width="8" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "1:4": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="10" y="0" width="4" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "4:1": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="3" y="5" width="18" height="6" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "1:8": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="11" y="0" width="2" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "8:1": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="3" y="6" width="18" height="4" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "4:5": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="7" y="0" width="10" height="16" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
  "5:4": (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="4.5" y="2" width="15" height="12" rx="2" stroke="#CCCCCC" strokeWidth="1"/>
    </svg>
  ),
};

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
  generatingCount?: number;
  isPolishing: boolean;
  activeMenuItem?: MenuItemId;
  hasApiKey: boolean;
  onNavigateSettings?: () => void;
  extraContent?: React.ReactNode;
  isMobile?: boolean;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
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
  generatingCount = 0,
  isPolishing,
  activeMenuItem,
  hasApiKey,
  onNavigateSettings,
  extraContent,
  isMobile,
  isRightPanelOpen,
  onToggleRightPanel,
}) => {
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  const showGeneratorButton = activeMenuItem && ['effects', 'style', 'edit'].includes(activeMenuItem);

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {isRightPanelOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onToggleRightPanel}
              />
              <motion.aside
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-2 right-2 bottom-2 bg-surface-2 border border-border flex flex-col z-50 rounded-2xl shadow-2xl"
                style={{ maxHeight: '75dvh' }}
              >
                {/* 拖拽指示条 */}
                <div className="flex justify-center pt-2.5 pb-1">
                  <div className="w-8 h-1 bg-text-muted/30 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-4 pb-2">
                  <span className="text-sm font-bold text-text-primary">参数设置</span>
                  <button type="button" onClick={onToggleRightPanel} className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors">
                    <X className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                  {/* 模型 + 比例 + 画质 同一行 */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex-[2] min-w-0">
                      <Dropdown
                        options={models.map(m => ({ value: m, label: m === 'GPT Image 2' ? <><img src="/gpt-icon.png" alt="GPT" className="w-3 h-3 inline-block" /> Image 2</> : m === 'wan2.7-image-pro' ? 'wan2.7' : m }))}
                        value={model}
                        onChange={setModel}
                        className="w-full"
                        direction="up"
                      />
                    </div>
                    <div className="flex-1 shrink-0">
                      <Dropdown
                        options={[
                          { value: 'auto', label: '自动' },
                          ...(model === '🍌全能图片V2'
                            ? ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(ratio => ({ value: ratio, label: ratio }))
                            : model === 'GPT Image 2' || model === 'wan2.7-image-pro'
                              ? ['1:1', '2:3', '3:2', '9:16', '16:9'].map(ratio => ({ value: ratio, label: ratio }))
                              : ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(ratio => ({ value: ratio, label: ratio }))
                          )
                        ]}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        className="w-full"
                        direction="up"
                      />
                    </div>
                    <div className="flex-1 shrink-0">
                      <Dropdown
                        options={['1K', '2K', '4K'].map(q => ({ value: q, label: q }))}
                        value={quality}
                        onChange={setQuality}
                        className="w-full"
                        direction="up"
                      />
                    </div>
                  </div>

                  {/* 效果预设 - 横向滚动，缩小 */}
                  {presets.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-2">效果预设</p>
                      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
                        {presets.map(preset => {
                          const isSelected = selectedPreset === preset.label;
                          return (
                            <button type="button"
                              key={preset.id}
                              onClick={() => setSelectedPreset(preset.label)}
                              className={`preset-card shrink-0 w-24 aspect-video rounded-lg overflow-hidden relative group border-2 ${
                                isSelected
                                  ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                                  : 'border-border-subtle/70 hover:border-indigo-500/40'
                              }`}
                            >
                              <img
                                src={preset.bgImage}
                                alt={preset.label}
                                loading="lazy"
                                decoding="async"
                                width={160}
                                height={90}
                                className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-300 bg-placeholder-bg"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span className="preset-label absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase tracking-wider z-[2] drop-shadow">
                                {preset.label}
                              </span>
                              {isSelected && (
                                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center z-[3]">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {extraContent}

                  {/* 提示词输入 */}
                  <div className="bg-surface-1 rounded-xl p-3 mb-3 border border-border-subtle/70">
                    <textarea
                      placeholder={placeholder}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full bg-transparent border-none text-sm text-text-primary resize-none outline-none min-h-[60px] placeholder:text-text-muted"
                    />
                    <div className="flex justify-end gap-1.5 mt-1.5 pt-1.5 border-t border-border-subtle/70">
                      {showGeneratorButton && (
                        <button type="button"
                          onClick={() => setShowPromptGenerator(true)}
                          className="p-1.5 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
                          title="提示词生成器"
                        >
                          <FileJson className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button"
                        onClick={handlePolishPrompt}
                        disabled={isPolishing || !prompt.trim()}
                        className="p-1.5 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="润色提示"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isPolishing ? 'animate-spin' : ''}`} />
                      </button>
                      <button type="button"
                        onClick={() => setPrompt('')}
                        className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                        title="清空"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 生成按钮 */}
                  <button type="button"
                    onClick={() => !hasApiKey && onNavigateSettings ? onNavigateSettings() : handleGenerate()}
                    className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                      !hasApiKey
                        ? 'bg-gradient-to-br from-[#3f3a2e] to-[#2e2a22] text-amber-200/80 hover:text-amber-200 border border-amber-500/15 cursor-pointer'
                        : 'btn-primary text-white'
                    }`}
                  >
                    {!hasApiKey ? (
                      <><Zap className="w-4 h-4 fill-current" />请配置API</>
                    ) : isGenerating ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" />生成中{generatingCount > 1 ? ` (${generatingCount})` : ''}...</>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        {getPrice(model, quality) !== null ? <span className="opacity-70">{getPrice(model, quality) < 0.1 ? getPrice(model, quality).toFixed(2) : getPrice(model, quality)}</span> : null}
                        立即生成
                      </>
                    )}
                  </button>
                </div>
                <PromptGenerator
                  isOpen={showPromptGenerator}
                  onClose={() => setShowPromptGenerator(false)}
                  onApply={(text) => setPrompt(text)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <aside className="w-80 bg-surface-2 border-l border-border flex flex-col shrink-0 fixed right-0 top-14 h-[calc(100vh-3.5rem)] z-30">
      <div className="p-4 pb-3">
        <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-2.5">引擎与模型</p>
        <Dropdown
          options={models.map(m => ({ value: m, label: m === 'GPT Image 2' ? <><img src="/gpt-icon.png" alt="GPT" className="w-4 h-4 inline-block" /> Image 2</> : m === 'wan2.7-image-pro' ? 'wan2.7' : m }))}
          value={model}
          onChange={setModel}
          className="w-full"
          direction="down"
        />
        {presets.length > 0 && (
          <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-2.5 mt-5">效果预设</p>
        )}
      </div>

      {(presets.length > 0 || extraContent) && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-0">
          {presets.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {presets.map(preset => {
              const isSelected = selectedPreset === preset.label;
              return (
                <button type="button"
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.label)}
                  className={`preset-card aspect-video rounded-xl overflow-hidden relative group border-2 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 glow-indigo'
                      : 'border-border-subtle/70 hover:border-indigo-500/40'
                  }`}
                >
                  <img
                    src={preset.bgImage}
                    alt={preset.label}
                    loading="lazy"
                    decoding="async"
                    width={320}
                    height={180}
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-300 bg-placeholder-bg"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="preset-label absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider z-[2] drop-shadow">
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
          )}
          {extraContent}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border p-4">
        <div className="mb-4">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-2">图像比例</p>
              <Dropdown
                options={[
                  { value: 'auto', label: '自动' },
                  ...(model === '🍌全能图片V2'
                    ? ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(ratio => ({ value: ratio, label: ratio, icon: ASPECT_RATIO_ICONS[ratio] }))
                    : model === 'GPT Image 2' || model === 'wan2.7-image-pro'
                      ? ['1:1', '2:3', '3:2', '9:16', '16:9'].map(ratio => ({ value: ratio, label: ratio, icon: ASPECT_RATIO_ICONS[ratio] }))
                      : ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(ratio => ({ value: ratio, label: ratio, icon: ASPECT_RATIO_ICONS[ratio] }))
                  )
                ]}
                value={aspectRatio}
                onChange={setAspectRatio}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-2">画质</p>
              <Dropdown
                options={['1K', '2K', '4K'].map(q => ({ value: q, label: q }))}
                value={quality}
                onChange={setQuality}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 rounded-xl p-3.5 mb-4 border border-border-subtle/70">
          <textarea
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-text-primary resize-none outline-none min-h-[72px] placeholder:text-text-muted"
          />
          <div className="flex justify-end gap-1.5 mt-2 pt-2 border-t border-border-subtle/70">
            {showGeneratorButton && (
              <button type="button"
                onClick={() => setShowPromptGenerator(true)}
                className="p-2 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
                title="提示词生成器"
              >
                <FileJson className="w-4 h-4" />
              </button>
            )}
            <button type="button"
              onClick={handlePolishPrompt}
              disabled={isPolishing || !prompt.trim()}
              className="p-2 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
              title="润色提示"
            >
              <Sparkles className={`w-4 h-4 ${isPolishing ? 'animate-spin' : ''}`} />
            </button>
            <button type="button"
              onClick={() => setPrompt('')}
              className="p-2 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
              title="清空"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <button type="button"
          onClick={() => !hasApiKey && onNavigateSettings ? onNavigateSettings() : handleGenerate()}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            !hasApiKey
              ? 'bg-gradient-to-br from-[#3f3a2e] to-[#2e2a22] text-amber-200/80 hover:text-amber-200 border border-amber-500/15 hover:border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.06)] hover:shadow-[0_0_20px_rgba(245,158,11,0.10)] cursor-pointer'
              : 'btn-primary text-white'
          }`}
        >
          {!hasApiKey ? (
            <>
              <Zap className="w-4 h-4 fill-current" />
              请配置API
            </>
          ) : isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              生成中{generatingCount > 1 ? ` (${generatingCount})` : ''}...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              {getPrice(model, quality) !== null ? <span className="opacity-70">{getPrice(model, quality) < 0.1 ? getPrice(model, quality).toFixed(2) : getPrice(model, quality)}</span> : null}
              立即生成
            </>
          )}
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
