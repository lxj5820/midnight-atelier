/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, X, Info } from 'lucide-react';
import type { ToastMessage } from '../../types';
import { TOAST_AUTO_DISMISS_MS } from '../../utils/constants';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  // 错误类型使用 assertive，让屏幕阅读器立即播报
  const politeness = toast.type === 'error' ? 'assertive' : 'polite';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
        toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'
      } text-white`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
    >
      {toast.type === 'success' && <Check className="w-5 h-5" aria-hidden="true" />}
      {toast.type === 'error' && <X className="w-5 h-5" aria-hidden="true" />}
      {toast.type === 'info' && <Info className="w-5 h-5" aria-hidden="true" />}
      <span className="font-medium">{toast.message}</span>
    </motion.div>
  );
};
