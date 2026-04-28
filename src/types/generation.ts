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

export interface GalleryItem {
  id: string;
  author: string;
  authorAvatar: string;
  imageUrl: string;
  description: string;
  type: 'published' | 'pending';
  createdAt: string;
  prompt?: string;
}

export type View = 'workspace' | 'gallery' | 'settings' | 'admin' | 'edit';

export type GalleryCategory = 'hot' | 'latest' | 'style';

export interface PreviewImageData {
  url: string;
  name?: string;
  size?: number;
  prompt?: string;
  createdAt?: string;
  author?: string;
}
