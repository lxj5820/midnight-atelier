import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Download, Quote, Trash2, Sparkles, RefreshCw, Maximize2, Wand2, Pencil, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApiKey } from '../ApiKeyContext';
import { useGeneration } from '../GenerationContext';
import { useTokenQuery } from '../context/TokenQueryContext';
import { downloadImage } from '../utils/download';
import { getGenerationHistoryAsync, deleteGenerationRecordFromDB, blobToBase64, cacheImage, getCachedImageBlob, isCacheKey, deleteCachedImage, getImageDimensions, getSizeFromRefImage, getClosestAspectRatio, dbOperations } from '../utils';
import { API_TIMEOUT_MS } from '../utils/constants';
import type { GenerationRecord, PreviewImageData } from '../types';
import ImageEditor from './ImageEditor';
import { RightPanel } from './layout/RightPanel';
import { GlowBlob } from './ui/GlowBlob';
import { useCachedImageUrl } from '../hooks/useCachedImage';

// 参考图缩略图 - 解析缓存 key
const RefImageThumb: React.FC<{ cacheKey: string; alt: string }> = ({ cacheKey, alt }) => {
  const [displayUrl] = useCachedImageUrl(cacheKey);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!displayUrl) { setDimensions(null); return; }
    getImageDimensions(displayUrl).then(dims => setDimensions(dims));
  }, [displayUrl]);

  if (!displayUrl) return <div className="w-full h-full flex items-center justify-center bg-surface-1 text-text-muted text-[10px]">已失效</div>;
  return (
    <div className="w-full h-full relative">
      <img src={displayUrl} alt={alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      {dimensions && (
        <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-bold rounded z-[2] leading-none">
          {getClosestAspectRatio(dimensions.width, dimensions.height)}
        </div>
      )}
    </div>
  );
};

// 历史缩略图组件 - 统一处理 cache key 和普通 URL，图片丢失/CORS/ORB 失败时显示占位符
const EditHistoryThumbnail: React.FC<{
  cacheKey: string;
  alt: string;
  className?: string;
  onMissing?: () => void;
}> = ({ cacheKey, alt, className, onMissing }) => {
  const [displayUrl, state] = useCachedImageUrl(cacheKey);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (state === 'missing' && isCacheKey(cacheKey) && onMissing) onMissing();
  }, [state, cacheKey, onMissing]);

  // URL 变化时重置错误状态
  useEffect(() => { setImgError(false); }, [displayUrl]);

  if (state === 'missing' || imgError || !displayUrl) {
    return (
      <div className={`${className || ''} flex flex-col items-center justify-center bg-surface-1 text-text-muted`}>
        <ImageOff className="w-6 h-6 mb-1" />
        <span className="text-[10px]">已失效</span>
      </div>
    );
  }
  return <img src={displayUrl} alt={alt} className={className} referrerPolicy="no-referrer" loading="lazy" onError={() => setImgError(true)} />;
};

// 缓存图片编辑器包装
const CachedEditImageEditor: React.FC<{
  cacheKey: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}> = ({ cacheKey, onSave, onCancel, onError }) => {
  return <ImageEditor imageUrl={cacheKey} onSave={onSave} onCancel={onCancel} onError={onError} />;
};

const POLISH_SYSTEM_PROMPT = `你是一个专业的 AI 图像提示词润色助手。你的任务是将用户输入的简单提示词润色成专业、详细、结构清晰的提示词。
1. 只输出润色后的提示词内容，不要输出任何解释、说明、标题、标签或其他内容
2. 保持原意但丰富细节，增强描述的专业性和准确性
3. 直接输出纯文本的提示词即可`;

interface EditWorkspaceProps {
  apiKey: string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setPreviewImage: (img: PreviewImageData | null) => void;
  onNavigateSettings?: () => void;
  isMobile?: boolean;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

const EditWorkspace: React.FC<EditWorkspaceProps> = ({ apiKey, showToast, setPreviewImage, onNavigateSettings, isMobile, isRightPanelOpen, onToggleRightPanel }) => {
  const { hasApiKey } = useApiKey();
  const { startGenerating, stopGenerating } = useGeneration();
  const { markStale } = useTokenQuery();
  const [prompt, setPrompt] = useState('');
  const [generatingCount, setGeneratingCount] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [thumbnailSize, setThumbnailSize] = useState(150);
  const [pendingResult, setPendingResult] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState('auto');
  const [quality, setQuality] = useState('2K');
  const [model, setModel] = useState('🍌全能图片V2');
  const models = ['🍌全能图片V2', '🍌全能图片PRO', 'GPT Image 2'];
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPolishing, setIsPolishing] = useState(false);

