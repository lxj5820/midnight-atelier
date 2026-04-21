import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, RefreshCw, ChevronLeft, ChevronRight, Maximize2,
  Upload, X, Share2, Trash2, RotateCcw, Download, Pencil,
  Plus, Zap, ChevronDown, Check, Layers
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useGeneration } from '../../GenerationContext';
import { useApiKey } from '../../ApiKeyContext';
import {
  blobToBase64, getImageDimensions, getClosestAspectRatio,
  getComputePointsCost, getResolution,
  dbOperations,
  getGenerationHistoryAsync, getGenerationHistoryByTypeAsync,
} from '../../utils';
import { getPromptPlaceholder, menuItemsConfig, extractVariablesFromPrompt } from '../../menuConfig';
import { getPresetsForMenu } from '../../visualPresetConfig';
import type { MenuItemId } from '../../menuConfig';
import type { GenerationRecord } from '../../types';
import { RightPanel } from '../layout/RightPanel';
import { lazy } from 'react';

const PanoramaViewer = lazy(() => import('../PanoramaViewer'));
const ImageEditor = lazy(() => import('../ImageEditor'));

interface WorkspaceViewProps {
  activeMenuItem: MenuItemId;
  model: string;
  setModel: (m: string) => void;
  selectedPreset: string;
  setSelectedPreset: (p: string) => void;
  aspectRatio: string;
  setAspectRatio: (r: string) => void;
  quality: string;
  setQuality: (q: string) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setPreviewImage: (img: string | null) => void;
  editingImageIndex: number | null;
  setEditingImageIndex: (index: number | null) => void;
}

