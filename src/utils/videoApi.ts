/**
 * 视频生成 API 封装 - 豆包 Seedance（火山方舟协议）
 *
 * 接口（经模型中转站的 /api/v3 转发）：
 *   提交任务  POST {VIDEO_API_BASE}/contents/generations/tasks
 *   查询任务  GET  {VIDEO_API_BASE}/contents/generations/tasks/{task_id}
 *
 * 同一个模型同时支持文生视频与图生视频：
 *   无参考图 → content 只含 text
 *   有参考图 → 追加 image_url，作为首帧/参考图
 *
 * 分辨率、时长、比例、水印按方舟约定写成 prompt 的 --flag 后缀。
 * 异步调用：提交拿 task id → 轮询状态 → 取 video_url
 */

import { VIDEO_API_BASE, VIDEO_MODEL } from './apiConfig';

export interface VideoTaskParams {
  prompt: string;
  imageUrls?: string[]; // 公网 URL 数组，作为参考图/首帧
  videoUrls?: string[]; // 公网 URL 数组，作为参考视频
  resolution: '480P' | '720P' | '1080P';
  duration: number; // 秒
  watermark: boolean;
  ratio?: string; // 仅有文本时生效；给了参考素材则跟随素材比例
}

export type VideoTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

export interface VideoTaskResult {
  status: VideoTaskStatus;
  videoUrl?: string;
  error?: string;
}

const TASKS_PATH = '/contents/generations/tasks';

/** 把 UI 参数拼成方舟的 prompt 命令后缀 */
function buildPromptText(params: VideoTaskParams, hasRefs: boolean): string {
  const flags = [
    `--resolution ${params.resolution.toLowerCase()}`,
    `--duration ${params.duration}`,
    `--watermark ${params.watermark}`,
  ];
  // 有参考图/参考视频时跟随素材比例，不传 ratio
  if (!hasRefs && params.ratio) flags.push(`--ratio ${params.ratio}`);
  return `${params.prompt} ${flags.join(' ')}`;
}

/** 把方舟返回的状态字符串归一化为内部状态 */
function normalizeStatus(raw: unknown): VideoTaskStatus {
  switch (String(raw ?? '').toLowerCase()) {
    case 'queued':
    case 'pending':
      return 'PENDING';
    case 'running':
    case 'processing':
      return 'RUNNING';
    case 'succeeded':
    case 'success':
      return 'SUCCEEDED';
    case 'failed':
    case 'cancelled':
    case 'canceled':
      return 'FAILED';
    default:
      return 'UNKNOWN';
  }
}

function parseVideoError(err: any, status: number): string {
  if (status === 401 || status === 403) return 'API 密钥无效或余额不足';
  if (status === 429) return '请求过于频繁，请稍后再试';
  if (status >= 500) return `服务器繁忙 (${status})`;
  return err?.error?.message || err?.message || `请求失败 (${status})`;
}

/**
 * 提交视频生成任务，返回 task_id
 */
export async function submitVideoTask(apiKey: string, params: VideoTaskParams): Promise<string> {
  const hasImages = !!(params.imageUrls && params.imageUrls.length > 0);
  const hasVideos = !!(params.videoUrls && params.videoUrls.length > 0);

  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: buildPromptText(params, hasImages || hasVideos) },
  ];
  if (hasImages) {
    for (const url of params.imageUrls!) {
      content.push({ type: 'image_url', image_url: { url } });
    }
  }
  if (hasVideos) {
    for (const url of params.videoUrls!) {
      content.push({ type: 'video_url', video_url: { url } });
    }
  }

  const response = await fetch(`${VIDEO_API_BASE}${TASKS_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: VIDEO_MODEL, content }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(parseVideoError(err, response.status));
  }

  const data = await response.json();
  // 兼容中转站直接透传 { id } 与包装一层 { data: { id } } 两种形态
  const taskId = data?.id || data?.data?.id;
  if (!taskId) throw new Error(data?.error?.message || '未获取到任务ID');
  return taskId;
}

/**
 * 查询视频任务状态
 */
export async function queryVideoTask(apiKey: string, taskId: string): Promise<VideoTaskResult> {
  const response = await fetch(
    `${VIDEO_API_BASE}${TASKS_PATH}/${encodeURIComponent(taskId)}`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );

  if (!response.ok) {
    throw new Error(`查询任务失败 (${response.status})`);
  }

  const data = await response.json();
  const payload = data?.data ?? data;
  const status = normalizeStatus(payload?.status);

  if (status === 'SUCCEEDED') {
    return { status, videoUrl: payload?.content?.video_url || payload?.video_url };
  }
  if (status === 'FAILED') {
    return { status, error: payload?.error?.message || '视频生成失败' };
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