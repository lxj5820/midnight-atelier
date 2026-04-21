// API Key localStorage key
const API_KEY_STORAGE_KEY = 'user_api_key';

// API Response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Get stored API key from localStorage
export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Set API key to localStorage
export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch (e) {
    console.error('Failed to save API key:', e);
  }
}

// Clear API key from localStorage
export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear API key:', e);
  }
}

// Image generation params for direct API calls
export interface GenerateImageParams {
  model: string;
  prompt: string;
  referenceImages: string[];  // base64 encoded images
  aspectRatio: string;
  quality: string;
}

export interface GenerateImageResult {
  imageUrl: string;  // base64 encoded image
}

// Note: Image generation is handled directly in WorkspaceView.tsx
// using the user's API key. No proxy needed for pure frontend.
