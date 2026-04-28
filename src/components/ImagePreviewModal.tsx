import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [showMore, setShowMore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCopyPrompt = useCallback(() => {
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [prompt]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = imageName || `image-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const displayName = imageName
    ? imageName.replace(/\.[^.]+$/, '')
    : '未命名作品';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/95 z-50 flex"
      onClick={onClose}
    >
      {/* Left: Image Area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
      >
        {/* Close button - top right of image area */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Prev/Next arrows */}
        {hasPrev && onPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Image */}
        <motion.img
          key={imageUrl}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          src={imageUrl}
          alt={displayName}
          className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={() => setImageLoaded(true)}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Right: Info Panel */}
      <div
        className="w-[380px] bg-[#111317] border-l border-white/[0.06] flex flex-col overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-400">
                  {(author || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {author || '匿名用户'}
                </p>
                <p className="text-[10px] text-slate-500">室内大师创作者</p>
              </div>
            </div>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isLiked
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
              />
            </button>
          </div>

          <h2 className="text-base font-bold text-white mb-1">{displayName}</h2>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {createdAt && (
              <span>
                {new Date(createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
            )}
            {imageSize && (
              <>
                <span className="w-0.5 h-0.5 bg-slate-600 rounded-full" />
                <span>{formatFileSize(imageSize)}</span>
              </>
            )}
            <span className="w-0.5 h-0.5 bg-slate-600 rounded-full" />
            <span>内容由 AI 生成</span>
          </div>
        </div>

        {/* Prompt Section */}
        {prompt && (
          <div className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                图片提示词
              </h3>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[11px] rounded-md transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <p
                className={`text-xs text-slate-300 leading-relaxed whitespace-pre-wrap ${
                  showMore ? '' : 'line-clamp-6'
                }`}
              >
                {prompt}
              </p>
              {!showMore && prompt.length > 120 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#111317] to-transparent" />
              )}
            </div>
            {prompt.length > 120 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showMore ? '收起' : '更多'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-5 mt-auto space-y-2.5">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium rounded-xl border border-white/[0.06] transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            下载原图
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(imageUrl);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium rounded-xl border border-white/[0.06] transition-all duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            复制图片链接
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ImagePreviewModal;