  // 解析缓存 key 为可显示的 blob URL
  const [displayResult] = useCachedImageUrl(result);
  const [displayPendingResult] = useCachedImageUrl(pendingResult);

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

  // 加载历史记录
  useEffect(() => {
    getGenerationHistoryAsync().then(history => {
      setGenerationHistory(history.filter(h => h.type === 'edit'));
    });
  }, [historyRefreshKey]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (generatingCount > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [generatingCount]);

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const base64 = await blobToBase64(file);
        const base64Url = `data:${file.type};base64,${base64}`;
        const cacheKey = await cacheImage(base64Url);
        setReferenceImages(prev => [...prev, cacheKey]);
      }
      showToast('success', `已添加 ${files.length} 张参考图`);
    } catch (error) {
      showToast('error', `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally { setIsUploading(false); }
  };

  const removeRefImage = (index: number) => setReferenceImages(prev => prev.filter((_, i) => i !== index));
  const handleUpload = () => fileInputRef.current?.click();
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(Array.from(e.target.files)); };
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) handleFiles(files);
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await handleFiles([file]);
          return;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleGenerate = async () => {
    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }
    if (!prompt.trim()) { showToast('error', '请输入提示词'); return; }
    if (referenceImages.length === 0) { showToast('error', '请上传至少一张参考图'); return; }

    setGeneratingCount(c => c + 1);
    const taskId = startGenerating('全能修改');

    // 保存当前参数快照，避免并发时参数被修改
    const currentPrompt = prompt;
    const currentRefImages = [...referenceImages];
    const currentQuality = quality;
    const currentAspectRatio = aspectRatio;
    const currentModel = model;

    // 异步执行生成，不阻塞 UI
    (async () => {
      try {
        if (currentModel === 'GPT Image 2') {
          const gptImage2SizeMap: Record<string, Record<string, string>> = {
            '1K': { '1:1': '1024x1024', '2:3': '1024x1536', '3:2': '1536x1024', '9:16': '720x1280', '16:9': '1280x720' },
            '2K': { '1:1': '2048x2048', '2:3': '1360x2048', '3:2': '2048x1360', '9:16': '1152x2048', '16:9': '2048x1152' },
            '4K': { '1:1': '2880x2880', '2:3': '2304x3456', '3:2': '3456x2304', '9:16': '2160x3840', '16:9': '3840x2160' }
          };

          // 当 auto 比例且有参考图时，根据参考图实际比例计算尺寸
          let imageSize: string;
          if (currentAspectRatio === 'auto' && currentRefImages.length > 0) {
            const refBlob = await getCachedImageBlob(currentRefImages[0]);
            if (refBlob) {
              const refDims = await getImageDimensions(URL.createObjectURL(refBlob));
              imageSize = refDims ? getSizeFromRefImage(refDims.width, refDims.height, currentQuality) : 'auto';
            } else {
              imageSize = 'auto';
            }
          } else {
            imageSize = gptImage2SizeMap[currentQuality]?.[currentAspectRatio] || 'auto';
          }
          const gptApiUrl = 'https://newapi.asia/v1/images/edits';
          const formData = new FormData();
          formData.append('model', 'gpt-image-2');
          formData.append('prompt', currentPrompt);
          formData.append('size', imageSize);
          formData.append('quality', currentQuality === '4K' ? 'high' : currentQuality === '2K' ? 'medium' : 'low');
          formData.append('n', '1');
          formData.append('input_fidelity', '0.5');

          for (let i = 0; i < currentRefImages.length; i++) {
            const blob = await getCachedImageBlob(currentRefImages[i]);
            if (!blob) continue;
            const fileName = i === 0 ? 'image.png' : `image_${i}.png`;
            formData.append('image', blob, fileName);
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const response = await fetch(gptApiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: formData, signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error?.message || `请求失败 (${response.status})`); }
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || 'API 返回错误');
          let imageUrl = '';
          if (data.data?.b64_json) {
            imageUrl = `data:image/png;base64,${data.data.b64_json}`;
          } else if (Array.isArray(data.data) && data.data.length > 0) {
            const imgData = data.data[0];
            if (imgData.b64_json) imageUrl = `data:image/png;base64,${imgData.b64_json}`;
            else if (imgData.url) imageUrl = imgData.url;
          } else if (data.choices && data.choices.length > 0) {
            const content = data.choices[0].message?.content;
            if (content) imageUrl = content.startsWith('data:') ? content : `data:image/png;base64,${content}`;
          }
          if (!imageUrl) throw new Error('响应中未找到图片');

          const recordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const resultCacheKey = await cacheImage(imageUrl, recordId);

          const record: GenerationRecord = {
            id: recordId,
            type: 'edit',
            prompt: currentPrompt,
            imageUrl: resultCacheKey,
            referenceImageUrl: currentRefImages[0],
            referenceImageUrls: currentRefImages,
            createdAt: new Date().toISOString(),
            resolution: { width: 0, height: 0, quality: currentQuality, aspectRatio: currentAspectRatio },
          };
          await dbOperations.save(record);
          setResult(resultCacheKey);
          setPendingResult(resultCacheKey);
          setHistoryRefreshKey(k => k + 1);
          showToast('success', '生成成功！');
          markStale();
        } else {
        const modelMap: Record<string, string> = { '🍌全能图片V2': 'gemini-3.1-flash-image-preview', '🍌全能图片PRO': 'gemini-3-pro-image-preview' };
        const apiModel = modelMap[currentModel] || 'gemini-2.5-flash-image-preview';
        const apiUrl = `https://newapi.asia/v1beta/models/${apiModel}:generateContent`;

        // 当 auto 比例且有参考图时，根据参考图实际比例计算
        let effectiveAspectRatio = currentAspectRatio;
        if (currentAspectRatio === 'auto' && currentRefImages.length > 0) {
          const refBlob = await getCachedImageBlob(currentRefImages[0]);
          if (refBlob) {
            const refDims = await getImageDimensions(URL.createObjectURL(refBlob));
            if (refDims) effectiveAspectRatio = getClosestAspectRatio(refDims.width, refDims.height);
          }
        }

        const parts: any[] = [];
        for (const imgUrl of currentRefImages) {
          const blob = await getCachedImageBlob(imgUrl);
          if (!blob) continue;
          const base64 = await blobToBase64(blob);
          parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } });
        }
        parts.push({ text: currentPrompt });

        const requestBody = { contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(effectiveAspectRatio !== 'auto' && { aspectRatio: effectiveAspectRatio }), imageSize: currentQuality } } };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(requestBody), signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error?.message || `请求失败 (${response.status})`); }
        const data = await response.json();
        const resultParts = data.candidates?.[0]?.content?.parts || [];
        let imageUrl = '';
        for (const part of resultParts) { if (part.inlineData) { imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; } }
        if (!imageUrl) throw new Error('响应中未找到图片');

        const recordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const resultCacheKey = await cacheImage(imageUrl, recordId);

        const record: GenerationRecord = {
          id: recordId,
          type: 'edit',
          prompt: currentPrompt,
          imageUrl: resultCacheKey,
          referenceImageUrl: currentRefImages[0],
          referenceImageUrls: currentRefImages,
          createdAt: new Date().toISOString(),
          resolution: { width: 0, height: 0, quality: currentQuality, aspectRatio: currentAspectRatio },
        };
        await dbOperations.save(record);

        setResult(resultCacheKey);
        setPendingResult(resultCacheKey);
        setHistoryRefreshKey(k => k + 1);
        showToast('success', '生成成功！');
        markStale();
        }
      } catch (error) {
        console.error('Generation error:', error);
        showToast('error', error instanceof Error ? error.message : '生成失败');
      } finally {
        setGeneratingCount(c => c - 1);
        stopGenerating(taskId);
      }
    })();
  };

  const handleDownload = async (url: string) => {
    try {
      await downloadImage(url, `edit-${Date.now()}.png`);
    } catch (e: any) {
      showToast('error', e?.message || '下载失败');
    }
  };
  const handleClearResult = () => { setResult(null); setReferenceImages([]); };
  const handleClearHistory = async () => {
    for (const record of generationHistory) {
      await deleteGenerationRecordFromDB(record.id);
    }
    setGenerationHistory([]);
    showToast('info', '历史记录已清除');
  };

  const handleItemClick = (record: GenerationRecord) => {
    setResult(record.imageUrl);
    setPrompt(record.prompt);
    if (record.referenceImageUrls && record.referenceImageUrls.length > 0) {
      setReferenceImages(record.referenceImageUrls);
    } else if (record.referenceImageUrl) {
      setReferenceImages([record.referenceImageUrl]);
    }
  };

  const handleDeleteHistory = async (id: string, silent = false) => {
    const record = generationHistory.find(r => r.id === id);
    if (record) {
      deleteCachedImage(record.imageUrl);
      if (record.referenceImageUrl) deleteCachedImage(record.referenceImageUrl);
      if (record.referenceImageUrls) record.referenceImageUrls.forEach(u => deleteCachedImage(u));
    }
    await deleteGenerationRecordFromDB(id);
    setGenerationHistory(prev => prev.filter(r => r.id !== id));
    if (!silent) showToast('info', '已删除');
  };

  const referenceImageContent = (
    <div className="mb-6 mt-2">
      <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-3">参考图</p>
      {referenceImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {referenceImages.map((img, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-surface-1 relative group">
              <RefImageThumb cacheKey={img} alt={`参考图 ${idx + 1}`} />
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingImageIndex(idx)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Pencil className="w-3 h-3 text-white" />
                </button>
                <button onClick={() => removeRefImage(idx)} className="p-1.5 bg-white/20 hover:bg-rose-500/50 rounded-lg transition-colors" title="删除">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div
        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-border-subtle hover:border-indigo-500/30'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUpload}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-indigo-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">上传中...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-text-secondary">
            <Upload className="w-5 h-5" />
            <span className="text-xs">{referenceImages.length > 0 ? '添加更多' : '点击或拖拽上传'}</span>
            <span className="text-[10px] text-text-muted">支持 Ctrl+V 粘贴</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-row flex-1 overflow-hidden w-full h-full" style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar ${isMobile ? '' : 'mr-80'}`} style={{ flex: 1, maxWidth: isMobile ? '100%' : 'calc(100vw - 320px)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 flex items-center gap-3">
            <div className="px-3.5 py-2 bg-indigo-500/10 rounded-xl flex items-center gap-2 border border-indigo-500/15">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">全能修改</span>
            </div>
            {generatingCount > 0 && (
              <div className="px-3 py-1.5 bg-indigo-500/10 rounded-lg flex items-center gap-2 text-xs text-indigo-400 border border-indigo-500/15">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>生成中{generatingCount > 1 ? ` (${generatingCount})` : ''}，可继续操作...</span>
              </div>
            )}
          </div>

          {/* Result Area */}
          {(result || pendingResult) ? (
            <div className="mb-6">
              <div className="aspect-video rounded-2xl overflow-hidden bg-surface-2 relative group shadow-2xl shadow-black/30 border border-border-subtle/70">
                <img src={displayResult || displayPendingResult || ''} alt="生成结果" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            </div>
          ) : generatingCount > 0 ? (
            <div className="aspect-video rounded-2xl border-2 border-dashed bg-surface-2/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 border-indigo-500/50">
              <div className="w-12 h-12 bg-surface-1 rounded-xl flex items-center justify-center mb-4 shadow-lg animate-pulse border border-border-subtle">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">正在生成图片...</h3>
              <p className="text-text-muted text-xs">可切换到其他菜单继续操作</p>
            </div>
          ) : (
            <div className="upload-zone aspect-video flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 shadow-lg border-border-subtle">
              <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 border border-border-subtle">
                <Wand2 className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">全能图片修改</h3>
              <p className="text-text-muted text-xs">上传参考图并输入修改指令</p>
            </div>
          )}

          {/* Result Actions */}
          {(result || pendingResult) && (
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => { const img = result || pendingResult; if (img) { setReferenceImages([img]); showToast('info', '已设置为参考图'); } }} className="btn-ghost flex items-center gap-2 px-3.5 py-2 bg-surface-2 text-text-primary text-xs font-medium rounded-lg border border-border-subtle">
                <Quote className="w-3.5 h-3.5" />引用
              </button>
              <button onClick={() => { const img = result || pendingResult; if (img) handleDownload(img); }} className="btn-ghost flex items-center gap-2 px-3.5 py-2 bg-surface-2 text-text-primary text-xs font-medium rounded-lg border border-border-subtle">
                <Download className="w-3.5 h-3.5" />下载
              </button>
              <button onClick={() => { setResult(null); setPendingResult(null); }} className="flex items-center gap-2 px-3.5 py-2 bg-surface-2 hover:bg-rose-500/10 text-rose-400 text-xs font-medium rounded-lg border border-border-subtle hover:border-rose-500/20 transition-all duration-200">
                <Trash2 className="w-4 h-4" />清除
              </button>
            </div>
          )}

          {/* History Records */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-text-primary">全能修改 <span className="text-text-muted font-normal text-xs ml-2">历史记录</span></h2>
                {generationHistory.length > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded-full">{generationHistory.length}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {generationHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-xs">缩略图</span>
                    <input type="range" min="60" max="300" value={thumbnailSize} onChange={(e) => setThumbnailSize(Number(e.target.value))} className="w-20 h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    <span className="text-text-muted text-xs">{thumbnailSize}px</span>
                  </div>
                )}
                {generationHistory.length > 0 && (
                  <button onClick={handleClearHistory} className="text-rose-400 text-xs font-medium hover:text-rose-300 transition-colors">清除记录</button>
                )}
              </div>
            </div>
            {generationHistory.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {generationHistory.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="history-card rounded-xl overflow-hidden bg-surface-2 relative group cursor-pointer shrink-0 border border-border-subtle/70"
                    style={{ width: thumbnailSize, height: thumbnailSize }}
                    onClick={() => handleItemClick(record)}
                  >
                    <EditHistoryThumbnail
                      cacheKey={record.imageUrl}
                      alt={record.prompt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onMissing={() => handleDeleteHistory(record.id, true)}
                    />
                    <div className="thumb-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-[10px] text-white font-medium truncate">全能修改</p>
                      <p className="text-[9px] text-text-secondary mt-0.5">
                        {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); setPrompt(record.prompt); if (record.referenceImageUrls && record.referenceImageUrls.length > 0) { setReferenceImages(record.referenceImageUrls); showToast('success', `已引用提示词和${record.referenceImageUrls.length}张参考图`); } else if (record.referenceImageUrl) { setReferenceImages([record.referenceImageUrl]); showToast('success', '已引用提示词和参考图'); } else { showToast('info', '已引用提示词'); } }} className="p-1.5 thumb-btn rounded hover:!bg-indigo-500/50 transition-colors" title="复用"><Quote className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: record.imageUrl, name: record.prompt || '生成结果', prompt: record.prompt, createdAt: record.createdAt }); }} className="p-1.5 thumb-btn rounded transition-colors" title="放大"><Maximize2 className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(record.imageUrl); }} className="p-1.5 thumb-btn rounded transition-colors" title="下载"><Download className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }} className="p-1.5 thumb-btn rounded hover:!bg-rose-500/50 transition-colors" title="删除"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 rounded-xl">
                <p className="text-text-muted text-xs">暂无历史记录</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightPanel
        model={model}
        setModel={setModel}
        models={models}
        presets={[]}
        selectedPreset=""
        setSelectedPreset={() => {}}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        quality={quality}
        setQuality={setQuality}
        prompt={prompt}
        setPrompt={setPrompt}
        placeholder="输入提示词，描述你想要如何修改这张图片..."
        handlePolishPrompt={handlePolishPrompt}
        handleGenerate={handleGenerate}
        isGenerating={generatingCount > 0}
        generatingCount={generatingCount}
        isPolishing={isPolishing}
        activeMenuItem="edit"
        hasApiKey={hasApiKey}
        onNavigateSettings={onNavigateSettings}
        extraContent={referenceImageContent}
        isMobile={isMobile}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={onToggleRightPanel}
      />
      {/* Image Editor Modal */}
      {editingImageIndex !== null && referenceImages[editingImageIndex] && (
        <CachedEditImageEditor
          cacheKey={referenceImages[editingImageIndex]}
          onSave={async (editedImage) => {
            try {
              const cacheKey = await cacheImage(editedImage);
              setReferenceImages(prev => {
                const newImages = [...prev];
                newImages[editingImageIndex!] = cacheKey;
                return newImages;
              });
              setEditingImageIndex(null);
              showToast('success', '图片编辑已保存');
            } catch {
              setEditingImageIndex(null);
              showToast('error', '编辑图片保存失败');
            }
          }}
          onCancel={() => setEditingImageIndex(null)}
          onError={(message) => {
            setEditingImageIndex(null);
            showToast('error', message);
          }}
        />
      )}
      {isMobile && (
        <GlowBlob
          size={112}
          onClick={onToggleRightPanel}
          visible={!isRightPanelOpen}
        />
      )}
    </div>
  );
};

export default EditWorkspace;