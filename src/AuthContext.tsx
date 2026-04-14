import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiFetch, setStoredToken, clearStoredToken } from './api.js';

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  api_key: string;
  is_admin: number;
  compute_points: number;
  created_at: string;
  updated_at: string;
  token?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nickname: string, verificationCode: string) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { nickname?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;
  updateApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiFetch<User>('/auth/me', { method: 'GET' });
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<User & { token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.success && result.data) {
      // Save token for future requests
      if (result.data.token) {
        setStoredToken(result.data.token);
      }
      // Remove token from user data before storing
      const { token: _, ...userData } = result.data;
      setUser(userData);
      return { success: true };
    }
    return { success: false, error: result.error || '登录失败' };
  }, []);

  const register = useCallback(async (email: string, password: string, nickname: string, verificationCode: string) => {
    const result = await apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname, verificationCode }),
    });
    if (result.success && result.data) {
      setUser(result.data);
      return { success: true };
    }
    return { success: false, error: result.error || '注册失败' };
  }, []);

  const sendVerificationCode = useCallback(async (email: string) => {
    const result = await apiFetch('/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error || '发送验证码失败' };
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    clearStoredToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { nickname?: string; avatar?: string }) => {
    const result = await apiFetch<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (result.success && result.data) {
      setUser(result.data);
      return { success: true };
    }
    return { success: false, error: result.error || '更新失败' };
  }, []);

  const updateApiKey = useCallback(async (apiKey: string) => {
    const result = await apiFetch<User>('/user/api-key', {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    });
    if (result.success && result.data) {
      setUser(result.data);
      return { success: true };
    }
    return { success: false, error: result.error || '更新失败' };
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const result = await apiFetch('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error || '修改密码失败' };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        sendVerificationCode,
        logout,
        refreshUser,
        updateProfile,
        updateApiKey,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
