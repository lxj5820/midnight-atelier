import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';

function imageProxyPlugin(): Plugin {
  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/image-proxy', async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('url');
          if (!url) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }

          const parsedUrl = new URL(url);
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            res.statusCode = 400;
            res.end('Invalid URL protocol');
            return;
          }

          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': parsedUrl.origin + '/',
            },
          });

          if (!response.ok) {
            res.statusCode = response.status;
            res.end(`Upstream error: ${response.status}`);
            return;
          }

          const contentType = response.headers.get('content-type') || 'image/png';
          const buffer = Buffer.from(await response.arrayBuffer());

          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', 'attachment');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.end(buffer);
        } catch (err) {
          res.statusCode = 500;
          res.end('Failed to fetch image');
        }
      });
    },
  };
}

function ossUploadPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'oss-upload',
    configureServer(server) {
      server.middlewares.use('/api/oss-upload', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Access-Control-Max-Age', '86400');
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        if (!env.OSS_ACCESS_KEY_ID || !env.OSS_ACCESS_KEY_SECRET || !env.OSS_BUCKET || !env.OSS_REGION) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'OSS not configured' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          let body;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString());
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
          }
          const { image, url, type, id } = body;

          let buffer: Buffer;
          let contentType = 'image/png';
          const filename = `${id || Date.now()}.png`;
          const date = new Date().toISOString().split('T')[0];
          const key = `atelier/${type || 'default'}/${date}/${filename}`;

          if (image && image.startsWith('data:')) {
            const matches = image.match(/^data:(.+?);base64,(.+)$/);
            if (!matches) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid base64 data URL' }));
              return;
            }
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else if (url) {
            const response = await fetch(url);
            if (!response.ok) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to fetch image from URL' }));
              return;
            }
            contentType = response.headers.get('content-type') || 'image/png';
            buffer = Buffer.from(await response.arrayBuffer());
          } else {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No image data provided' }));
            return;
          }

          const OSS = (await import('ali-oss')).default;
          const client = new OSS({
            region: env.OSS_REGION,
            accessKeyId: env.OSS_ACCESS_KEY_ID,
            accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
            bucket: env.OSS_BUCKET,
          });

          await client.put(key, buffer, {
            headers: { 'Content-Type': contentType },
          });

          const ossUrl = env.OSS_PUBLIC_URL
            ? `${env.OSS_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
            : `https://${env.OSS_BUCKET}.${env.OSS_REGION}.aliyuncs.com/${key}`;

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(JSON.stringify({ url: ossUrl }));
        } catch (error) {
          console.error('OSS upload error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Upload failed' }));
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), imageProxyPlugin(), ossUploadPlugin(env)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001/api'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
