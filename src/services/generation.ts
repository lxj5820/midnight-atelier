import {
  blobToBase64,
  getCachedImageBlob,
  getImageDimensionsFromBlob,
  getSizeFromRefImage,
  getClosestAspectRatio,
  getResolution,
} from '../utils';
import { API_TIMEOUT_MS } from '../utils/constants';

export interface GenerateImageParams {
  apiKey: string;
  model: string;
  prompt: string;
  quality: string;
  aspectRatio: string;
  referenceImageUrls: string[];
}

export interface GenerateImageResult {
  imageUrl: string;
  effectiveAspectRatio: string;
  width: number;
  height: number;
}

const gptImage2SizeMap: Record<string, Record<string, string>> = {
  '1K': { '1:1': '1024x1024', '2:3': '1024x1536', '3:2': '1536x1024', '9:16': '720x1280', '16:9': '1280x720' },
  '2K': { '1:1': '2048x2048', '2:3': '1360x2048', '3:2': '2048x1360', '9:16': '1152x2048', '16:9': '2048x1152' },
  '4K': { '1:1': '2880x2880', '2:3': '2304x3456', '3:2': '3456x2304', '9:16': '2160x3840', '16:9': '3840x2160' }
};

const modelMap: Record<string, string> = {
  '🍌全能图片V2': 'gemini-3.1-flash-image-preview',
  '🍌全能图片PRO': 'gemini-3-pro-image-preview'
};

function parseErrorMessage(err: any, status: number): string {
  if (status === 401 || status === 403) return 'API 密钥无效或余额不足';
  if (status === 429) return '请求过于频繁，请稍后再试';
  if (status >= 500) return `服务器繁忙 (${status})`;
  return err?.error?.message || `请求失败 (${status})`;
}

