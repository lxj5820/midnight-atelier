import React, { createContext, useContext, useState, useCallback } from 'react';

const API_KEY_STORAGE_KEY = 'user_api_key';

interface ApiKeyContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  hasApiKey: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(getStoredApiKey);

  const setApiKey = useCallback((key: string) => {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      setApiKeyState(key);
    } catch (e) {
      console.error('Failed to save API key:', e);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKeyState('');
    } catch (e) {
      console.error('Failed to clear API key:', e);
    }
  }, []);

  const hasApiKey = apiKey.trim().length > 0;

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, clearApiKey, hasApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey(): ApiKeyContextValue {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within ApiKeyProvider');
  }
  return context;
}
