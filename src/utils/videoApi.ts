/**
 * 视频生成 API 封装 - 通义万象 happyhorse 模型
 * 有图片时使用 happyhorse-1.0-r2v（图生视频，支持 1-9 张参考图），无图片时使用 happyhorse-1.0-t2v（文生视频）
 * API 采用异步调用：提交任务获取 task_id -> 轮询任务状态 -> 获取视频 URL
 */

const VIDEO_API_BASE = 'https://newapi.asia/alibailian/api/v1';

export interface VideoTaskParams {
  prompt: string;
  imageUrls?: string[]; // 公网 URL 数组，1-9 张，有则 r2v，无则 t2v
  resolution: '720P' | '1080P';
  duration: number; // 3-15 秒
  watermark: boolean;
  ratio?: string; // 仅 t2v: '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
}

export type VideoTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

export interface VideoTaskResult {
  status: VideoTaskStatus;
  videoUrl?: string;
  error?: string;
}

/**
 * 提交视频生成任务，返回 task_id
 */
export async function submitVideoTask(apiKey: string, params: VideoTaskParams): Promise<string> {
  const hasImages = !!(params.imageUrls && params.imageUrls.length > 0);
  // 有图片用 r2v（支持 1-9 张参考图），无图片用 t2v
  const model = hasImages ? 'happyhorse-1.0-r2v' : 'happyhorse-1.0-t2v';

  if (hasImages && params.imageUrls!.length > 9) {
    throw new Error('参考图最多支持 9 张');
  }

  const body: Record<string, unknown> = {
    model,
    input: hasImages
      ? {
          prompt: params.prompt,
          media: params.imageUrls!.map(url => ({ type: 'reference_image', url })),
        }
      : { prompt: params.prompt },
    parameters: {
      resolution: params.resolution,
      ratio: params.ratio || '16:9',
      duration: params.duration,
      watermark: params.watermark,
    },
  };

  const response = await fetch(`${VIDEO_API_BASE}/services/aigc/video-generation/video-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const status = response.status;
    let errorMsg: string;
    if (status === 401 || status === 403) errorMsg = 'API 密钥无效或余额不足';
    else if (status === 429) errorMsg = '请求过于频繁，请稍后再试';
    else if (status >= 500) errorMsg = `服务器繁忙 (${status})`;
    else errorMsg = (err as { error?: { message?: string } })?.error?.message || `请求失败 (${status})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('未获取到任务ID');
  return taskId;
}

/**
 * 查询视频任务状态
 */
export async function queryVideoTask(apiKey: string, taskId: string): Promise<VideoTaskResult> {
  const response = await fetch(`${VIDEO_API_BASE}/tasks/${taskId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`查询任务失败 (${response.status})`);
  }

  const data = await response.json();
  const status = (data.output?.task_status as VideoTaskStatus) || 'UNKNOWN';

  if (status === 'SUCCEEDED') {
    return { status, videoUrl: data.output?.video_url };
  }
  if (status === 'FAILED') {
    return { status, error: data.output?.message || '视频生成失败' };
  }
  return { status };
}

/**
 * 轮询视频任务直到完成，返回视频 URL
 */
export async function pollVideoTask(
  apiKey: string,
  taskId: string,
  onStatus?: (status: VideoTaskStatus) => void,
  signal?: AbortSignal,
): Promise<string> {
  const POLL_INTERVAL = 5000; // 5 秒轮询
  const MAX_DURATION = 10 * 60 * 1000; // 10 分钟超时

  const startTime = Date.now();

  while (true) {
    if (signal?.aborted) throw new Error('已取消生成');
    if (Date.now() - startTime > MAX_DURATION) throw new Error('视频生成超时，请稍后重试');

    const result = await queryVideoTask(apiKey, taskId);
    onStatus?.(result.status);

    if (result.status === 'SUCCEEDED' && result.videoUrl) {
      return result.videoUrl;
    }
    if (result.status === 'FAILED') {
      throw new Error(result.error || '视频生成失败');
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}