const getMenuItemLabel = (id: MenuItemId): string => {
  const items: Record<MenuItemId, string> = {
    'workspace': '布置图', 'colors': '色彩平图', '3d': '3D轴测图',
    'effects': '效果图', 'style': '风格替换', 'lighting': '光阴替换',
    'storyboard': '分镜生成', 'panorama': '360全景', 'analysis': '材料分析图',
    'board': '设计展板', 'mood': '情绪材料版', 'explode': '空间爆炸图', 'edit': '全能修改'
  };
  return items[id];
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  activeMenuItem, model, setModel, selectedPreset, setSelectedPreset,
  aspectRatio, setAspectRatio, quality, setQuality, showToast,
  setPreviewImage, editingImageIndex, setEditingImageIndex
}) => {
  const { apiKey } = useApiKey();
  const { startGenerating, stopGenerating } = useGeneration();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [result, setResult] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(150);
  const [showPanoramaViewer, setShowPanoramaViewer] = useState(false);
  const [panoramaImageUrl, setPanoramaImageUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const models = ['🍌全能图片V2', '🍌全能图片PRO'];
  const filteredPresets = getPresetsForMenu(activeMenuItem);
  const promptPlaceholder = getPromptPlaceholder(activeMenuItem);

  // 检查比例支持
  useEffect(() => {
    const proRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'];
    if (model === '🍌全能图片PRO' && !proRatios.includes(aspectRatio)) {
      setAspectRatio('1:1');
    }
  }, [model, aspectRatio, setAspectRatio]);

  // 加载历史记录
  useEffect(() => {
    getGenerationHistoryByTypeAsync(activeMenuItem).then(setGenerationHistory);
  }, [activeMenuItem, historyRefreshKey]);

  // 自动切换预设
  useEffect(() => {
    if (!filteredPresets.find(p => p.label === selectedPreset)) {
      setSelectedPreset(filteredPresets[0]?.label || '');
    }
  }, [activeMenuItem, filteredPresets, selectedPreset, setSelectedPreset]);

  // 粘贴处理
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setIsUploading(true);
            try {
              const base64 = await blobToBase64(file);
              const base64Url = `data:${file.type};base64,${base64}`;
              setImageUrls([base64Url]);
              if (aspectRatio === 'auto') {
                const dims = await getImageDimensions(base64Url);
                if (dims) {
                  const closest = getClosestAspectRatio(dims.width, dims.height);
                  setAspectRatio(closest);
                  showToast('success', `已自动选择比例 ${closest}`);
                }
              } else {
                showToast('success', '图片已粘贴');
              }
            } catch (error) {
              showToast('error', `粘贴失败: ${error instanceof Error ? error.message : '未知错误'}`);
            } finally {
              setIsUploading(false);
            }
          }
          return;
        }
      }
      const text = e.clipboardData?.getData('text');
      if (text) {
        e.preventDefault();
        setPrompt(prev => prev ? `${prev}\n${text}` : text);
        showToast('info', '文本已添加到提示词');
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showToast, aspectRatio]);

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return;
    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }

    const menuItem = menuItemsConfig.find(item => item.id === activeMenuItem);
    const builtInPrompt = menuItem?.prompt || '';
    const presetItem = filteredPresets.find(p => p.label === selectedPreset);
    const presetPrompt = presetItem?.prompt || '';
    let promptParts = [];
    if (builtInPrompt) promptParts.push(builtInPrompt);
    if (presetPrompt) promptParts.push(presetPrompt);
    if (prompt.trim()) promptParts.push(prompt.trim());
    const finalPrompt = promptParts.join('，');
    if (!finalPrompt.trim()) { showToast('error', '请输入提示词'); return; }

    isGeneratingRef.current = true;
    setIsGenerating(true);
    const taskId = startGenerating(getMenuItemLabel(activeMenuItem));

    try {
      const modelMap: Record<string, string> = {
        '🍌全能图片V2': 'gemini-3.1-flash-image-preview',
        '🍌全能图片PRO': 'gemini-3-pro-image-preview'
      };
      const apiModel = modelMap[model] || 'gemini-2.5-flash-image-preview';
      const apiUrl = `https://newapi.asia/v1beta/models/${apiModel}:generateContent`;

      let requestBody: any;
      let hasValidImages = false;

      if (imageUrls.length > 0) {
        const parts = [];
        for (const imgUrl of imageUrls) {
          try {
            const imgResponse = await fetch(imgUrl);
            if (!imgResponse.ok) continue;
            const blob = await imgResponse.blob();
            const base64 = await blobToBase64(blob);
            parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } });
            hasValidImages = true;
          } catch (e) { /* skip */ }
        }
        if (hasValidImages && parts.length > 0) {
          parts.push({ text: finalPrompt });
          requestBody = {
            contents: [{ role: "user", parts }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(aspectRatio !== 'auto' && { aspectRatio }), imageSize: quality } }
          };
        }
      }

      if (!requestBody) {
        requestBody = {
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(aspectRatio !== 'auto' && { aspectRatio }), imageSize: quality } }
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800000);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        let errorMsg;
        if (status === 401 || status === 403) errorMsg = 'API 密钥无效或余额不足';
        else if (status === 429) errorMsg = '请求过于频繁，请稍后再试';
        else if (status >= 500) errorMsg = `服务器繁忙 (${status})`;
        else errorMsg = err.error?.message || `请求失败 (${status})`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'API 返回错误');
      if (!data.candidates || data.candidates.length === 0) throw new Error('未收到有效响应');

      const parts = data.candidates?.[0]?.content?.parts || [];
      let imageUrl = '';
      for (const part of parts) {
        if (part.inlineData) { imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; }
      }
      if (!imageUrl) throw new Error('响应中未找到图片');

      setResult(imageUrl);
      setImageUrls([]);
      const resolution = aspectRatio !== 'auto' ? getResolution(aspectRatio, quality) : null;
      const record: GenerationRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: activeMenuItem, prompt, imageUrl,
        referenceImageUrl: imageUrls[0] || undefined,
        createdAt: new Date().toISOString(),
        resolution: { width: resolution?.width || 0, height: resolution?.height || 0, quality, aspectRatio },
      };
      await dbOperations.save(record);
      setHistoryRefreshKey(k => k + 1);
      showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！`);
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const isTimeout = errorMessage === 'signal is aborted without reason' || errorMessage.includes('aborted');
      if (isTimeout) showToast('error', '请求超时（2分钟），可能是网络问题');
      else showToast('error', `生成失败: ${errorMessage}`);
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      stopGenerating(taskId);
    }
  };

  const handleClearResult = () => { setResult(null); setImageUrls([]); showToast('info', '已清除生成结果'); };
  const handleUpload = () => fileInputRef.current?.click();
  const handleViewAll = () => {
    getGenerationHistoryAsync().then(history => {
      if (history.length === 0) showToast('info', '暂无历史记录');
      else showToast('info', `共 ${history.length} 条历史记录`);
    });
  };
  const handleClearHistory = () => {
    dbOperations.clear(activeMenuItem);
    setGenerationHistory([]);
    showToast('info', `已清除 ${getMenuItemLabel(activeMenuItem)} 的历史记录`);
  };
  const handleDownloadHistory = async (record: GenerationRecord) => {
    try {
      const response = await fetch(record.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${record.type}-${record.id}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('success', '图片下载开始');
    } catch { showToast('error', '下载失败'); }
  };
  const handleDeleteHistory = (id: string) => {
    dbOperations.delete(id);
    setGenerationHistory(prev => prev.filter(h => h.id !== id));
    showToast('info', '已删除');
  };
  const handleItemClick = (record: GenerationRecord) => {
    setPrompt(record.prompt);
    if (record.referenceImageUrl) setImageUrls([record.referenceImageUrl]);
    setResult(record.imageUrl);
    showToast('info', '已加载历史图片和参考图');
  };
  const [isPolishing, setIsPolishing] = useState(false);

  const POLISH_SYSTEM_PROMPT = `你是一个专业的 AI 图像提示词润色助手。你的任务是将用户输入的简单提示词润色成专业、详细、结构清晰的提示词。

