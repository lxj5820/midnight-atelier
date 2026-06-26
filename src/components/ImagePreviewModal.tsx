/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { downloadImage } from '../utils/download';
import { useCachedImageUrl } from '../hooks/useCachedImage';
import { useMobile } from '../hooks/useMobile';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  imageName?: string;
  imageSize?: number;
  prompt?: string;
  createdAt?: string;
  author?: string;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  imageName,
  imageSize,
  prompt,
  createdAt,
  author,
}) => {
  const [copied, setCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const displayUrl = useCachedImageUrl(imageUrl)[0];
  const [showMore, setShowMore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isMobile = useMobile();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleCopyPrompt = useCallback(() => {
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [prompt]);

  const handleDownload = async () => {
    const filename = `image-${Date.now()}.png`;
    try {
      await downloadImage(imageUrl, filename);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  // 打开时锁定背景滚动并把焦点放到关闭按钮上
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // 短延迟等 motion 渲染完成后再聚焦
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      }
      // 简单的焦点陷阱：Tab/Shift+Tab 在模态内循环
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const displayName = imageName
    ? imageName.replace(/\.[^.]+$/, '')
    : '未命名作品';

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 bg-black/95 z-50 flex ${isMobile ? 'flex-col' : 'flex-row'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`图片预览：${displayName}`}
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Left: Image Area */}
      <div
        className={`${isMobile ? 'h-[50vh] w-full' : 'flex-1'} flex items-center justify-center relative overflow-hidden`}
      >
        {/* Close button - top right of image area */}
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="关闭预览"
          className="absolute top-4 right-4 z-10 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="w-5 h-5 text-white" aria-hidden="true" />
        </button>

        {/* Prev/Next arrows */}
        {hasPrev && onPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="上一张"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ChevronLeft className="w-6 h-6 text-white" aria-hidden="true" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="下一张"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ChevronRight className="w-6 h-6 text-white" aria-hidden="true" />
          </button>
        )}

        {/* Image */}
        <motion.img
          key={imageUrl}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          src={displayUrl || ''}
          alt={displayName}
          width={1280}
          height={720}
          className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
          referrerPolicy="no-referrer"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />

        {!imageLoaded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" aria-hidden="true" />
            <span className="sr-only">图片加载中…</span>
          </div>
        )}
      </div>

      {/* Right: Info Panel */}
      <div
        className={`${isMobile ? 'w-full border-t' : 'w-[380px] border-l'} bg-surface-1 border-border flex flex-col overflow-y-auto custom-scrollbar`}
        onClick={(e) => e.stopPropagation()}
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center" aria-hidden="true">
                <span className="text-xs font-bold text-indigo-400">
                  {(author || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {author || '匿名用户'}
                </p>
                <p className="text-[10px] text-text-muted">室内大师创作者</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              aria-label={isLiked ? '取消收藏' : '收藏作品'}
              aria-pressed={isLiked}
              className={`p-2 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                isLiked
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-bg-subtle text-text-secondary hover:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <h2 className="text-base font-bold text-text-primary mb-1">{displayName}</h2>

          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            {createdAt && (
              <time dateTime={createdAt}>
                {new Date(createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </time>
            )}
            {imageSize && (
              <>
                <span className="w-0.5 h-0.5 bg-slate-600 rounded-full" aria-hidden="true" />
                <span>{formatFileSize(imageSize)}</span>
              </>
            )}
            <span className="w-0.5 h-0.5 bg-slate-600 rounded-full" aria-hidden="true" />
            <span>内容由 AI 生成</span>
          </div>
        </div>

        {/* Prompt Section */}
        {prompt && (
          <div className="p-5 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                图片提示词
              </h3>
              <button
                type="button"
                onClick={handleCopyPrompt}
                aria-label={copied ? '已复制提示词' : '复制提示词'}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-subtle hover:bg-bg-subtle-hover text-text-secondary hover:text-text-primary text-[11px] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <p
                className={`text-xs text-text-secondary leading-relaxed whitespace-pre-wrap ${
                  showMore ? '' : 'line-clamp-6'
                }`}
              >
                {prompt}
              </p>
              {!showMore && prompt.length > 120 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#111317] to-transparent" aria-hidden="true" />
              )}
            </div>
            {prompt.length > 120 && (
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                aria-expanded={showMore}
                className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded"
              >
                {showMore ? '收起' : '更多…'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-5 mt-auto space-y-2.5">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-subtle-hover hover:bg-bg-subtle-hover text-text-primary text-xs font-medium rounded-xl border border-border-subtle transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            下载原图
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(imageUrl);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-subtle-hover hover:bg-bg-subtle-hover text-text-primary text-xs font-medium rounded-xl border border-border-subtle transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            复制图片链接
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ImagePreviewModal;
