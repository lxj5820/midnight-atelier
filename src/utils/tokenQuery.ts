const NEWAPI_BASE = 'https://newapi.asia';
const QUOTA_PER_DOLLAR = 500000;

function buildUrl(apiPath: string): string {
  if (window.location.hostname === 'localhost') {
    return `/api/newapi${apiPath}`;
  }
  return `/.netlify/functions/newapi-proxy?path=${encodeURIComponent(apiPath)}`;
}

export interface TokenInfo {
  object?: string;
  name: string;
  total_granted: number;
  total_used: number;
  total_available: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits: Record<string, boolean> | string | null;
  expires_at: number | null;
}

export interface LogStatItem {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  quota: number;
  count: number;
}

export interface TokenUsageResponse {
  success: boolean;
  message: string;
  data: TokenInfo;
}

export interface LogStatResponse {
  success: boolean;
  message: string;
  data: LogStatItem[];
}

function quotaToDollars(quota: number): string {
  return (quota / QUOTA_PER_DOLLAR).toFixed(2);
}

export function formatQuota(quota: number): string {
  return `$${quotaToDollars(quota)}`;
}

export function formatExpiresAt(timestamp: number | null): string {
  if (!timestamp) return '永不过期';
  const date = new Date(timestamp * 1000);
  if (date.getFullYear() > 2099) return '永不过期';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export async function fetchTokenInfo(apiKey: string): Promise<TokenInfo> {
  const res = await fetch(buildUrl('/api/usage/token'), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let json: TokenUsageResponse;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`服务器返回了非 JSON 响应（HTTP ${res.status}），请检查 API Key 是否正确或网络是否可达`);
  }
  if (!json.success) {
    throw new Error(json.message || '查询令牌信息失败');
  }
  return json.data;
}

export async function fetchLogStats(apiKey: string): Promise<LogStatItem[]> {
  const res = await fetch(buildUrl('/api/log/self/stat'), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let json: LogStatResponse;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  if (!json.success) {
    return [];
  }
  return json.data || [];
}
