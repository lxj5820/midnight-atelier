import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Download, Quote, Trash2, Sparkles, ChevronDown, Plus, RefreshCw, Zap, Maximize2, Wand2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApiKey } from '../ApiKeyContext';
import { useGeneration } from '../GenerationContext';
import { getGenerationHistoryAsync, saveGenerationRecord, deleteGenerationRecordFromDB } from '../App.tsx';
import ImageEditor from './ImageEditor';
import { Dropdown } from './ui/Dropdown';

interface EditWorkspaceProps {
  apiKey: string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setPreviewImage: (img: string | null) => void;
}

interface GenerationRecord {
  id: string;
  type: string;
  prompt: string;
  imageUrl: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  createdAt: string;
  resolution?: { width: number; height: number; quality: string; aspectRatio: string };
}

const EditWorkspace: React.FC<EditWorkspaceProps> = ({ apiKey, showToast, setPreviewImage }) => {
  const { hasApiKey } = useApiKey();
  const { startGenerating, stopGenerating } = useGeneration();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false); // 防抖保护 ref
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
  const models = ['🍌全能图片V2', '🍌全能图片PRO'];
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载历史记录
  useEffect(() => {
    getGenerationHistoryAsync().then(history => {
      setGenerationHistory(history.filter(h => h.type === 'edit'));
    });
  }, [historyRefreshKey]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          if (!result || !result.includes(',')) { reject(new Error('图片格式转换失败')); return; }
          resolve(result.split(',')[1]);
        } catch (e) { reject(new Error('图片数据处理失败')); }
      };
      reader.onerror = () => reject(new Error('图片读取失败，请尝试重新上传'));
      reader.readAsDataURL(blob);
    });
  };

  const getClosestAspectRatio = (width: number, height: number): string => {
    const ratios: Record<string, number> = { '1:1': 1, '4:3': 4/3, '16:9': 16/9, '9:16': 9/16, '3:4': 3/4, '2:3': 2/3, '3:2': 3/2, '4:5': 4/5, '5:4': 5/4, '21:9': 21/9 };
    const currentRatio = width / height;
    let closest = '1:1', minDiff = Math.abs(currentRatio - ratios[closest]);
    for (const [ratio, r] of Object.entries(ratios)) {
      const diff = Math.abs(currentRatio - r);
      if (diff < minDiff) { minDiff = diff; closest = ratio; }
    }
    return closest;
  };

  const getComputePointsCost = (m: string, q: string): number => {
    if (m === '🍌全能图片PRO') return q === '4K' ? 36 : 30;
    return q === '4K' ? 25 : 15;
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const base64 = await blobToBase64(file);
        const base64Url = `data:${file.type};base64,${base64}`;
        setReferenceImages(prev => [...prev, base64Url]);
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
    // 防抖保护：避免瞬时多次点击重复提交 - 立即锁定
    if (isGeneratingRef.current) { return; }

    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }
    if (!prompt.trim()) { showToast('error', '请输入提示词'); return; }
    if (referenceImages.length === 0) { showToast('error', '请上传至少一张参考图'); return; }

    // 前置检查通过后立即锁定，防止快速点击
    isGeneratingRef.current = true;
    setIsGenerating(true);
    const taskId = startGenerating('全能修改');

    // 保存当前提示词和参考图用于后续处理
    const currentPrompt = prompt;
    const currentRefImages = [...referenceImages];
    const currentQuality = quality;
    const currentAspectRatio = aspectRatio;

    // 异步执行生成，不阻塞 UI
    (async () => {
      try {
        /**
         * SECURITY WARNING: 直接在前端调用第三方 API 会暴露 API 密钥！
         *
         * 当前实现存在安全漏洞:
         * 1. API 密钥在前端代码中使用，会暴露在浏览器 Network 面板
         * 2. 任何能访问浏览器的人都可以获取 API 密钥
         *
         * 修复方案:
         * 1. 在后端服务器创建代理 API (/api/generate)
         * 2. 将第三方 API 密钥存储在后端服务器
         * 3. 前端调用后端代理 API，后端再调用第三方 API
         * 4. 使用 api.ts 中的 generateImageProxy() 函数替代直接调用
         *
         * TODO: 部署后端代理后，将以下代码改为使用 generateImageProxy() 函数
         */
        const modelMap: Record<string, string> = { '🍌全能图片V2': 'gemini-3.1-flash-image-preview', '🍌全能图片PRO': 'gemini-3-pro-image-preview' };
        const apiModel = modelMap[model] || 'gemini-2.5-flash-image-preview';
        const apiUrl = `https://newapi.asia/v1beta/models/${apiModel}:generateContent`;

        const parts: any[] = [];
        for (const imgUrl of currentRefImages) {
          const imgResponse = await fetch(imgUrl);
          const blob = await imgResponse.blob();
          const base64 = await blobToBase64(blob);
          parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } });
        }
        parts.push({ text: currentPrompt });

        const requestBody = { contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(currentAspectRatio !== 'auto' && { aspectRatio: currentAspectRatio }), imageSize: currentQuality } } };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800000);

        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(requestBody), signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error?.message || `请求失败 (${response.status})`); }
        const data = await response.json();
        const resultParts = data.candidates?.[0]?.content?.parts || [];
        let imageUrl = '';
        for (const part of resultParts) { if (part.inlineData) { imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; } }
        if (!imageUrl) throw new Error('响应中未找到图片');

        // 保存到历史记录
        const record: GenerationRecord = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'edit',
          prompt: currentPrompt,
          imageUrl: imageUrl,
          referenceImageUrl: currentRefImages[0],
          referenceImageUrls: currentRefImages,
          createdAt: new Date().toISOString(),
          resolution: { width: 0, height: 0, quality: currentQuality, aspectRatio: currentAspectRatio },
        };
        await saveGenerationRecord(record);

        // 更新状态，触发 UI 刷新
        setResult(imageUrl);
        setPendingResult(imageUrl);
        setHistoryRefreshKey(k => k + 1);
        showToast('success', '生成成功！');
      } catch (error) {
        console.error('Generation error:', error);
        showToast('error', error instanceof Error ? error.message : '生成失败');
      } finally {
        isGeneratingRef.current = false; // 解除防抖保护
        setIsGenerating(false);
        stopGenerating(taskId);
      }
    })();
  };

  const handleDownload = (url: string) => { const link = document.createElement('a'); link.href = url; link.download = `edit-${Date.now()}.png`; link.click(); };
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

  const handleDeleteHistory = async (id: string) => {
    await deleteGenerationRecordFromDB(id);
    setGenerationHistory(prev => prev.filter(r => r.id !== id));
    showToast('info', '已删除');
  };

  return (
    <div className="flex flex-row flex-1 overflow-hidden w-full h-full" style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar mr-80" style={{ flex: 1, maxWidth: 'calc(100vw - 320px)' }}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-4 flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-600/10 rounded-xl flex items-center gap-2 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-indigo-400">全能修改</span>
            </div>
            {isGenerating && (
              <div className="px-3 py-1 bg-indigo-600/20 rounded-full flex items-center gap-2 text-sm text-indigo-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>后台生成中，可继续操作...</span>
              </div>
            )}
          </div>

          {/* Result Area */}
          {(result || pendingResult) ? (
            <div className="mb-6">
              <div className="aspect-video rounded-xl overflow-hidden bg-[#1c1f26] relative group shadow-xl shadow-black/20">
                <img src={result || pendingResult} alt="生成结果" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            </div>
          ) : isGenerating ? (
            <div className="aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 border-indigo-500/50">
              <div className="w-12 h-12 bg-[#111317] rounded-xl flex items-center justify-center mb-4 shadow-lg animate-pulse">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">正在生成图片...</h3>
              <p className="text-slate-500 text-xs">可切换到其他菜单继续操作</p>
            </div>
          ) : (
            <div className="aspect-video rounded-xl border-2 border-dashed bg-[#1c1f26]/50 flex flex-col items-center justify-center group cursor-pointer transition-all mb-6 border-[#2a2e38] hover:border-indigo-500/50 hover:bg-[#1c1f26]">
              <div className="w-12 h-12 bg-[#111317] rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                <Wand2 className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">全能图片修改</h3>
              <p className="text-slate-500 text-xs">上传参考图并输入修改指令</p>
            </div>
          )}

          {/* Result Actions */}
          {(result || pendingResult) && (
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => { const img = result || pendingResult; if (img) { setReferenceImages([img]); showToast('info', '已设置为参考图'); } }} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors">
                <Quote className="w-4 h-4" />引用
              </button>
              <button onClick={() => { const img = result || pendingResult; if (img) handleDownload(img); }} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-[#2a2e38] text-white text-sm rounded-lg transition-colors">
                <Download className="w-4 h-4" />下载
              </button>
              <button onClick={() => { setResult(null); setPendingResult(null); }} className="flex items-center gap-2 px-4 py-2 bg-[#1c1f26] hover:bg-rose-500/20 text-rose-400 text-sm rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />清除
              </button>
            </div>
          )}

          {/* History Records */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white">全能修改 <span className="text-slate-500 font-normal text-xs ml-2">历史记录</span></h2>
                {generationHistory.length > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded-full">{generationHistory.length}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {generationHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">缩略图</span>
                    <input type="range" min="60" max="300" value={thumbnailSize} onChange={(e) => setThumbnailSize(Number(e.target.value))} className="w-20 h-1 bg-[#2a2e38] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    <span className="text-slate-500 text-xs">{thumbnailSize}px</span>
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
                    className="rounded-lg overflow-hidden bg-[#1c1f26] relative group cursor-pointer shrink-0"
                    style={{ width: thumbnailSize, height: thumbnailSize }}
                    onClick={() => handleItemClick(record)}
                  >
                    <img src={record.imageUrl} alt={record.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-[10px] text-white font-medium truncate">{record.prompt || '无描述'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); setPrompt(record.prompt); if (record.referenceImageUrls && record.referenceImageUrls.length > 0) { setReferenceImages(record.referenceImageUrls); showToast('success', `已引用提示词和${record.referenceImageUrls.length}张参考图`); } else if (record.referenceImageUrl) { setReferenceImages([record.referenceImageUrl]); showToast('success', '已引用提示词和参考图'); } else { showToast('info', '已引用提示词'); } }} className="p-1.5 bg-white/10 rounded hover:bg-indigo-500/50 transition-colors" title="复用"><Quote className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewImage(record.imageUrl); }} className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors" title="放大"><Maximize2 className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(record.imageUrl); }} className="p-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors" title="下载"><Download className="w-3 h-3 text-white" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }} className="p-1.5 bg-white/10 rounded hover:bg-rose-500/50 transition-colors" title="删除"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 rounded-xl">
                <p className="text-slate-500 text-xs">暂无历史记录</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 bg-[#1c1f26] border-l border-[#2a2e38] flex flex-col p-4 overflow-y-auto custom-scrollbar shrink-0 fixed right-0 top-16 h-[calc(100vh-4rem)] z-30">
        {/* Model Selection */}
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

        {/* Reference Image Upload */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">参考图</p>
          {referenceImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-[#111317] relative group">
                  <img src={img} alt={`参考图 ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
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
            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#2a2e38] hover:border-indigo-500/50'}`}
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
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <Upload className="w-5 h-5" />
                <span className="text-xs">{referenceImages.length > 0 ? '添加更多' : '点击或拖拽上传'}</span>
                <span className="text-[10px] text-slate-500">支持 Ctrl+V 粘贴</span>
              </div>
            )}
          </div>
        </div>

        {/* Aspect Ratio & Quality */}
        <div className="mt-auto pt-6 border-t border-[#2a2e38]">
          <div className="mb-4">
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">图像比例</p>
                <Dropdown
                  options={[
                    { value: 'auto', label: '自动' },
                    ...(model === '🍌全能图片V2'
                      ? ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'].map(r => ({ value: r, label: r }))
                      : ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(r => ({ value: r, label: r }))
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

          {/* Prompt Input */}
          <div className="bg-[#111317] rounded-xl p-4 mb-4">
            <textarea
              placeholder="输入提示词，描述你想要如何修改这张图片..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-white resize-none outline-none min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setPrompt('')} className="p-1.5 text-slate-500 hover:text-white transition-colors" title="清空">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
            {isGenerating ? '生成中...' : '立即生成'}
          </button>
        </div>
      </aside>
      {/* Image Editor Modal */}
      {editingImageIndex !== null && referenceImages[editingImageIndex] && (
        <ImageEditor
          imageUrl={referenceImages[editingImageIndex]}
          onSave={(editedImage) => {
            setReferenceImages(prev => {
              const newImages = [...prev];
              newImages[editingImageIndex!] = editedImage;
              return newImages;
            });
            setEditingImageIndex(null);
            showToast('success', '图片编辑已保存');
          }}
          onCancel={() => setEditingImageIndex(null)}
        />
      )}
    </div>
  );
};

export default EditWorkspace;