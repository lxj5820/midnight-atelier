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

export async function deductComputePoints(points: number, reason?: string) {
  return await apiFetch('/user/deduct-compute-points', {
    method: 'POST',
    body: JSON.stringify({ points, reason }),
  });
}

export async function refundComputePoints(reason?: string) {
  return await apiFetch('/user/refund-compute-points', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
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

export async function getComputePointLogs(type?: string, limit: number = 100, offset: number = 0) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  return await apiFetch<{ logs: ComputePointLog[]; total: number }>(`/user/compute-points/logs?${params.toString()}`, {
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
