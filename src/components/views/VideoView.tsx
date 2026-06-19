import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Download, Trash2, Video, Play, Film } from 'lucide-react';
import { useGeneration } from '../../GenerationContext';
import { submitVideoTask, pollVideoTask, type VideoTaskStatus } from '../../utils/videoApi';
import { cacheImage, getCachedImageBlob, isCacheKey, deleteCachedImage, blobToBase64, dbOperations, getGenerationHistoryByTypeAsync, deleteGenerationRecordFromDB } from '../../utils';
import { saveImageToOSS } from '../../utils/oss';
import { useCachedImageUrl } from '../../hooks/useCachedImage';
import type { GenerationRecord, PreviewImageData } from '../../types';

// 参考图缩略图
const ImageThumb: React.FC<{
  cacheKey: string;
  index: number;
  onRemove: (index: number) => void;
  large?: boolean; // 单图时最大化
  className?: string;
}> = ({ cacheKey, index, onRemove, large, className = '' }) => {
  const [url] = useCachedImageUrl(cacheKey);
  return (
    <div className={`relative rounded-lg overflow-hidden bg-surface-2 border border-border-subtle group ${large ? 'aspect-[16/10] w-full' : 'aspect-square'} ${className}`}>
      {url ? (
        <img src={url} alt={`参考图 ${index + 1}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded">
        [Image {index + 1}]
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// 视频历史记录卡片
const VideoHistoryCard: React.FC<{
  record: GenerationRecord;
  onLoad: (record: GenerationRecord) => void;
  onDelete: (id: string, imageUrl?: string) => void;
}> = ({ record, onLoad, onDelete }) => {
  const [displayUrl] = useCachedImageUrl(record.imageUrl);

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden bg-surface-2 border border-border-subtle cursor-pointer transition-all hover:border-indigo-500/30"
      onClick={() => onLoad(record)}
    >
      {displayUrl ? (
        <video src={displayUrl} className="w-full h-full object-cover" preload="metadata" muted />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-muted">
          <Film className="w-6 h-6" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(record.id, record.imageUrl); }}
        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[10px] text-white/90 truncate">{record.prompt}</p>
      </div>
    </div>
  );
};

interface VideoViewProps {
  apiKey: string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setPreviewImage: (img: PreviewImageData | null) => void;
  onNavigateSettings?: () => void;
  isMobile?: boolean;
}

const VideoView: React.FC<VideoViewProps> = ({ apiKey, showToast, onNavigateSettings, isMobile }) => {
  const { startGenerating, stopGenerating } = useGeneration();

  const [prompt, setPrompt] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // 视频参数
  const [resolution, setResolution] = useState<'720P' | '1080P'>('720P');
  const [duration, setDuration] = useState(5);
  const [watermark, setWatermark] = useState(false);
  const [ratio, setRatio] = useState('16:9');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [displayResult] = useCachedImageUrl(result);

  // 加载历史记录
  useEffect(() => {
    let cancelled = false;
    getGenerationHistoryByTypeAsync('video').then(records => {
      if (!cancelled) {
        const sorted = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistory(sorted);
      }
    });
    return () => { cancelled = true; };
  }, [historyRefreshKey]);

  // Ctrl+V 粘贴图片为参考图
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // 避免在输入框中粘贴文字时触发
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      // 已有 9 张时不允许再添加
      if (imageUrls.length >= 9) {
        showToast('error', '参考图最多 9 张');
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            return;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [imageUrls.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasImage = imageUrls.length > 0;
  const modelLabel = hasImage
    ? `图生视频 · happyhorse-1.0-r2v（${imageUrls.length} 张参考图）`
    : '文生视频 · happyhorse-1.0-t2v';

  // 上传处理
  const handleUpload = () => fileInputRef.current?.click();

  const uploadFile = async (file: File) => {
    if (!apiKey) { showToast('error', '请先在设置中配置 API 密钥'); return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { showToast('error', '不支持的文件类型，仅支持 JPEG/PNG/WEBP'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('error', '文件大小超过 10MB'); return; }
    setIsUploading(true);
    try {
      const base64 = await blobToBase64(file);
      const base64Url = `data:${file.type};base64,${base64}`;
      const cacheKey = await cacheImage(base64Url);
      setImageUrls(prev => {
        if (prev.length >= 9) {
          showToast('error', '参考图最多 9 张');
          return prev;
        }
        return [...prev, cacheKey];
      });
    } catch (error) {
      showToast('error', `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally { setIsUploading(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (const file of Array.from(e.target.files)) {
        await uploadFile(file);
      }
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
    }
  };

  // 生成视频
  const handleGenerate = async () => {
    if (!apiKey) {
      showToast('error', '请先在设置中配置 API 密钥');
      onNavigateSettings?.();
      return;
    }
    if (!prompt.trim()) { showToast('error', '请输入提示词'); return; }

    setGenerating(true);
    setTaskStatus('提交中...');
    setResult(null);
    const genTaskId = startGenerating('视频生成');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 如果有图片，把所有参考图上传到 OSS 获取公网 URL
      const publicImageUrls: string[] = [];
      if (hasImage) {
        for (let i = 0; i < imageUrls.length; i++) {
          setTaskStatus(`上传参考图 ${i + 1}/${imageUrls.length}...`);
          const blob = await getCachedImageBlob(imageUrls[i]);
          if (!blob) throw new Error(`第 ${i + 1} 张参考图已失效，请重新上传`);
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('图片读取失败'));
            reader.readAsDataURL(blob);
          });
          const publicUrl = await saveImageToOSS(dataUrl, 'video-r2v', `video-${Date.now()}-${i}`);
          if (!publicUrl) throw new Error(`第 ${i + 1} 张参考图上传失败，请重试`);
          publicImageUrls.push(publicUrl);
        }
      }

      // 提交任务
      setTaskStatus('提交生成任务...');
      const taskId = await submitVideoTask(apiKey, {
        prompt: prompt.trim(),
        imageUrls: publicImageUrls.length > 0 ? publicImageUrls : undefined,
        resolution,
        duration,
        watermark: false,
        ratio: hasImage ? undefined : ratio,
      });

      // 轮询
      setTaskStatus('排队中...');
      const videoUrl = await pollVideoTask(
        apiKey,
        taskId,
        (status: VideoTaskStatus) => {
          if (status === 'PENDING') setTaskStatus('排队中...');
          else if (status === 'RUNNING') setTaskStatus('生成中...');
        },
        abortController.signal,
      );

      // 下载并缓存视频
      setTaskStatus('下载视频中...');
      const videoCacheKey = await cacheImage(videoUrl);
      setResult(videoCacheKey);

      // 存历史记录
      const record: GenerationRecord = {
        id: `video-${Date.now()}`,
        type: 'video',
        prompt: prompt.trim(),
        imageUrl: videoCacheKey,
        referenceImageUrl: imageUrls[0] || undefined,
        createdAt: new Date().toISOString(),
        resolution: { width: 0, height: 0, quality: resolution, aspectRatio: hasImage ? '首帧' : ratio },
      };
      await dbOperations.save(record);
      setHistoryRefreshKey(k => k + 1);
      showToast('success', '视频生成成功！');
    } catch (error) {
      if (error instanceof Error && error.message === '已取消生成') {
        showToast('info', '已取消生成');
      } else {
        showToast('error', error instanceof Error ? error.message : '生成失败');
      }
    } finally {
      setGenerating(false);
      setTaskStatus('');
      stopGenerating(genTaskId);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleClear = () => {
    setResult(null);
    setPrompt('');
  };

  const handleRemoveImage = (index?: number) => {
    if (index === undefined) {
      setImageUrls([]);
    } else {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const blob = await getCachedImageBlob(result);
      if (!blob) throw new Error('视频缓存已失效');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '下载失败');
    }
  };

  const handleDeleteHistory = async (id: string, imageUrl?: string) => {
    try {
      await deleteGenerationRecordFromDB(id);
      if (imageUrl && isCacheKey(imageUrl)) await deleteCachedImage(imageUrl);
      setHistoryRefreshKey(k => k + 1);
      showToast('success', '已删除');
    } catch {
      showToast('error', '删除失败');
    }
  };

  const handleLoadFromHistory = (record: GenerationRecord) => {
    setResult(record.imageUrl);
    setPrompt(record.prompt);
    if (record.referenceImageUrl) setImageUrls([record.referenceImageUrl]);
    else setImageUrls([]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
      <div className={`mx-auto w-full ${isMobile ? 'px-4 py-4' : 'px-8 py-6'} max-w-5xl`}>
        {/* 标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-headline">视频生成</h2>
            <p className="text-sm text-text-muted mt-1">{modelLabel}</p>
          </div>
        </div>

        {/* 生成中状态 */}
        {generating && (
          <div className="mb-4 flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-300">{taskStatus || '处理中...'}</p>
              <p className="text-xs text-text-muted mt-0.5">视频生成通常需要 1-5 分钟，请耐心等待</p>
            </div>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors shrink-0"
            >
              取消
            </button>
          </div>
        )}

        {/* 视频显示区 / 上传占位符 */}
        {result ? (
          <div className="mb-6">
            <div className="rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/30 border border-border-subtle/70">
              <video
                src={displayResult || ''}
                controls
                autoPlay
                className="w-full max-h-[500px] object-contain"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-text-primary text-sm font-bold rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" /> 下载视频
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-text-muted text-sm font-bold rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 清除
              </button>
            </div>
          </div>
        ) : !generating && (
          <div className="mb-6">
            {/* 预览框：同时作为拖放区 & 参考图网格容器 */}
            <div
              className={`rounded-2xl overflow-hidden bg-surface-2/50 flex flex-col transition-all border-2 border-dashed ${
                isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-border-subtle hover:border-indigo-500/30 hover:bg-surface-2'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
              />

              {/* 顶部信息栏 */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle/30">
                <p className="text-xs font-bold text-text-muted">
                  参考图 {imageUrls.length}/9
                  {imageUrls.length > 0 && (
                    <span className="ml-2 text-text-muted/70 font-normal">在 prompt 中用 [Image 1]、[Image 2]... 引用</span>
                  )}
                </p>
                {imageUrls.length > 0 && imageUrls.length < 9 && (
                  <button
                    onClick={handleUpload}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-surface-2 hover:bg-surface-3 text-text-primary rounded-lg transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> 添加
                  </button>
                )}
              </div>

              {isUploading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : imageUrls.length === 0 ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center py-12 cursor-pointer"
                  onClick={handleUpload}
                >
                  <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">上传参考图（可选，最多 9 张）</p>
                  <p className="text-xs text-text-muted mt-1">支持拖拽、点击或 Ctrl+V 粘贴 · 不上传则使用文生视频</p>
                </div>
              ) : (
                <div className="p-3">
                  {(() => {
                    const n = imageUrls.length;
                    // 1 张：最大化（16:10 占满整行）
                    if (n === 1) {
                      return (
                        <div className="grid grid-cols-1 gap-2">
                          {imageUrls.map((url, idx) => (
                            <ImageThumb key={url + idx} cacheKey={url} index={idx} onRemove={handleRemoveImage} large />
                          ))}
                        </div>
                      );
                    }
                    // 2-3 张：并排显示
                    if (n <= 3) {
                      return (
                        <div className={`grid ${n === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                          {imageUrls.map((url, idx) => (
                            <ImageThumb key={url + idx} cacheKey={url} index={idx} onRemove={handleRemoveImage} />
                          ))}
                        </div>
                      );
                    }
                    // 4 张：2x2
                    if (n === 4) {
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {imageUrls.map((url, idx) => (
                            <ImageThumb key={url + idx} cacheKey={url} index={idx} onRemove={handleRemoveImage} />
                          ))}
                        </div>
                      );
                    }
                    // 5 张：上 2 下 3（用 6 列，前 2 张各占 3 列，后 3 张各占 2 列）
                    if (n === 5) {
                      return (
                        <div className="grid grid-cols-6 gap-2">
                          {imageUrls.map((url, idx) => (
                            <ImageThumb
                              key={url + idx}
                              cacheKey={url}
                              index={idx}
                              onRemove={handleRemoveImage}
                              className={idx < 2 ? 'col-span-3' : 'col-span-2'}
                            />
                          ))}
                        </div>
                      );
                    }
                    // 6 张：3x2
                    if (n === 6) {
                      return (
                        <div className="grid grid-cols-3 gap-2">
                          {imageUrls.map((url, idx) => (
                            <ImageThumb key={url + idx} cacheKey={url} index={idx} onRemove={handleRemoveImage} />
                          ))}
                        </div>
                      );
                    }
                    // 7-9 张：3x3
                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {imageUrls.map((url, idx) => (
                          <ImageThumb key={url + idx} cacheKey={url} index={idx} onRemove={handleRemoveImage} />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 参数选择 */}
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-text-muted mb-2 block">分辨率</label>
              <div className="flex gap-2">
                {(['720P', '1080P'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      resolution === r ? 'bg-indigo-600 text-white' : 'bg-surface-2 text-text-muted hover:bg-surface-3'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted mb-2 block">宽高比</label>
              <div className="flex gap-2 flex-wrap">
                {['16:9', '9:16', '1:1', '4:3', '3:4'].map(r => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      ratio === r ? 'bg-indigo-600 text-white' : 'bg-surface-2 text-text-muted hover:bg-surface-3'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted mb-2 block">时长：{duration} 秒</label>
            <input
              type="range"
              min={3}
              max={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        {/* 提示词输入 */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的视频内容..."
            rows={3}
            className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="mb-8 w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          {generating ? '生成中...' : '生成视频'}
        </button>

        {/* 历史记录 */}
        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">历史记录</h3>
            <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {history.map(record => (
                <VideoHistoryCard
                  key={record.id}
                  record={record}
                  onLoad={handleLoadFromHistory}
                  onDelete={handleDeleteHistory}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoView;