async function fetchWithAuth(
  url: string,
  apiKey: string,
  options: RequestInit,
  contentType?: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
    if (contentType) headers['Content-Type'] = contentType;
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractImageUrl(data: any): string {
  if (data.data?.b64_json) {
    return `data:image/png;base64,${data.data.b64_json}`;
  }
  if (Array.isArray(data.data) && data.data.length > 0) {
    const imgData = data.data[0];
    if (imgData.b64_json) return `data:image/png;base64,${imgData.b64_json}`;
    if (imgData.url) return imgData.url;
  }
  if (data.choices && data.choices.length > 0) {
    const content = data.choices[0].message?.content;
    if (content) return content.startsWith('data:') ? content : `data:image/png;base64,${content}`;
  }
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return '';
}

async function resolveEffectiveAspectRatio(
  aspectRatio: string,
  referenceImageUrls: string[]
): Promise<string> {
  if (aspectRatio !== 'auto' || referenceImageUrls.length === 0) return aspectRatio;
  const refBlob = await getCachedImageBlob(referenceImageUrls[0]);
  if (!refBlob) return aspectRatio;
  const refDims = await getImageDimensionsFromBlob(refBlob);
  return refDims ? getClosestAspectRatio(refDims.width, refDims.height) : aspectRatio;
}

async function resolveGptImageSize(
  aspectRatio: string,
  quality: string,
  referenceImageUrls: string[]
): Promise<string> {
  if (aspectRatio !== 'auto' || referenceImageUrls.length === 0) {
    return gptImage2SizeMap[quality]?.[aspectRatio] || 'auto';
  }
  const refBlob = await getCachedImageBlob(referenceImageUrls[0]);
  if (!refBlob) return 'auto';
  const refDims = await getImageDimensionsFromBlob(refBlob);
  return refDims ? getSizeFromRefImage(refDims.width, refDims.height, quality) : 'auto';
}

async function callGptImage2Edit(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { apiKey, prompt, quality, aspectRatio, referenceImageUrls } = params;
  const imageSize = await resolveGptImageSize(aspectRatio, quality, referenceImageUrls);

  const formData = new FormData();
  formData.append('model', 'gpt-image-2');
  formData.append('prompt', prompt);
  formData.append('size', imageSize);
  formData.append('quality', quality === '4K' ? 'high' : quality === '2K' ? 'medium' : 'low');
  formData.append('n', '1');
  formData.append('input_fidelity', '0.5');

  for (let i = 0; i < referenceImageUrls.length; i++) {
    const blob = await getCachedImageBlob(referenceImageUrls[i]);
    if (!blob) continue;
    const fileName = i === 0 ? 'image.png' : `image_${i}.png`;
    formData.append('image', blob, fileName);
  }

  const response = await fetchWithAuth(
    'https://newapi.asia/v1/images/edits',
    apiKey,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(parseErrorMessage(err, response.status));
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API 返回错误');

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) throw new Error('响应中未找到图片');

  const effectiveAspectRatio = await resolveEffectiveAspectRatio(aspectRatio, referenceImageUrls);
  const resolution = effectiveAspectRatio !== 'auto'
    ? getResolution(effectiveAspectRatio, quality)
    : { width: 0, height: 0, tokens: 0 };

  return {
    imageUrl,
    effectiveAspectRatio,
    width: resolution.width,
    height: resolution.height,
  };
}

async function callGptImage2Generation(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { apiKey, prompt, quality, aspectRatio } = params;
  const imageSize = gptImage2SizeMap[quality]?.[aspectRatio] || 'auto';
  const body = {
    model: 'gpt-image-2',
    prompt,
    size: imageSize,
    quality: quality === '4K' ? 'high' : quality === '2K' ? 'medium' : 'low',
    n: 1,
    format: 'png'
  };

  const response = await fetchWithAuth(
    'https://newapi.asia/v1/images/generations',
    apiKey,
    { method: 'POST', body: JSON.stringify(body) },
    'application/json'
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(parseErrorMessage(err, response.status));
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API 返回错误');

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) throw new Error('响应中未找到图片');

  const resolution = aspectRatio !== 'auto'
    ? getResolution(aspectRatio, quality)
    : { width: 0, height: 0, tokens: 0 };

  return {
    imageUrl,
    effectiveAspectRatio: aspectRatio,
    width: resolution.width,
    height: resolution.height,
  };
}

async function callGeminiGeneration(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { apiKey, model, prompt, quality, aspectRatio, referenceImageUrls } = params;
  const apiModel = modelMap[model] || 'gemini-2.5-flash-image-preview';
  const apiUrl = `https://newapi.asia/v1beta/models/${apiModel}:generateContent`;

  const effectiveAspectRatio = await resolveEffectiveAspectRatio(aspectRatio, referenceImageUrls);

  const parts: any[] = [];
  for (const imgUrl of referenceImageUrls) {
    try {
      const blob = await getCachedImageBlob(imgUrl);
      if (!blob) continue;
      const base64 = await blobToBase64(blob);
      parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } });
    } catch { /* skip invalid images */ }
  }
  parts.push({ text: prompt });

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        ...(effectiveAspectRatio !== 'auto' && { aspectRatio: effectiveAspectRatio }),
        imageSize: quality
      }
    }
  };

  const response = await fetchWithAuth(
    apiUrl,
    apiKey,
    { method: 'POST', body: JSON.stringify(requestBody) },
    'application/json'
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(parseErrorMessage(err, response.status));
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API 返回错误');

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) throw new Error('响应中未找到图片');

  const resolution = effectiveAspectRatio !== 'auto'
    ? getResolution(effectiveAspectRatio, quality)
    : { width: 0, height: 0, tokens: 0 };

  return {
    imageUrl,
    effectiveAspectRatio,
    width: resolution.width,
    height: resolution.height,
  };
}

/**
 * 统一图片生成入口，支持 GPT Image 2 与 Gemini 系列模型
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  if (params.model === 'GPT Image 2') {
    if (params.referenceImageUrls.length > 0) {
      return callGptImage2Edit(params);
    }
    return callGptImage2Generation(params);
  }
  return callGeminiGeneration(params);
}
