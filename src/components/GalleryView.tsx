import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, Download, Maximize2, Loader2, AlertCircle, Heart, Eye, Upload, Gift } from 'lucide-react';
import type { PreviewImageData } from '../types';

interface GalleryImage {
  name: string;
  download_url: string;
  size: number;
  sha: string;
  aspectRatio?: number;
  promptUrl?: string;
}

interface GalleryViewProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setPreviewImage: (img: PreviewImageData | null) => void;
}

const GITHUB_API_URL = 'https://api.github.com/repos/lxj5820/Interior-Masters-Gallery/contents/image';

const GAP = 8;

function useColumnCount() {
  const [count, setCount] = useState(4);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w < 640) setCount(2);
      else if (w < 1024) setCount(3);
      else if (w < 1400) setCount(4);
      else setCount(5);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return count;
}

function distributeToColumns(images: GalleryImage[], columnCount: number): GalleryImage[][] {
  const columns: GalleryImage[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights: number[] = new Array(columnCount).fill(0);

  for (const img of images) {
    const shortestIdx = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestIdx].push(img);
    columnHeights[shortestIdx] += img.aspectRatio || 1;
  }

  return columns;
}

const SkeletonCard = () => (
  <div className="rounded-lg overflow-hidden bg-surface-2 border border-white/[0.04]">
    <div className="shimmer" style={{ aspectRatio: `${0.7 + Math.random() * 0.8}` }} />
  </div>
);

