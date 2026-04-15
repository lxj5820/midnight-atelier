import { apiFetch } from './api.js';
import type { User } from './AuthContext.tsx';

export interface SmtpSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

export interface SystemSettings extends SmtpSettings {
  registration_enabled?: boolean;
  registration_requires_verification?: boolean;
  default_api_key?: string;
}

export async function getAdminUsers() {
  return await apiFetch<User[]>('/admin/users', { method: 'GET' });
}

export async function deleteUser(userId: string) {
  return await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
}

export async function updateUserAdminStatus(userId: string, isAdmin: number) {
  return await apiFetch<User>(`/admin/users/${userId}/admin`, {
    method: 'PUT',
    body: JSON.stringify({ isAdmin }),
  });
}

export async function getSystemSettings() {
  return await apiFetch<Record<string, string>>('/admin/settings', { method: 'GET' });
}

export async function updateSystemSettings(settings: Partial<SystemSettings> & { registration_enabled?: boolean; registration_requires_verification?: boolean }) {
  return await apiFetch('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateDefaultApiKey(apiKey: string) {
  return await apiFetch('/admin/default-api-key', {
    method: 'PUT',
    body: JSON.stringify({ default_api_key: apiKey }),
  });
}

export async function updateUserComputePoints(userId: string, points: number, action: 'add' | 'set') {
  return await apiFetch<User>(`/admin/users/${userId}/compute-points`, {
    method: 'PUT',
    body: JSON.stringify({ points, action }),
  });
}

export async function updateUserApiKey(userId: string, apiKey: string) {
  return await apiFetch<User>(`/admin/users/${userId}/api-key`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  });
}

export async function createUser(email: string, password: string, nickname: string) {
  return await apiFetch<User>('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  });
}

export async function giftComputePoints(userId: string, points: number, reason: string) {
  return await apiFetch<User>(`/admin/users/${userId}/compute-points/gift`, {
    method: 'POST',
    body: JSON.stringify({ points, reason }),
  });
}

export async function compensateComputePoints(userId: string, points: number, reason: string) {
  return await apiFetch<User>(`/admin/users/${userId}/compute-points/compensate`, {
    method: 'POST',
    body: JSON.stringify({ points, reason }),
  });
}

export async function deductComputePoints(userId: string, points: number, reason: string) {
  return await apiFetch<User>(`/admin/users/${userId}/compute-points/deduct`, {
    method: 'POST',
    body: JSON.stringify({ points, reason }),
  });
}

export async function clearComputePoints(userId: string, reason: string) {
  return await apiFetch<User>(`/admin/users/${userId}/compute-points/clear`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Subscription APIs
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  monthly_quota: number;
  daily_sign_in: number;
  qualities: string;
  concurrency: number;
  watermark: number;
  extras: string;
  is_active: number;
  sort_order: number;
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
}

export interface PlanInput {
  id: string;
  name: string;
  price: number;
  period: string;
  monthlyQuota: number;
  dailySignIn: number;
  qualities: string;
  concurrency: number;
  watermark?: boolean;
  extras?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function getAdminPlans() {
  return await apiFetch<SubscriptionPlan[]>('/admin/plans', { method: 'GET' });
}

export async function createPlan(plan: PlanInput) {
  return await apiFetch<SubscriptionPlan>('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
}

export async function updatePlan(id: string, plan: Partial<PlanInput>) {
  return await apiFetch<SubscriptionPlan>(`/admin/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(plan),
  });
}

export async function deletePlan(id: string) {
  return await apiFetch(`/admin/plans/${id}`, { method: 'DELETE' });
}

export async function getUserSubscriptions(userId: string) {
  return await apiFetch<{ subscriptions: UserSubscription[]; activeSubscription: UserSubscription | null }>(`/admin/users/${userId}/subscriptions`, { method: 'GET' });
}

export async function createUserSubscription(userId: string, planId: string, months?: number) {
  return await apiFetch<{ subscription: UserSubscription; addedPoints: number; monthlyPoints: number; dailyPoints: number }>(`/admin/users/${userId}/subscriptions`, {
    method: 'POST',
    body: JSON.stringify({ planId, months }),
  });
}

export async function cancelUserSubscription(userId: string, subscriptionId: string) {
  return await apiFetch(`/admin/users/${userId}/subscriptions/${subscriptionId}/cancel`, {
    method: 'PUT',
  });
}

export async function extendUserSubscription(userId: string, subscriptionId: string, months: number) {
  return await apiFetch<{ extended: UserSubscription; addedPoints: number; monthlyPoints: number; dailyPoints: number }>(`/admin/users/${userId}/subscriptions/${subscriptionId}/extend`, {
    method: 'PUT',
    body: JSON.stringify({ months }),
  });
}

export async function deleteUserSubscription(userId: string, subscriptionId: string) {
  return await apiFetch(`/admin/users/${userId}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

// Email Templates
export async function getEmailTemplates() {
  return await apiFetch<Record<string, string>>('/admin/email-templates', { method: 'GET' });
}

export async function updateEmailTemplates(templates: Record<string, string>) {
  return await apiFetch('/admin/email-templates', {
    method: 'PUT',
    body: JSON.stringify({ templates }),
  });
}

// Generation Logs
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
