import OSS from 'ali-oss';

export interface OssGalleryEnv {
  OSS_ACCESS_KEY_ID?: string;
  OSS_ACCESS_KEY_SECRET?: string;
  OSS_GALLERY_BUCKET?: string;
  OSS_GALLERY_REGION?: string;
  OSS_GALLERY_PUBLIC_URL?: string;
  // 回退到主 OSS 配置
  OSS_BUCKET?: string;
  OSS_REGION?: string;
  OSS_PUBLIC_URL?: string;
}

export interface GalleryItem {
  name: string;
  url: string;
  size: number;
  lastModified: string;
  promptUrl?: string;
}

function getBucket(env: OssGalleryEnv) { return env.OSS_GALLERY_BUCKET || env.OSS_BUCKET; }
function getRegion(env: OssGalleryEnv) { return env.OSS_GALLERY_REGION || env.OSS_REGION; }
function getPublicUrl(env: OssGalleryEnv) { return env.OSS_GALLERY_PUBLIC_URL || env.OSS_PUBLIC_URL; }

export function isOSSConfigured(env: OssGalleryEnv): boolean {
  return !!(env.OSS_ACCESS_KEY_ID && env.OSS_ACCESS_KEY_SECRET && getBucket(env) && getRegion(env));
}

export async function listGalleryImages(prefix: string, env: OssGalleryEnv): Promise<GalleryItem[]> {
  if (!isOSSConfigured(env)) {
    throw new Error('OSS not configured');
  }

  const bucket = getBucket(env)!;
  const region = getRegion(env)!;

  const client = new OSS({
    region,
    accessKeyId: env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET!,
    bucket,
    secure: true,
  });

  const allObjects: OSS.ObjectMeta[] = [];
  let marker: string | undefined;

  do {
    const result = await client.list({
      prefix,
      marker,
      'max-keys': 200,
    });
    if (result.objects) {
      allObjects.push(...result.objects);
    }
    marker = result.nextMarker;
  } while (marker);

  // 分离图片和 md 文件
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i;
  const mdFiles: Record<string, string> = {};
  const imageObjects: OSS.ObjectMeta[] = [];

  for (const obj of allObjects) {
    const name = obj.name.split('/').pop() || '';
    if (name.endsWith('.md')) {
      const baseName = name.replace(/\.md$/i, '');
      mdFiles[baseName] = getPublicObjectUrl(obj.name, bucket, region, getPublicUrl(env));
    } else if (imageExtensions.test(name)) {
      imageObjects.push(obj);
    }
  }

  return imageObjects.map(obj => {
    const name = obj.name.split('/').pop() || '';
    const baseName = name.replace(/\.[^.]+$/, '');
    return {
      name,
      url: getPublicObjectUrl(obj.name, bucket, region, getPublicUrl(env)),
      size: obj.size || 0,
      lastModified: obj.lastModified || new Date().toISOString(),
      promptUrl: mdFiles[baseName],
    };
  });
}

function getPublicObjectUrl(key: string, bucket: string, region: string, publicUrl?: string): string {
  return publicUrl
    ? `${publicUrl.replace(/\/+$/, '')}/${key}`
    : `https://${bucket}.${region}.aliyuncs.com/${key}`;
}