const GalleryView: React.FC<GalleryViewProps> = ({ showToast, setPreviewImage }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadedMap, setImageLoadedMap] = useState<Record<string, boolean>>({});
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [promptCache, setPromptCache] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount();

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(GITHUB_API_URL);
      if (!response.ok) throw new Error(`请求失败 (${response.status})`);
      const data = await response.json();

      const mdFileMap: Record<string, string> = {};
      for (const item of data) {
        if (item.type === 'file' && item.name.endsWith('.md')) {
          const baseName = item.name.replace(/\.md$/i, '');
          mdFileMap[baseName] = item.download_url;
        }
      }

      const imageFiles: GalleryImage[] = data
        .filter(
          (item: any) =>
            item.type === 'file' &&
            /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(item.name)
        )
        .map((item: any) => {
          const baseName = item.name.replace(/\.[^.]+$/, '');
          return {
            name: item.name,
            download_url: item.download_url,
            size: item.size,
            sha: item.sha,
            aspectRatio: undefined,
            promptUrl: mdFileMap[baseName],
          };
        });
      setImages(imageFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      showToast('error', '画廊加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const fetchPrompt = useCallback(async (image: GalleryImage): Promise<string | undefined> => {
    if (!image.promptUrl) return undefined;
    if (promptCache[image.name] !== undefined) return promptCache[image.name];

    try {
      const resp = await fetch(image.promptUrl);
      if (!resp.ok) return undefined;
      const text = await resp.text();
      const cleanText = text
        .replace(/^---[\s\S]*?---\n?/, '')
        .replace(/^#\s+.*\n?/m, '')
        .trim();
      setPromptCache(prev => ({ ...prev, [image.name]: cleanText }));
      return cleanText;
    } catch {
      return undefined;
    }
  }, [promptCache]);

  const handleImageLoad = (name: string, naturalWidth: number, naturalHeight: number) => {
    const ratio = naturalHeight / naturalWidth;
    setImages(prev =>
      prev.map(img => (img.name === name ? { ...img, aspectRatio: ratio } : img))
    );
    setImageLoadedMap(prev => ({ ...prev, [name]: true }));
  };

  const handleOpenPreview = useCallback((image: GalleryImage) => {
    const previewData: PreviewImageData = {
      url: image.download_url,
      name: image.name,
      size: image.size,
      author: 'Interior Masters',
    };
    setPreviewImage(previewData);

    if (image.promptUrl) {
      fetchPrompt(image).then(prompt => {
        if (prompt) {
          setPreviewImage({ ...previewData, prompt });
        }
      });
    }
  }, [fetchPrompt, setPreviewImage]);

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      link.click();
      URL.revokeObjectURL(blobUrl);
      showToast('success', '下载成功');
    } catch {
      showToast('error', '下载失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns = useMemo(
    () => distributeToColumns(images, columnCount),
    [images, columnCount]
  );

  const loadedCount = Object.values(imageLoadedMap).filter(Boolean).length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar" ref={containerRef}>
      <div className="max-w-[1800px] mx-auto">
        <header className="text-center pt-8 pb-6 px-6 lg:px-8 space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-5xl font-black font-headline text-gradient-indigo tracking-tight"
          >
            公共画廊
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed"
          >
            探索来自 Interior Masters 社区的最新创作，发现无限设计灵感
          </motion.p>
        </header>

        {loading ? (
          <div className="px-6 lg:px-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">加载中</span>
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
            </div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
            >
              {Array.from({ length: columnCount * 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/10">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">加载失败</h2>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button
              onClick={fetchImages}
              className="btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 animate-float border border-indigo-500/10">
              <Globe className="w-10 h-10 text-indigo-500/70" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">画廊暂无作品</h2>
            <p className="text-slate-400 max-w-md text-center text-sm leading-relaxed">
              社区画廊正在积累更多精彩作品，敬请期待。
            </p>
          </div>
        ) : (
          <div className="px-6 lg:px-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">全部作品</span>
                <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded-full font-medium">
                  {images.length}
                </span>
                {loadedCount < images.length && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {loadedCount}/{images.length}
                  </span>
                )}
              </div>
              <button
                onClick={fetchImages}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-slate-400 hover:text-white text-xs font-medium rounded-lg border border-white/[0.06] transition-all duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                刷新
              </button>
              <div className="relative group">
                <a
                  href="https://ucnuixcl6oxb.feishu.cn/share/base/form/shrcnhwD9doY4ZaTDfYPrdAVOzb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/20 hover:border-indigo-500/30 transition-all duration-200"
                >
                  <Upload className="w-3.5 h-3.5" />
                  上传作品
                </a>
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-surface-2 rounded-lg border border-indigo-500/15 shadow-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                    <Gift className="w-3 h-3" />
                    上传作品可获得积分奖励
                  </div>
                </div>
              </div>
            </div>

            <div
              className="flex gap-2"
              style={{ alignItems: 'flex-start' }}
            >
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-2">
                  {col.map((image, imgIdx) => {
                    const globalIdx = colIdx + imgIdx * columnCount;
                    const isHovered = hoveredImage === image.sha;
                    const isLoaded = imageLoadedMap[image.name];
                    const hasPrompt = !!image.promptUrl;

                    return (
                      <motion.div
                        key={image.sha}
                        initial={{ opacity: 0, y: 30, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          delay: globalIdx * 0.04,
                          duration: 0.4,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="relative group cursor-pointer rounded-lg overflow-hidden bg-surface-2 border border-white/[0.04] hover:border-indigo-500/25 transition-all duration-300"
                        style={{
                          boxShadow: isHovered
                            ? '0 8px 40px rgba(99, 102, 241, 0.12), 0 2px 12px rgba(0, 0, 0, 0.4)'
                            : '0 2px 8px rgba(0, 0, 0, 0.2)',
                        }}
                        onMouseEnter={() => setHoveredImage(image.sha)}
                        onMouseLeave={() => setHoveredImage(null)}
                        onClick={() => handleOpenPreview(image)}
                      >
                        {!isLoaded && (
                          <div
                            className="flex items-center justify-center bg-surface-2 shimmer"
                            style={{
                              aspectRatio: image.aspectRatio
                                ? `${1 / image.aspectRatio}`
                                : '1',
                            }}
                          >
                            <div className="flex flex-col items-center gap-2 opacity-40">
                              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                            </div>
                          </div>
                        )}

                        <img
                          src={image.download_url}
                          alt={image.name}
                          className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          style={{
                            display: isLoaded ? 'block' : 'none',
                          }}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement;
                            handleImageLoad(
                              image.name,
                              img.naturalWidth,
                              img.naturalHeight
                            );
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />

                        <div
                          className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                          style={{
                            opacity: isHovered ? 1 : 0,
                            background:
                              'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 60%)',
                          }}
                        />

                        {hasPrompt && (
                          <div
                            className="absolute top-3 left-3 transition-all duration-300"
                            style={{
                              opacity: isHovered ? 1 : 0,
                              transform: isHovered
                                ? 'translateY(0)'
                                : 'translateY(-8px)',
                            }}
                          >
                            <span className="px-2 py-1 bg-indigo-500/60 backdrop-blur-sm text-white text-[10px] font-medium rounded-md">
                              含提示词
                            </span>
                          </div>
                        )}

                        <div
                          className="absolute top-3 right-3 flex gap-1.5 transition-all duration-300"
                          style={{
                            opacity: isHovered ? 1 : 0,
                            transform: isHovered
                              ? 'translateY(0)'
                              : 'translateY(-8px)',
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPreview(image);
                            }}
                            className="p-2 bg-black/40 hover:bg-indigo-500/60 backdrop-blur-sm rounded-xl transition-all duration-200"
                            title="放大查看"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image.download_url, image.name);
                            }}
                            className="p-2 bg-black/40 hover:bg-indigo-500/60 backdrop-blur-sm rounded-xl transition-all duration-200"
                            title="下载"
                          >
                            <Download className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>

                        <div
                          className="absolute bottom-0 left-0 right-0 p-3.5 transition-all duration-300"
                          style={{
                            opacity: isHovered ? 1 : 0,
                            transform: isHovered
                              ? 'translateY(0)'
                              : 'translateY(8px)',
                          }}
                        >
                          <p className="text-xs text-white font-semibold truncate mb-0.5">
                            {image.name.replace(/\.[^.]+$/, '')}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{formatFileSize(image.size)}</span>
                            {hasPrompt && (
                              <>
                                <span className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                                <span className="text-indigo-400">含提示词</span>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryView;
