import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchTokenInfo, fetchLogStats, formatQuota, formatExpiresAt, type TokenInfo, type LogStatItem } from '../utils/tokenQuery';
import { useApiKey } from '../ApiKeyContext';

interface TokenState {
  tokenInfo: TokenInfo | null;
  logStats: LogStatItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  // 标记数据已过期（生成完成后调用），会延迟自动刷新一次
  markStale: () => void;
  usedPercent: number;
  formatQuota: typeof formatQuota;
  formatExpiresAt: typeof formatExpiresAt;
}

const TokenQueryContext = createContext<TokenState | undefined>(undefined);

export function TokenQueryProvider({ children }: { children: React.ReactNode }) {
  const { apiKey, hasApiKey } = useApiKey();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [logStats, setLogStats] = useState<LogStatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const lastKeyRef = useRef('');

  const loadTokenData = useCallback(async (key: string) => {
    if (!key || refreshingRef.current) return;
    refreshingRef.current = true;
    lastKeyRef.current = key;
    setLoading(true);
    setError(null);
    try {
      const [info, stats] = await Promise.all([
        fetchTokenInfo(key),
        fetchLogStats(key).catch(() => []),
      ]);
      setTokenInfo(info);
      setLogStats(stats);
    } catch (e: any) {
      setError(e.message || '查询失败');
      setTokenInfo(null);
      setLogStats([]);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (hasApiKey && apiKey !== lastKeyRef.current) {
      loadTokenData(apiKey);
    } else if (!hasApiKey) {
      setTokenInfo(null);
      setLogStats([]);
      setError(null);
      lastKeyRef.current = '';
    }
  }, [apiKey, hasApiKey, loadTokenData]);

  const refresh = useCallback(() => {
    if (hasApiKey) {
      refreshingRef.current = false;
      loadTokenData(apiKey);
    }
  }, [hasApiKey, apiKey, loadTokenData]);

  // 标记数据已过期：生成完成后立即刷新一次
  const markStale = useCallback(() => {
    if (!hasApiKey) return;
    refreshingRef.current = false;
    loadTokenData(apiKey);
  }, [hasApiKey, apiKey, loadTokenData]);

  const usedPercent = tokenInfo && !tokenInfo.unlimited_quota && tokenInfo.total_granted > 0
    ? Math.min((tokenInfo.total_used / tokenInfo.total_granted) * 100, 100)
    : 0;

  return (
    <TokenQueryContext.Provider value={{ tokenInfo, logStats, loading, error, refresh, markStale, usedPercent, formatQuota, formatExpiresAt }}>
      {children}
    </TokenQueryContext.Provider>
  );
}

export function useTokenQuery(): TokenState {
  const context = useContext(TokenQueryContext);
  if (!context) {
    throw new Error('useTokenQuery must be used within TokenQueryProvider');
  }
  return context;
}
