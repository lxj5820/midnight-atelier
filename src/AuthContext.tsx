import React, { createContext, useContext, useState, useCallback } from 'react';
import { useApiKey } from './ApiKeyContext';

interface User {
  nickname: string;
  email: string;
  avatar: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { apiKey, setApiKey, clearApiKey } = useApiKey();
  const [isLoading] = useState(false);

  // Single user mode - no real user data needed
  const user: User | null = null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        apiKey,
        setApiKey,
        clearApiKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