重要规则：
1. 只输出润色后的提示词内容，不要输出任何解释、说明、标题、标签或其他内容
2. 不要使用 markdown 格式，不要使用代码块
3. 直接输出纯文本的提示词即可`;

  const handlePolishPrompt = async () => {
    if (isPolishing) return;
    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }
    if (!prompt.trim()) { showToast('info', '请先输入提示词内容'); return; }

    setIsPolishing(true);
    try {
      const apiUrl = 'https://newapi.asia/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';
      const requestBody = {
        contents: [{ parts: [{ text: `请润色并优化以下提示词：${prompt}` }] }],
        systemInstruction: { parts: [{ text: POLISH_SYSTEM_PROMPT }] },
        generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 2048 }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('API 请求失败');
      const data = await response.json();
      const polishedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (polishedText) {
        // 去除 markdown 代码块
        const cleanText = polishedText.replace(/```markdown\n?|\n?```/g, '').trim();
        setPrompt(cleanText);
        showToast('success', '提示词已润色');
      }
    } catch (err) {
      showToast('error', err instanceof Error && err.message === 'AbortError' ? '润色超时' : '润色失败');
    } finally {
      setIsPolishing(false);
    }
  };
  const handleCopyResult = async () => {
    if (result) {
      try { await navigator.clipboard.writeText(result); showToast('success', '图片链接已复制到剪贴板'); }
      catch { showToast('error', '复制失败'); }
    }
  };
  const handleShare = () => { if (result) showToast('info', '分享功能开发中...'); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await uploadFile(files[0]);
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) await uploadFile(e.target.files[0]);
  };
  const uploadFile = async (file: File) => {
    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { showToast('error', '不支持的文件类型'); return; }
    if (file.size > 20 * 1024 * 1024) { showToast('error', '文件大小超过 20MB'); return; }
    setIsUploading(true);
    try {
      const base64 = await blobToBase64(file);
      const base64Url = `data:${file.type};base64,${base64}`;
      setImageUrls([base64Url]);
      if (aspectRatio === 'auto') {
        const dims = await getImageDimensions(base64Url);
        if (dims) { setAspectRatio(getClosestAspectRatio(dims.width, dims.height)); showToast('success', '已自动选择比例'); }
      } else showToast('success', '参考图片已添加');
    } catch (error) {
      showToast('error', `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally { setIsUploading(false); }
  };

  return (
    <div className="flex flex-row flex-1 overflow-hidden w-full h-full">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar mr-80">
        <div className="max-w-5xl mx-auto">
          {/* Current Action Indicator */}
          <div className="mb-4 flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-600/10 rounded-xl flex items-center gap-2 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">{getMenuItemLabel(activeMenuItem)}</span>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </div>
            )}
          </div>

          {/* Result Area */}
          {result && imageUrls.length > 0 && showCompareMode ? (
            <div className="mb-6">
              <div
                className="aspect-video rounded-xl overflow-hidden bg-[#1c1f26] relative group shadow-xl shadow-black/20 select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setSliderPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                }}
              >
                <img src={imageUrls[0]} alt="Reference" className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                  <img src={result} alt="Generated Result" className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-lg" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4 text-slate-700" /><ChevronRight className="w-4 h-4 text-slate-700" />
                  </div>
                </div>
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">原图</div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-500/80 text-white text-xs rounded-full">生成图</div>
              </div>
            </div>
          ) : result ? (
            <div className="mb-6 relative">
              <div className="aspect-video rounded-xl overflow-hidden bg-[#1c1f26] relative group shadow-xl shadow-black/20">
                <img src={result} alt="Generated Result" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                {activeMenuItem === 'panorama' && (
                  <button
                    onClick={() => { setPanoramaImageUrl(result); setShowPanoramaViewer(true); }}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-sm font-bold rounded-full shadow-lg transition-all backdrop-blur-sm"
                    title="全景查看"
                  >
                    <Maximize2 className="w-4 h-4" />全景查看
                  </button>
                )}
              </div>
            </div>
          ) : imageUrls.length > 0 ? (
            <div className="mb-6 relative">
              <div className={`aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-[#1c1f26]' : 'border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]'}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleUpload}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" />
                {isUploading ? (
                  <><RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" /><p className="text-slate-500 text-sm">上传中...</p></>
                ) : (
                  <><img src={imageUrls[0]} alt="参考图" className="w-full h-full object-contain" onClick={handleUpload} />
                    <button onClick={(e) => { e.stopPropagation(); setImageUrls([]); }} className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-colors"><X className="w-4 h-4 text-white" /></button></>
                )}
              </div>
              {activeMenuItem === 'panorama' && (
                <button
                  onClick={() => { setPanoramaImageUrl(imageUrls[0]); setShowPanoramaViewer(true); }}
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-sm font-bold rounded-full shadow-lg transition-all backdrop-blur-sm"
                  title="全景查看"
                >
                  <Maximize2 className="w-4 h-4" />全景查看
                </button>
              )}
            </div>
          ) : (
            <div className={`aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 ${isDragging ? 'border-indigo-500 bg-[#1c1f26]' : 'border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]'}`}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleUpload}>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" />
              <div className="w-12 h-12 bg-[#111317] rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform"><Upload className="w-6 h-6 text-indigo-500" /></div>
              <h3 className="text-base font-bold text-white mb-1">点击或拖拽图片上传</h3>
              <p className="text-slate-500 text-xs">支持 JPG, PNG, WEBP</p>
            </div>
          )}

          {/* Result Actions */}
          {(result || imageUrls.length > 0) && (
            <div className="flex items-center justify-end gap-2 mb-4">
              {imageUrls.length > 0 && (
                <button onClick={() => setEditingImageIndex(0)} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-indigo-500/20 text-indigo-400 text-sm rounded-lg transition-colors" title="图片编辑器">
                  <Pencil className="w-4 h-4" />图片编辑器
                </button>
              )}
              {result && imageUrls.length > 0 && (
                <button
                  onClick={() => setShowCompareMode(!showCompareMode)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${showCompareMode ? 'bg-indigo-600 text-white' : 'bg-[#1c1f26] hover:bg-[#2a2e38] text-white'}`}
                  title="图片对比模式"
                >
                  <Layers className="w-4 h-4" />{showCompareMode ? '关闭对比' : '对比模式'}
                </button>
              )}
              {result && imageUrls.length === 0 && (
                <><button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors"><Share2 className="w-4 h-4" />分享</button>
                  <button onClick={handleCopyResult} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors"><Download className="w-4 h-4" />复制链接</button></>
              )}
              <button onClick={handleClearResult} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-rose-500/20 text-rose-400 text-sm rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />{result ? '清除结果' : '清除参考图'}
              </button>
            </div>
          )}

          {/* Recent Generations */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white">{getMenuItemLabel(activeMenuItem)} <span className="text-slate-500 font-normal text-xs ml-2">历史记录</span></h2>
                {generationHistory.length > 0 && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded-full">{generationHistory.length}</span>}
              </div>
              <div className="flex items-center gap-3">
                {generationHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">缩略图</span>
                    <input type="range" min="60" max="300" value={thumbnailSize} onChange={(e) => setThumbnailSize(Number(e.target.value))}
                      className="w-20 h-1 bg-[#2a2e38] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    <span className="text-slate-500 text-xs">{thumbnailSize}px</span>
                  </div>
                )}
                {generationHistory.length > 0 && <button onClick={handleClearHistory} className="text-rose-400 text-xs font-medium hover:text-rose-300 transition-colors">清除记录</button>}
                <button onClick={handleViewAll} className="text-indigo-400 text-xs font-medium hover:text-indigo-300 transition-colors">
                  {generationHistory.length > 0 ? `查看全部 ${generationHistory.length}` : '暂无记录'}
                </button>
              </div>
            </div>
            {generationHistory.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {generationHistory.map((record, index) => (
                  <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    className="rounded-lg overflow-hidden bg-[#1c1f26] relative group cursor-pointer shrink-0"
                    style={{ width: thumbnailSize, height: thumbnailSize }} onClick={() => handleItemClick(record)}>
                    <img src={record.imageUrl} alt={record.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-[10px] text-white font-medium truncate">{record.prompt || '无描述'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {record.resolution && <span className="ml-1 text-indigo-400">{record.resolution.width > 0 ? `${record.resolution.width}×${record.resolution.height} ` : ''}{record.resolution.quality}</span>}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); setPrompt(record.prompt); if (record.referenceImageUrl) { setImageUrls([record.referenceImageUrl]); showToast('success', '已复用提示词和参考图'); } else showToast('success', '已复用提示词'); }}
                          className="p-1.5 bg-white/10 rounded hover:bg-indigo-500/50 transition-colors" title="复用"><RotateCcw className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewImage(record.imageUrl); }} className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors" title="放大"><Maximize2 className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadHistory(record); }} className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors" title="下载"><Download className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }} className="p-1.5 bg-white/10 rounded hover:bg-rose-500/50 transition-colors" title="删除"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 rounded-xl"><p className="text-slate-500 text-xs">暂无历史记录</p></div>
            )}
          </div>
        </div>

        {/* Panorama Viewer Modal */}
        {showPanoramaViewer && panoramaImageUrl && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-white" /></div>}>
            <PanoramaViewer imageUrl={panoramaImageUrl} isOpen={showPanoramaViewer} onClose={() => setShowPanoramaViewer(false)} />
          </Suspense>
        )}

        {/* Image Editor Modal */}
        {editingImageIndex !== null && imageUrls[editingImageIndex] && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-white" /></div>}>
            <ImageEditor
              imageUrl={imageUrls[editingImageIndex]}
              onSave={(editedImage) => {
                setImageUrls(prev => { const newImages = [...prev]; newImages[editingImageIndex!] = editedImage; return newImages; });
                setEditingImageIndex(null);
                showToast('success', '图片编辑已保存');
              }}
              onCancel={() => setEditingImageIndex(null)}
            />
          </Suspense>
        )}
      </div>

      {/* Right Panel */}
      <RightPanel
        model={model} setModel={setModel} models={models}
        presets={filteredPresets} selectedPreset={selectedPreset} setSelectedPreset={setSelectedPreset}
        aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
        quality={quality} setQuality={setQuality}
        prompt={prompt} setPrompt={setPrompt}
        placeholder={promptPlaceholder}
        handlePolishPrompt={handlePolishPrompt}
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
        isPolishing={isPolishing}
      />
    </div>
  );
};

import { Suspense } from 'react';
