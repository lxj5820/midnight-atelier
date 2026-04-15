const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const TOKEN_KEY = 'auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Get token from localStorage and add to Authorization header
    const token = getStoredToken();

    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    // Only set Content-Type for JSON requests when body exists and is not FormData
    const body = options.body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `请求失败 (${response.status})`,
      };
    }

    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

export async function deductComputePoints(points: number, reason?: string, model?: string, type?: string) {
  return await apiFetch('/user/deduct-compute-points', {
    method: 'POST',
    body: JSON.stringify({ points, reason, model, type }),
  });
}

export async function getGenerationLogs(params: {
  user_id?: string;
  model?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params.user_id) query.append('user_id', params.user_id);
  if (params.model) query.append('model', params.model);
  if (params.type) query.append('type', params.type);
  if (params.start_date) query.append('start_date', params.start_date);
  if (params.end_date) query.append('end_date', params.end_date);
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));

  return await apiFetch<{ logs: GenerationLog[]; total: number }>(`/admin/generation-logs?${query.toString()}`, { method: 'GET' });
}

export interface GenerationLog {
  id: string;
  userId: string;
  model: string;
  type: string;
  points: number;
  createdAt: string;
  userNickname?: string;
  userEmail?: string;
}

export async function refundComputePoints(reason?: string) {
  return await apiFetch('/user/refund-compute-points', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getRegistrationStatus(): Promise<ApiResponse<{ registration_enabled: boolean }>> {
  return await apiFetch('/public/registration-status', { method: 'GET' });
}

export async function getDefaultApiKey(): Promise<ApiResponse<{ default_api_key: string }>> {
  return await apiFetch('/public/default-api-key', { method: 'GET' });
}

export async function dailySignIn(): Promise<ApiResponse<{ signedIn: boolean; points?: number; message?: string }>> {
  return await apiFetch('/user/daily-sign-in', { method: 'POST' });
}
// 如需补偿，请通过管理员后台手动操作

export interface ComputePointLog {
  id: string;
  user_id: string;
  amount: number;
  type: 'gift' | 'compensation' | 'deduct' | 'clear' | 'consume';
  reason: string;
  operator_id: string;
  created_at: string;
}

export async function getComputePointLogs(params: {
  type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.append('type', params.type);
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  return await apiFetch<{ logs: ComputePointLog[]; total: number }>(`/user/compute-points/logs?${searchParams.toString()}`, {
    method: 'GET',
  });
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  expire_date: string;
  plan_name: string;
  plan_price: number;
  plan_period: string;
  qualities: string[];
}

export async function getUserSubscription() {
  return await apiFetch<UserSubscription | null>('/user/subscription', {
    method: 'GET',
  });
}
