export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ComputePointLog {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  model?: string;
  type?: string;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface SystemSettings {
  maintenance_mode: boolean;
  maintenance_message?: string;
  allow_registration: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_from?: string;
}
