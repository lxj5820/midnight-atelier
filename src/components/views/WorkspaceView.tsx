import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import {
  Sparkles, RefreshCw, ChevronLeft, ChevronRight, Maximize2,
  Upload, X, Share2, Trash2, RotateCcw, Download, Pencil,
  Layers
} from 'lucide-react';
import { useGeneration } from '../../GenerationContext';
import { useApiKey } from '../../ApiKeyContext';
import { useTokenQuery } from '../../context/TokenQueryContext';
import {
  blobToBase64, getImageDimensions, getClosestAspectRatio,
  getComputePointsCost, getResolution, getSizeFromRefImage,
  dbOperations,
  getGenerationHistoryAsync, getGenerationHistoryByTypeAsync,
  cacheImage, getCachedImage, getCachedImageBlob, isCacheKey, deleteCachedImage,
} from '../../utils';
import { API_TIMEOUT_MS } from '../../utils/constants';
import { downloadImage } from '../../utils/download';
import {
  getPromptPlaceholder, menuItemsConfig
} from '../../menuConfig';
import { getPresetsForMenu } from '../../visualPresetConfig';
import type { MenuItemId } from '../../menuConfig';
import type { GenerationRecord, PreviewImageData } from '../../types';
import { RightPanel } from '../layout/RightPanel';
import { GlowBlob } from '../ui/GlowBlob';
import { lazy } from 'react';
import { useCachedImageUrl } from '../../hooks/useCachedImage';

const PanoramaViewer = lazy(() => import('../PanoramaViewer'));
const ImageEditor = lazy(() => import('../ImageEditor'));

