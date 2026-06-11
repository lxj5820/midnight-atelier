import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, Download, Maximize2, Loader2, AlertCircle, Heart, Eye, Upload, Gift, Search, SlidersHorizontal, X, ArrowUpDown, ChevronDown } from 'lucide-react';
import type { PreviewImageData } from '../types';
import { downloadImage } from '../utils/download';
import { getOSSThumbnailUrl, isOSSUrl } from '../utils/oss';

interface GalleryImage {
  name: string;
  url: string;
  size: number;
  id: string;
  aspectRatio?: number;
  promptUrl?: string;
  lastModified?: string;
}

interface GalleryViewProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setPreviewImage: (img: PreviewImageData | null) => void;
}

const GALLERY_API_URL = '/api/oss-gallery';

// OSS bucket 设置了 Content-Disposition: attachment 且无 CORS 头，需要通过代理访问
function proxyOSSUrl(url: string): string {
  if (isOSSUrl(url)) return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  return url;
}

const GAP = 8;
const MAX_ANIMATION_DELAY = 0.5;
const PRELOAD_MARGIN = '400px';

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
  <div className="rounded-lg overflow-hidden bg-surface-2 border border-border-subtle/70">
    <div className="shimmer" style={{ aspectRatio: `${0.7 + Math.random() * 0.8}` }} />
  </div>
);

const LazyGalleryCard: React.FC<{
  image: GalleryImage;
  isHovered: boolean;
  onHoverChange: (id: string | null) => void;
  onImageLoad: (name: string, w: number, h: number) => void;
  onOpenPreview: (image: GalleryImage) => void;
  onDownload: (url: string, name: string) => void;
  isLoaded: boolean;
  hasPrompt: boolean;
  animationDelay: number;
  formatFileSize: (bytes: number) => string;
}> = React.memo(({
  image,
  isHovered,
  onHoverChange,
  onImageLoad,
  onOpenPreview,
  onDownload,
  isLoaded,
  hasPrompt,
  animationDelay,
  formatFileSize,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    onImageLoad(image.name, img.naturalWidth, img.naturalHeight);
    requestAnimationFrame(() => setFadeIn(true));
  }, [image.name, onImageLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    (e.target as HTMLImageElement).style.display = 'none';
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(animationDelay, MAX_ANIMATION_DELAY),
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-surface-2 border border-border-subtle/70 hover:border-indigo-500/25 transition-all duration-300"
      style={{
        boxShadow: isHovered
          ? '0 8px 40px rgba(99, 102, 241, 0.12), 0 2px 12px rgba(0, 0, 0, 0.4)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
      }}
      onMouseEnter={() => onHoverChange(image.id)}
      onMouseLeave={() => onHoverChange(null)}
      onClick={() => onOpenPreview(image)}
    >
      {(!isLoaded || hasError) && (
        <div
          className="flex items-center justify-center bg-surface-2 shimmer"
          style={{
            aspectRatio: image.aspectRatio ? `${1 / image.aspectRatio}` : '1',
          }}
        >
          {isVisible && !hasError && (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            </div>
          )}
        </div>
      )}

      {isVisible && !hasError && (
        <img
          src={proxyOSSUrl(getOSSThumbnailUrl(image.url))}
          alt={image.name}
          loading="lazy"
          decoding="async"
          className="w-full h-auto block transition-all duration-500 ease-out group-hover:scale-[1.04]"
          style={{
            opacity: fadeIn ? 1 : 0,
            position: isLoaded ? 'relative' : 'absolute',
            inset: 0,
          }}
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

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
            onOpenPreview(image);
          }}
          className="p-2 bg-black/40 hover:bg-indigo-500/60 backdrop-blur-sm rounded-xl transition-all duration-200"
          title="放大查看"
        >
          <Maximize2 className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(image.url, image.name);
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
        <div className="flex items-center gap-2 text-[10px] text-text-secondary">
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
});

LazyGalleryCard.displayName = 'LazyGalleryCard';

type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
type PromptFilter = 'all' | 'with-prompt' | 'without-prompt';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: '最新优先' },
  { key: 'oldest', label: '最早优先' },
  { key: 'name-asc', label: '名称 A→Z' },
  { key: 'name-desc', label: '名称 Z→A' },
  { key: 'size-desc', label: '文件最大' },
  { key: 'size-asc', label: '文件最小' },
];

