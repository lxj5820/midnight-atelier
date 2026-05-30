export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_PUBLIC_URL } = process.env;

  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
    return res.status(503).json({ error: 'OSS not configured' });
  }

  try {
    const { image, url, type, id } = req.body;

    let buffer: Buffer;
    let contentType = 'image/png';
    const filename = `${id || Date.now()}.png`;
    const date = new Date().toISOString().split('T')[0];
    const key = `atelier/${type || 'default'}/${date}/${filename}`;

    if (image && image.startsWith('data:')) {
      const matches = image.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid base64 data URL' });
      }
      contentType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(400).json({ error: 'Failed to fetch image from URL' });
      }
      contentType = response.headers.get('content-type') || 'image/png';
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const OSS = (await import('ali-oss')).default;
    const client = new OSS({
      region: OSS_REGION,
      accessKeyId: OSS_ACCESS_KEY_ID,
      accessKeySecret: OSS_ACCESS_KEY_SECRET,
      bucket: OSS_BUCKET,
    });

    await client.put(key, buffer, {
      headers: { 'Content-Type': contentType },
    });

    const ossUrl = OSS_PUBLIC_URL
      ? `${OSS_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
      : `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${key}`;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ url: ossUrl });
  } catch (error) {
    console.error('OSS upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
