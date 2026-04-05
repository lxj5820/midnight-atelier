import OSS from 'ali-oss';

// 验证必需的环境变量
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET;
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-chengdu';
const OSS_BUCKET = process.env.OSS_BUCKET || 'lxj-picgo';

if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET) {
  throw new Error('Missing required OSS environment variables: OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET');
}

const client = new OSS({
  region: OSS_REGION,
  accessKeyId: OSS_ACCESS_KEY_ID,
  accessKeySecret: OSS_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET
});

// 从完整URL中提取OSS对象路径
function extractObjectNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // 去掉开头的 /
    return urlObj.pathname.substring(1);
  } catch {
    return null;
  }
}

// 检查OSS图片是否存在
export async function checkOSSImageExists(url: string): Promise<boolean> {
  // 如果是相对路径（本地文件），不检查
  if (!url.startsWith('http')) {
    return true;
  }

  const objectName = extractObjectNameFromUrl(url);
  if (!objectName) return false;

  try {
    await client.head(objectName);
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    // 其他错误默认认为存在，避免误删
    console.warn('OSS head check error:', error.message);
    return true;
  }
}

// 允许的图片 MIME 类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// 图片文件头（magic bytes）验证
const IMAGE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
};

function verifyImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signature = IMAGE_SIGNATURES[mimeType];
  if (!signature) return false;

  if (mimeType === 'image/webp') {
    // WebP: RIFF....WEBP
    if (buffer.length < 12) return false;
    return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
           buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

export async function uploadToOSS(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  // 验证 MIME 类型
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error('不支持的图片类型，仅支持 JPEG, PNG, WEBP, GIF');
  }

  // 验证文件头（防止伪造文件类型）
  if (!verifyImageMagicBytes(buffer, mimeType)) {
    throw new Error('无效的图片文件');
  }

  const ext = mimeType.split('/')[1] || 'jpg';
  const objectName = `gallery/${Date.now()}-${filename}.${ext}`;

  try {
    const result = await client.put(objectName, buffer, {
      contentType: mimeType
    });
    return result.url;
  } catch (error) {
    console.error('OSS upload error:', error);
    throw new Error('上传到 OSS 失败');
  }
}

export async function uploadBase64ToOSS(
  base64Data: string,
  customFilename?: string
): Promise<string> {
  // 从 base64 数据提取 mime 类型和实际数据
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的 base64 数据格式');
  }

  const mimeType = matches[1];
  const base64 = matches[2];

  // 验证 MIME 类型
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error('不支持的图片类型，仅支持 JPEG, PNG, WEBP, GIF');
  }

  const buffer = Buffer.from(base64, 'base64');

  // 验证文件大小（最大 10MB）
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('图片大小不能超过 10MB');
  }

  // 验证文件头
  if (!verifyImageMagicBytes(buffer, mimeType)) {
    throw new Error('无效的图片文件');
  }

  const filename = customFilename || `image-${Date.now()}`;
  return uploadToOSS(buffer, filename, mimeType);
}