const GalleryView: React.FC<GalleryViewProps> = ({ showToast, setPreviewImage }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadedMap, setImageLoadedMap] = useState<Record<string, boolean>>({});
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [promptCache, setPromptCache] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount();

  // 搜索筛选排序状态
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [promptFilter, setPromptFilter] = useState<PromptFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭排序下拉
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen]);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(GALLERY_API_URL);
      if (!response.ok) throw new Error(`请求失败 (${response.status})`);
      const data = await response.json();

      const imageFiles: GalleryImage[] = data.map((item: any) => ({
        name: item.name,
        url: item.url,
        size: item.size,
        id: item.name.replace(/\.[^.]+$/, ''),
        aspectRatio: undefined,
        promptUrl: item.promptUrl,
        lastModified: item.lastModified,
      }));
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
      const resp = await fetch(proxyOSSUrl(image.promptUrl));
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

  const handleImageLoad = useCallback((name: string, naturalWidth: number, naturalHeight: number) => {
    const ratio = naturalHeight / naturalWidth;
    setImages(prev =>
      prev.map(img => (img.name === name ? { ...img, aspectRatio: ratio } : img))
    );
    setImageLoadedMap(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleOpenPreview = useCallback((image: GalleryImage) => {
    const previewData: PreviewImageData = {
      url: proxyOSSUrl(image.url),
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

  const handleDownload = useCallback(async (url: string, name: string) => {
    try {
      await downloadImage(proxyOSSUrl(url), name);
      showToast('success', '下载成功');
    } catch {
      showToast('error', '下载失败');
    }
  }, [showToast]);

  const handleHoverChange = useCallback((id: string | null) => {
    setHoveredImage(id);
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const filteredImages = useMemo(() => {
    let result = [...images];

    // 搜索
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(img => img.name.replace(/\.[^.]+$/, '').toLowerCase().includes(q));
    }

    // 筛选：提示词
    if (promptFilter === 'with-prompt') {
      result = result.filter(img => !!img.promptUrl);
    } else if (promptFilter === 'without-prompt') {
      result = result.filter(img => !img.promptUrl);
    }

    // 排序
    return result.toSorted((a, b) => {
      switch (sortKey) {
        case 'newest':
          return (b.lastModified || '').localeCompare(a.lastModified || '');
        case 'oldest':
          return (a.lastModified || '').localeCompare(b.lastModified || '');
        case 'name-asc':
          return a.name.localeCompare(b.name, 'zh');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'zh');
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });

  }, [images, searchQuery, sortKey, promptFilter]);

  const columns = useMemo(
    () => distributeToColumns(filteredImages, columnCount),
    [filteredImages, columnCount]
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
            className="text-text-secondary max-w-2xl mx-auto text-sm leading-relaxed"
          >
            探索来自 Interior Masters 社区的最新创作，发现无限设计灵感
          </motion.p>
        </header>

        {loading ? (
          <div className="px-6 lg:px-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-text-primary">加载中</span>
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
            <h2 className="text-xl font-bold text-text-primary mb-2">加载失败</h2>
            <p className="text-text-muted text-sm mb-4">{error}</p>
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
            <h2 className="text-2xl font-bold text-text-primary mb-2">画廊暂无作品</h2>
            <p className="text-text-secondary max-w-md text-center text-sm leading-relaxed">
              社区画廊正在积累更多精彩作品，敬请期待。
            </p>
          </div>
        ) : (
          <div className="px-6 lg:px-8 pb-8">
            {/* 搜索筛选排序工具栏 */}
            <div className="mb-5 space-y-3">
              {/* 第一行：搜索框 + 操作按钮 */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索作品名称..."
                    className="w-full pl-9 pr-8 py-2 bg-surface-2 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                    showFilters || promptFilter !== 'all'
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                      : 'bg-surface-2 border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  筛选
                  {promptFilter !== 'all' && (
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  )}
                </button>

                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setSortOpen(v => !v)}
                    className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-default transition-all duration-200"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
                    <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {sortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-1.5 py-1 bg-surface-2 border border-border-subtle rounded-lg shadow-xl shadow-black/30 z-30 min-w-[140px]"
                      >
                        {SORT_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                              sortKey === opt.key
                                ? 'text-indigo-400 bg-indigo-500/10'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1" />

                <button
                  onClick={fetchImages}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary text-xs font-medium rounded-lg border border-border-subtle transition-all duration-200"
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

              {/* 第二行：筛选面板（可折叠） */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-2/50 rounded-lg border border-border-subtle/50">
                      <span className="text-xs text-text-muted font-medium shrink-0">提示词</span>
                      <div className="flex gap-1.5">
                        {([
                          { key: 'all' as PromptFilter, label: '全部' },
                          { key: 'with-prompt' as PromptFilter, label: '含提示词' },
                          { key: 'without-prompt' as PromptFilter, label: '无提示词' },
                        ]).map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => setPromptFilter(opt.key)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                              promptFilter === opt.key
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-surface-3/50 text-text-secondary hover:text-text-primary border border-transparent'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 结果统计 */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-bold text-text-primary">
                {searchQuery || promptFilter !== 'all' ? '筛选结果' : '全部作品'}
              </span>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded-full font-medium">
                {filteredImages.length}
              </span>
              {(searchQuery || promptFilter !== 'all') && images.length !== filteredImages.length && (
                <span className="text-[10px] text-text-muted">
                  共 {images.length} 件作品
                </span>
              )}
              {loadedCount < filteredImages.length && (
                <span className="text-[10px] text-text-muted flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {loadedCount}/{filteredImages.length}
                </span>
              )}
            </div>

            {filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/10">
                  <Search className="w-7 h-7 text-indigo-500/50" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">未找到匹配作品</h3>
                <p className="text-text-muted text-sm mb-4">尝试调整搜索词或筛选条件</p>
                <button
                  onClick={() => { setSearchQuery(''); setPromptFilter('all'); }}
                  className="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary text-xs font-medium rounded-lg border border-border-subtle transition-all"
                >
                  清除筛选
                </button>
              </div>
            ) : (
              <div
                className="flex gap-2"
                style={{ alignItems: 'flex-start' }}
              >
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex-1 flex flex-col gap-2">
                    {col.map((image, imgIdx) => (
                      <LazyGalleryCard
                        key={image.id}
                        image={image}
                        isHovered={hoveredImage === image.id}
                        onHoverChange={handleHoverChange}
                        onImageLoad={handleImageLoad}
                        onOpenPreview={handleOpenPreview}
                        onDownload={handleDownload}
                        isLoaded={!!imageLoadedMap[image.name]}
                        hasPrompt={!!image.promptUrl}
                        animationDelay={imgIdx * 0.05}
                        formatFileSize={formatFileSize}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryView;
