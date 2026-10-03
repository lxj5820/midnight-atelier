import type { MenuItemId } from '../menuConfig';

export interface GenerationRecord {
  id: string;
  type: MenuItemId;
  prompt: string;
  imageUrl: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  createdAt: string;
  resolution?: {
    width: number;
    height: number;
    quality: string;
    aspectRatio: string;
  };
}

export interface GenerationResult {
  status: string;
  request_id: string;
  response_url: string;
  status_url: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type View = 'workspace' | 'settings' | 'admin' | 'edit' | 'video';

export interface PreviewImageData {
  url: string;
  name?: string;
  size?: number;
  prompt?: string;
  createdAt?: string;
  author?: string;
}