// 历史缩略图组件 - 解析缓存 key；图片丢失/CORS/ORB 失败时显示占位符
const HistoryThumbnail: React.FC<{
  cacheKey: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onMissing?: () => void;
}> = ({ cacheKey, alt, className, onClick, onMissing }) => {
  const [displayUrl, state] = useCachedImageUrl(cacheKey);
  const [imgError, setImgError] = useState(false);
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;

  useEffect(() => {
    if (state !== 'missing' || !isCacheKey(cacheKey)) return;
    // 延迟触发 onMissing，避免与缓存写入竞态导致新记录被误删
    const timer = setTimeout(() => {
      onMissingRef.current?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [state, cacheKey]);
  useEffect(() => { setImgError(false); }, [displayUrl]);

  if (state !== 'loaded' || imgError || !displayUrl) {
    return (
      <div className={`${className || ''} flex flex-col items-center justify-center bg-surface-1 text-text-muted`} onClick={onClick}>
        <ImageOff className="w-6 h-6 mb-1" />
        <span className="text-[10px]">已失效</span>
      </div>
    );
  }
  return <img src={displayUrl} alt={alt} className={className} referrerPolicy="no-referrer" loading="lazy" onClick={onClick} onError={() => setImgError(true)} />;
};

// 缓存图片编辑器包装 - 解析缓存 key 后传给 ImageEditor
const CachedImageEditor: React.FC<{
  cacheKey: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}> = ({ cacheKey, onSave, onCancel, onError }) => {
  return <ImageEditor imageUrl={cacheKey} onSave={onSave} onCancel={onCancel} onError={onError} />;
};

// 缓存全景查看器包装 - 解析缓存 key 后传给 PanoramaViewer
const CachedPanoramaViewer: React.FC<{ cacheKey: string; isOpen: boolean; onClose: () => void }> = ({ cacheKey, isOpen, onClose }) => {
  const [displayUrl] = useCachedImageUrl(cacheKey);
  if (!displayUrl) return null;
  return <PanoramaViewer imageUrl={displayUrl} isOpen={isOpen} onClose={onClose} />;
};

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
  setPreviewImage: (img: PreviewImageData | null) => void;
  editingImageIndex: number | null;
  setEditingImageIndex: (index: number | null) => void;
  onNavigateSettings?: () => void;
  isMobile?: boolean;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

const getMenuItemLabel = (id: MenuItemId): string => {
  const items: Record<MenuItemId, string> = {
    'workspace': '布置图', 'colors': '色彩平图', '3d': '3D轴测图',
    'effects': '效果图', 'style': '风格替换', 'lighting': '光阴替换',
    'storyboard': '分镜生成', 'panorama': '360全景', 'analysis': '材料分析图',
    'board': '设计展板', 'mood': '情绪材料版', 'explode': '空间爆炸图', 'edit': '全能修改', 'video': '视频生成'
  };
  return items[id];
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  activeMenuItem, model, setModel, selectedPreset, setSelectedPreset,
  aspectRatio, setAspectRatio, quality, setQuality, showToast,
  setPreviewImage, editingImageIndex, setEditingImageIndex, onNavigateSettings,
  isMobile, isRightPanelOpen, onToggleRightPanel
}) => {
  const { apiKey, hasApiKey } = useApiKey();
  const { startGenerating, stopGenerating } = useGeneration();
  const { markStale } = useTokenQuery();
  const [prompt, setPrompt] = useState('');
  const [generatingCount, setGeneratingCount] = useState(0);
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
  const [refImageDimensions, setRefImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [resultDimensions, setResultDimensions] = useState<{ width: number; height: number } | null>(null);
  const [customRefImage, setCustomRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  // 解析缓存 key 为可显示的 blob URL
  const [displayResult] = useCachedImageUrl(result);
  const [displayRefImage] = useCachedImageUrl(imageUrls[0]);
  const [displayCustomRefImage] = useCachedImageUrl(customRefImage);

  // 获取上传参考图的尺寸
  useEffect(() => {
    if (!displayRefImage) { setRefImageDimensions(null); return; }
    getImageDimensions(displayRefImage).then(dims => setRefImageDimensions(dims));
  }, [displayRefImage]);

  // 获取生成结果的尺寸
  useEffect(() => {
    if (!displayResult) { setResultDimensions(null); return; }
    getImageDimensions(displayResult).then(dims => setResultDimensions(dims));
  }, [displayResult]);

  const models = ['🍌全能图片V2', '🍌全能图片PRO', 'GPT Image 2'];
  const filteredPresets = getPresetsForMenu(activeMenuItem);
  const promptPlaceholder = getPromptPlaceholder(activeMenuItem);

  useEffect(() => {
    const proRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'];
    const gptRatios = ['1:1', '2:3', '3:2', '9:16', '16:9', 'auto'];
    if (model === 'GPT Image 2' && !gptRatios.includes(aspectRatio)) {
      setAspectRatio('1:1');
    } else if (model === '🍌全能图片PRO' && !proRatios.includes(aspectRatio)) {
      setAspectRatio('1:1');
    }
  }, [model, aspectRatio, setAspectRatio]);

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

  useEffect(() => {
    let cancelled = false;
    getGenerationHistoryByTypeAsync(activeMenuItem).then(history => {
      if (!cancelled) setGenerationHistory(history);
    });
    return () => { cancelled = true; };
  }, [activeMenuItem, historyRefreshKey]);

  useEffect(() => {
    if (!filteredPresets.find(p => p.label === selectedPreset)) {
      setSelectedPreset(filteredPresets[0]?.label || '');
    }
  }, [activeMenuItem, filteredPresets, selectedPreset, setSelectedPreset]);

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
              // 存入缓存，使用 cache key
              const cacheKey = await cacheImage(base64Url);
              setImageUrls([cacheKey]);
              showToast('success', '图片已粘贴');
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
    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }

    const menuItem = menuItemsConfig.find(item => item.id === activeMenuItem);
    const builtInPrompt = menuItem?.prompt || '';
    const presetItem = filteredPresets.find(p => p.label === selectedPreset);
    const presetPrompt = presetItem?.prompt || '';
    const isCustomPreset = selectedPreset === '自定义';
    const hasCustomRef = isCustomPreset && !!customRefImage;
    let promptParts = [];
    if (builtInPrompt) promptParts.push(builtInPrompt);
    if (presetPrompt) promptParts.push(presetPrompt);
    if (prompt.trim()) promptParts.push(prompt.trim());
    if (hasCustomRef) promptParts.push('参考图2的风格');
    const finalPrompt = promptParts.join('，');
    if (!finalPrompt.trim()) { showToast('error', '请输入提示词'); return; }

    setGeneratingCount(c => c + 1);
    const taskId = startGenerating(getMenuItemLabel(activeMenuItem));

    // 保存当前参数快照，避免并发时参数被修改
    const currentPrompt = prompt;
    const currentImageUrls = hasCustomRef && customRefImage
      ? [...imageUrls, customRefImage]
      : [...imageUrls];
    const currentQuality = quality;
    const currentAspectRatio = aspectRatio;
    const currentModel = model;

    try {
      if (currentModel === 'GPT Image 2') {
        const gptImage2SizeMap: Record<string, Record<string, string>> = {
          '1K': { '1:1': '1024x1024', '2:3': '1024x1536', '3:2': '1536x1024', '9:16': '720x1280', '16:9': '1280x720' },
          '2K': { '1:1': '2048x2048', '2:3': '1360x2048', '3:2': '2048x1360', '9:16': '1152x2048', '16:9': '2048x1152' },
          '4K': { '1:1': '2880x2880', '2:3': '2304x3456', '3:2': '3456x2304', '9:16': '2160x3840', '16:9': '3840x2160' }
        };

        // 当 auto 比例且有参考图时，根据参考图实际比例计算尺寸
        let imageSize: string;
        if (currentAspectRatio === 'auto' && currentImageUrls.length > 0) {
          const refBlob = await getCachedImageBlob(currentImageUrls[0]);
          if (refBlob) {
            const refDims = await getImageDimensions(URL.createObjectURL(refBlob));
            imageSize = refDims ? getSizeFromRefImage(refDims.width, refDims.height, currentQuality) : 'auto';
          } else {
            imageSize = 'auto';
          }
        } else {
          imageSize = gptImage2SizeMap[currentQuality]?.[currentAspectRatio] || 'auto';
        }

        let gptApiUrl: string;
        let gptRequestBody: any;

        if (currentImageUrls.length > 0) {
          gptApiUrl = 'https://newapi.asia/v1/images/edits';
          const formData = new FormData();
          formData.append('model', 'gpt-image-2');
          formData.append('prompt', finalPrompt);
          formData.append('size', imageSize);
          formData.append('quality', currentQuality === '4K' ? 'high' : currentQuality === '2K' ? 'medium' : 'low');
          formData.append('n', '1');
          formData.append('input_fidelity', '0.5');

          for (let i = 0; i < currentImageUrls.length; i++) {
            const blob = await getCachedImageBlob(currentImageUrls[i]);
            if (!blob) continue;
            const fileName = i === 0 ? 'image.png' : `image_${i}.png`;
            formData.append('image', blob, fileName);
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const response = await fetch(gptApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData,
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
          const refCacheKey = currentImageUrls[0] || undefined;

          setResult(resultCacheKey);
          const resolution = currentAspectRatio !== 'auto' ? getResolution(currentAspectRatio, currentQuality) : null;
          const record: GenerationRecord = {
            id: recordId,
            type: activeMenuItem, prompt: currentPrompt, imageUrl: resultCacheKey,
            referenceImageUrl: refCacheKey,
            createdAt: new Date().toISOString(),
            resolution: { width: resolution?.width || 0, height: resolution?.height || 0, quality: currentQuality, aspectRatio: currentAspectRatio },
          };
          const saved = await dbOperations.save(record);
          if (saved) {
            setHistoryRefreshKey(k => k + 1);
            showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！`);
          } else {
            showToast('error', '图片已生成，但保存历史记录失败');
          }
          markStale();
        } else {
          gptApiUrl = 'https://newapi.asia/v1/images/generations';
          gptRequestBody = {
            model: 'gpt-image-2',
            prompt: finalPrompt,
            size: imageSize,
            quality: currentQuality === '4K' ? 'high' : currentQuality === '2K' ? 'medium' : 'low',
            n: 1,
            format: 'png'
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const response = await fetch(gptApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(gptRequestBody),
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

          setResult(resultCacheKey);
          const resolution = currentAspectRatio !== 'auto' ? getResolution(currentAspectRatio, currentQuality) : null;
          const record: GenerationRecord = {
            id: recordId,
            type: activeMenuItem, prompt: currentPrompt, imageUrl: resultCacheKey,
            referenceImageUrl: undefined,
            createdAt: new Date().toISOString(),
            resolution: { width: resolution?.width || 0, height: resolution?.height || 0, quality: currentQuality, aspectRatio: currentAspectRatio },
          };
          const saved = await dbOperations.save(record);
          if (saved) {
            setHistoryRefreshKey(k => k + 1);
            showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！`);
          } else {
            showToast('error', '图片已生成，但保存历史记录失败');
          }
          markStale();
        }
      } else {
      const modelMap: Record<string, string> = {
        '🍌全能图片V2': 'gemini-3.1-flash-image-preview',
        '🍌全能图片PRO': 'gemini-3-pro-image-preview'
      };
      const apiModel = modelMap[currentModel] || 'gemini-2.5-flash-image-preview';
      const apiUrl = `https://newapi.asia/v1beta/models/${apiModel}:generateContent`;

      // 当 auto 比例且有参考图时，根据参考图实际比例计算
      let effectiveAspectRatio = currentAspectRatio;
      if (currentAspectRatio === 'auto' && currentImageUrls.length > 0) {
        const refBlob = await getCachedImageBlob(currentImageUrls[0]);
        if (refBlob) {
          const refDims = await getImageDimensions(URL.createObjectURL(refBlob));
          if (refDims) effectiveAspectRatio = getClosestAspectRatio(refDims.width, refDims.height);
        }
      }

      let requestBody: any;
      let hasValidImages = false;

      if (currentImageUrls.length > 0) {
        const parts = [];
        for (const imgUrl of currentImageUrls) {
          try {
            const blob = await getCachedImageBlob(imgUrl);
            if (!blob) continue;
            const base64 = await blobToBase64(blob);
            parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } });
            hasValidImages = true;
          } catch (e) { /* skip */ }
        }
        if (hasValidImages && parts.length > 0) {
          parts.push({ text: finalPrompt });
          requestBody = {
            contents: [{ role: "user", parts }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(effectiveAspectRatio !== 'auto' && { aspectRatio: effectiveAspectRatio }), imageSize: currentQuality } }
          };
        }
      }

      if (!requestBody) {
        requestBody = {
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(effectiveAspectRatio !== 'auto' && { aspectRatio: effectiveAspectRatio }), imageSize: currentQuality } }
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
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

      const recordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const resultCacheKey = await cacheImage(imageUrl, recordId);
      const refCacheKey = currentImageUrls[0] || undefined;

      setResult(resultCacheKey);
      const resolution = currentAspectRatio !== 'auto' ? getResolution(currentAspectRatio, currentQuality) : null;
      const record: GenerationRecord = {
        id: recordId,
        type: activeMenuItem, prompt: currentPrompt, imageUrl: resultCacheKey,
        referenceImageUrl: refCacheKey,
        createdAt: new Date().toISOString(),
        resolution: { width: resolution?.width || 0, height: resolution?.height || 0, quality: currentQuality, aspectRatio: currentAspectRatio },
      };
      const saved = await dbOperations.save(record);
      if (saved) {
        setHistoryRefreshKey(k => k + 1);
        showToast('success', `${getMenuItemLabel(activeMenuItem)}生成成功！`);
      } else {
        showToast('error', '图片已生成，但保存历史记录失败');
      }
      markStale();
      }
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const isTimeout = errorMessage === 'signal is aborted without reason' || errorMessage.includes('aborted');
      if (isTimeout) showToast('error', '请求超时（10分钟），可能是网络问题');
      else showToast('error', `生成失败: ${errorMessage}`);
    } finally {
      setGeneratingCount(c => c - 1);
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
      await downloadImage(record.imageUrl, `${record.type}-${record.id}.png`);
      showToast('success', '图片下载开始');
    } catch (e: any) {
      showToast('error', e?.message || '下载失败');
    }
  };
  const handleDeleteHistory = (id: string, silent = false) => {
    const record = generationHistory.find(h => h.id === id);
    if (record) {
      deleteCachedImage(record.imageUrl);
      if (record.referenceImageUrl) deleteCachedImage(record.referenceImageUrl);
    }
    dbOperations.delete(id);
    setGenerationHistory(prev => prev.filter(h => h.id !== id));
    if (!silent) showToast('info', '已删除');
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
      const apiUrl = 'https://newapi.asia/v1beta/models/gemini-3.5-flash:generateContent';
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

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let errMsg = `API 请求失败 (${response.status})`;
        try { const errJson = JSON.parse(errText); errMsg = errJson.error?.message || errMsg; } catch { if (errText) errMsg += `: ${errText.slice(0, 100)}`; }
        throw new Error(errMsg);
      }
      const data = await response.json();
      const polishedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (polishedText) {
        const cleanText = polishedText.replace(/```markdown\n?|\n?```/g, '').trim();
        setPrompt(cleanText);
        showToast('success', '提示词已润色');
      } else {
        const blockReason = data.promptFeedback?.blockReason;
        throw new Error(blockReason ? `内容被拦截: ${blockReason}` : 'API 返回内容为空');
      }
    } catch (err) {
      const msg = err instanceof Error ? (err.name === 'AbortError' ? '润色超时' : err.message) : '润色失败';
      showToast('error', `润色失败: ${msg}`);
    } finally {
      setIsPolishing(false);
    }
  };
  const handleCopyResult = async () => {
    if (result) {
      try { await navigator.clipboard.writeText(result); showToast('success', '图片缓存链接已复制'); }
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
      // 存入缓存，使用 cache key
      const cacheKey = await cacheImage(base64Url);
      setImageUrls([cacheKey]);
      showToast('success', '参考图片已添加');
    } catch (error) {
      showToast('error', `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally { setIsUploading(false); }
  };

  const handleCustomRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { showToast('error', '不支持的文件类型'); return; }
    if (file.size > 20 * 1024 * 1024) { showToast('error', '文件大小超过 20MB'); return; }
    try {
      const base64 = await blobToBase64(file);
      const base64Url = `data:${file.type};base64,${base64}`;
      const cacheKey = await cacheImage(base64Url);
      setCustomRefImage(cacheKey);
      showToast('success', '自定义参考图已添加');
    } catch (error) {
      showToast('error', `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 自定义预设参考图上传区域
  const customPresetExtra = selectedPreset === '自定义' ? (
    <div className="mb-3">
      <p className="text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mb-2">自定义参考图（作为第2张图）</p>
      <input type="file" ref={customFileInputRef} onChange={handleCustomRefUpload} accept="image/jpeg,image/png,image/webp" className="hidden" />
      {customRefImage ? (
        <div className="relative rounded-xl overflow-hidden border border-indigo-500/30 group">
          <img src={displayCustomRefImage || ''} alt="自定义参考图" className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
          <button
            onClick={() => setCustomRefImage(null)}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-500/80 rounded-lg transition-colors backdrop-blur-sm"
            title="移除参考图"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-indigo-500/80 text-white text-[10px] font-bold rounded">参考图2</div>
        </div>
      ) : (
        <button
          onClick={() => customFileInputRef.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-border-subtle hover:border-indigo-500/40 hover:bg-surface-1 flex flex-col items-center justify-center transition-all"
        >
          <Upload className="w-5 h-5 text-text-muted mb-1.5" />
          <span className="text-[11px] text-text-muted">点击上传参考图</span>
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-row flex-1 overflow-hidden w-full h-full">
      <div className={`flex-1 overflow-y-auto p-5 lg:p-6 custom-scrollbar ${isMobile ? '' : 'mr-80'}`}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-5 flex items-center gap-3">
            <div className="px-3.5 py-2 bg-indigo-500/10 rounded-xl flex items-center gap-2 border border-indigo-500/15">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">{getMenuItemLabel(activeMenuItem)}</span>
            </div>
            {generatingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/15">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span className="text-xs text-indigo-300 font-medium">生成中{generatingCount > 1 ? ` (${generatingCount})` : ''}...</span>
              </div>
            )}
          </div>

          {result && imageUrls.length > 0 && showCompareMode ? (
            <div className="mb-6">
              <div
                className="aspect-video rounded-2xl overflow-hidden bg-surface-2 relative group shadow-2xl shadow-black/30 select-none border border-border-subtle/70"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setSliderPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                }}
              >
                <img src={displayRefImage || ''} alt="Reference" className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                  <img src={displayResult || ''} alt="Generated Result" className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-ew-resize z-10 shadow-lg" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <ChevronLeft className="w-3.5 h-3.5 text-text-secondary" /><ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg z-[2]">生成图</div>
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg z-[2]">原图</div>
                {refImageDimensions && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg z-[2]">
                    {refImageDimensions.width}×{refImageDimensions.height} · {getClosestAspectRatio(refImageDimensions.width, refImageDimensions.height)}
                  </div>
                )}
              </div>
            </div>
          ) : result ? (
            <div className="mb-6 relative">
              <div className="aspect-video rounded-2xl overflow-hidden bg-surface-2 relative group shadow-2xl shadow-black/30 border border-border-subtle/70">
                <img src={displayResult || ''} alt="Generated Result" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                {resultDimensions && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg z-[2]">
                    {resultDimensions.width}×{resultDimensions.height} · {getClosestAspectRatio(resultDimensions.width, resultDimensions.height)}
                  </div>
                )}
                {activeMenuItem === 'panorama' && (
                  <button
                    onClick={() => { setPanoramaImageUrl(result); setShowPanoramaViewer(true); }}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all backdrop-blur-sm"
                    title="全景查看"
                  >
                    <Maximize2 className="w-4 h-4" />全景查看
                  </button>
                )}
              </div>
            </div>
          ) : imageUrls.length > 0 ? (
            <div className="mb-6 relative">
              <div className={`aspect-video rounded-2xl overflow-hidden bg-surface-2/50 flex flex-col items-center justify-center group cursor-pointer transition-all border-2 border-dashed ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-border-subtle hover:border-indigo-500/30 hover:bg-surface-2'}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleUpload}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" />
                {isUploading ? (
                  <><RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" /><p className="text-text-muted text-sm">上传中...</p></>
                ) : (
                  <><img src={displayRefImage || ''} alt="参考图" className="w-full h-full object-contain" onClick={handleUpload} />
                    <button onClick={(e) => { e.stopPropagation(); setImageUrls([]); }} className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors backdrop-blur-sm"><X className="w-4 h-4 text-white" /></button>
                    {refImageDimensions && (
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg z-[2]">
                        {refImageDimensions.width}×{refImageDimensions.height} · {getClosestAspectRatio(refImageDimensions.width, refImageDimensions.height)}
                      </div>
                    )}</>
                )}
              </div>
              {activeMenuItem === 'panorama' && (
                <button
                  onClick={() => { setPanoramaImageUrl(imageUrls[0]); setShowPanoramaViewer(true); }}
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all backdrop-blur-sm"
                  title="全景查看"
                >
                  <Maximize2 className="w-4 h-4" />全景查看
                </button>
              )}
            </div>
          ) : (
            <div className={`upload-zone aspect-video flex flex-col items-center justify-center group cursor-pointer mb-6 shadow-lg ${isDragging ? 'dragging' : 'border-border-subtle'}`}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleUpload}>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" className="hidden" />
              <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 border border-border-subtle">
                <Upload className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1.5">点击或拖拽图片上传</h3>
              <p className="text-text-muted text-xs">支持 JPG, PNG, WEBP · 也可 Ctrl+V 粘贴</p>
            </div>
          )}

          {(result || imageUrls.length > 0) && (
            <div className="flex items-center justify-end gap-2 mb-5">
              {imageUrls.length > 0 && (
                <button onClick={() => setEditingImageIndex(0)} className="btn-ghost flex items-center gap-2 px-3.5 py-2 bg-surface-2 text-indigo-400 text-xs font-medium rounded-lg border border-border-subtle" title="图片编辑器">
                  <Pencil className="w-3.5 h-3.5" />图片编辑器
                </button>
              )}
              {result && imageUrls.length > 0 && (
                <button
                  onClick={() => setShowCompareMode(!showCompareMode)}
                  className={`btn-ghost flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border ${showCompareMode ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-surface-2 text-text-primary border-border-subtle'}`}
                  title="图片对比模式"
                >
                  <Layers className="w-3.5 h-3.5" />{showCompareMode ? '关闭对比' : '对比模式'}
                </button>
              )}
              {result && imageUrls.length === 0 && (
                <><button onClick={handleShare} className="btn-ghost flex items-center gap-2 px-3.5 py-2 bg-surface-2 text-text-primary text-xs font-medium rounded-lg border border-border-subtle"><Share2 className="w-3.5 h-3.5" />分享</button>
                  <button onClick={handleCopyResult} className="btn-ghost flex items-center gap-2 px-3.5 py-2 bg-surface-2 text-text-primary text-xs font-medium rounded-lg border border-border-subtle"><Download className="w-3.5 h-3.5" />复制链接</button></>
              )}
              <button onClick={handleClearResult} className="flex items-center gap-2 px-3.5 py-2 bg-surface-2 hover:bg-rose-500/10 text-rose-400 text-xs font-medium rounded-lg border border-border-subtle hover:border-rose-500/20 transition-all duration-200">
                <Trash2 className="w-3.5 h-3.5" />{result ? '清除结果' : '清除参考图'}
              </button>
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-text-primary">{getMenuItemLabel(activeMenuItem)} <span className="text-text-muted font-normal text-xs ml-1.5">历史记录</span></h2>
                {generationHistory.length > 0 && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-md">{generationHistory.length}</span>}
              </div>
              <div className="flex items-center gap-3">
                {generationHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-[10px]">缩略图</span>
                    <input type="range" min="60" max="300" value={thumbnailSize} onChange={(e) => setThumbnailSize(Number(e.target.value))}
                      className="w-16 h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    <span className="text-text-muted text-[10px]">{thumbnailSize}px</span>
                  </div>
                )}
                {generationHistory.length > 0 && <button onClick={handleClearHistory} className="text-rose-400/70 text-[10px] font-medium hover:text-rose-400 transition-colors">清除记录</button>}
                <button onClick={handleViewAll} className="text-indigo-400/70 text-[10px] font-medium hover:text-indigo-400 transition-colors">
                  {generationHistory.length > 0 ? `查看全部 ${generationHistory.length}` : '暂无记录'}
                </button>
              </div>
            </div>
            {generationHistory.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {generationHistory.map((record, index) => (
                  <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                    className="history-card rounded-xl overflow-hidden bg-surface-2 relative group cursor-pointer shrink-0 border border-border-subtle/70"
                    style={{ width: thumbnailSize, height: thumbnailSize }} onClick={() => handleItemClick(record)}>
                    <HistoryThumbnail
                      cacheKey={record.imageUrl}
                      alt={record.prompt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onMissing={() => handleDeleteHistory(record.id, true)}
                    />
                    <div className={`thumb-overlay absolute inset-0 flex flex-col justify-end p-2.5 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}>
                      <p className="text-[10px] text-white font-medium truncate">{getMenuItemLabel(record.type) || record.prompt || '无描述'}</p>
                      <p className="text-[9px] text-text-secondary mt-0.5">
                        {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {record.resolution && <span className="ml-1 text-indigo-500">{record.resolution.width > 0 ? `${record.resolution.width}×${record.resolution.height} ` : ''}{record.resolution.quality}</span>}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        <button onClick={(e) => { e.stopPropagation(); setPrompt(record.prompt); if (record.referenceImageUrl) { setImageUrls([record.referenceImageUrl]); showToast('success', '已复用提示词和参考图'); } else showToast('success', '已复用提示词'); }}
                          className="p-1.5 thumb-btn rounded-md hover:!bg-indigo-500/50 transition-colors" title="复用"><RotateCcw className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: record.imageUrl, name: getMenuItemLabel(record.type), prompt: record.prompt, createdAt: record.createdAt }); }} className="p-1.5 thumb-btn rounded-md transition-colors" title="放大"><Maximize2 className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadHistory(record); }} className="p-1.5 thumb-btn rounded-md transition-colors" title="下载"><Download className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }} className="p-1.5 thumb-btn rounded-md hover:!bg-rose-500/50 transition-colors" title="删除"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-surface-2/30 border border-border-subtle/70">
                <div className="w-10 h-10 bg-surface-2 rounded-xl flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5 text-text-muted" />
                </div>
                <p className="text-text-muted text-xs">暂无历史记录</p>
              </div>
            )}
          </div>
        </div>

        {showPanoramaViewer && panoramaImageUrl && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-white" /></div>}>
            <CachedPanoramaViewer cacheKey={panoramaImageUrl} isOpen={showPanoramaViewer} onClose={() => setShowPanoramaViewer(false)} />
          </Suspense>
        )}

        {editingImageIndex !== null && imageUrls[editingImageIndex] && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-white" /></div>}>
            <CachedImageEditor
              cacheKey={imageUrls[editingImageIndex]}
              onSave={async (editedImage) => {
                try {
                  const cacheKey = await cacheImage(editedImage);
                  setImageUrls(prev => { const newImages = [...prev]; newImages[editingImageIndex!] = cacheKey; return newImages; });
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
          </Suspense>
        )}
      </div>

      <RightPanel
        model={model} setModel={setModel} models={models}
        presets={filteredPresets} selectedPreset={selectedPreset} setSelectedPreset={setSelectedPreset}
        aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
        quality={quality} setQuality={setQuality}
        prompt={prompt} setPrompt={setPrompt}
        placeholder={promptPlaceholder}
        handlePolishPrompt={handlePolishPrompt}
        handleGenerate={handleGenerate}
        isGenerating={generatingCount > 0}
        generatingCount={generatingCount}
        isPolishing={isPolishing}
        activeMenuItem={activeMenuItem}
        hasApiKey={hasApiKey}
        onNavigateSettings={onNavigateSettings}
        isMobile={isMobile}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={onToggleRightPanel}
        extraContent={customPresetExtra}
      />
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

import { Suspense } from 'react';
