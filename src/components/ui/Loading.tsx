/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

export const LoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" aria-hidden="true" />
      <span className="sr-only">加载中…</span>
    </div>
  );
};

export const LoadingPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-surface-1">
      <div className="text-center">
        <LoadingSpinner className="mb-4" />
        <p className="text-text-secondary text-sm" aria-hidden="true">加载中…</p>
      </div>
    </div>
  );
};
