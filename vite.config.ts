import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';
import { createSignedUpload, formDataToPayload, getJSONHeaders, getOptionsHeaders, isOSSConfigured, UploadError, uploadPayloadToOSS } from './api/oss-upload-core';
import { listGalleryImages, isOSSConfigured as isGalleryOSSConfigured } from './api/oss-gallery-core';

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
          // 图片内联显示，其他类型附件下载
          if (contentType.startsWith('image/')) {
            res.setHeader('Content-Disposition', 'inline');
          } else {
            res.setHeader('Content-Disposition', 'attachment');
          }
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

function newApiProxyPlugin(): Plugin {
  return {
    name: 'newapi-proxy',
    configureServer(server) {
      server.middlewares.use('/api/newapi', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          // req.url 在 Connect 中间件中是去掉挂载前缀后的路径，如 /api/usage/token
          const targetPath = req.url || '/';
          const targetUrl = `https://newapi.asia${targetPath}`;

          const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          };
          if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization as string;
          }

          const response = await fetch(targetUrl, { headers });

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = response.status;
          const body = await response.text();
          res.end(body);
        } catch (err: any) {
          console.error('[newapi-proxy] Error:', err.message);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ success: false, message: `Proxy error: ${err.message}` }));
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
          for (const [key, value] of Object.entries(getOptionsHeaders())) {
            res.setHeader(key, value);
          }
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        if (!isOSSConfigured(env)) {
          res.statusCode = 503;
          for (const [key, value] of Object.entries(getJSONHeaders())) {
            res.setHeader(key, value);
          }
          res.end(JSON.stringify({ error: 'OSS not configured' }));
          return;
        }

        try {
          const contentType = req.headers['content-type'] || '';
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }

          const rawBody = Buffer.concat(chunks);
          let body;
          if (contentType.includes('multipart/form-data')) {
            const request = new Request('http://localhost/api/oss-upload', {
              method: 'POST',
              headers: { 'Content-Type': contentType },
              body: rawBody,
            });
            body = await formDataToPayload(await request.formData());
          } else {
            try {
              body = JSON.parse(rawBody.toString());
            } catch {
              throw new UploadError(400, 'Invalid JSON');
            }
          }

          if (body.action === 'sign') {
            const signedUpload = createSignedUpload(body, env);
            for (const [key, value] of Object.entries(getJSONHeaders())) {
              res.setHeader(key, value);
            }
            res.statusCode = 200;
            res.end(JSON.stringify(signedUpload));
            return;
          }

          const ossUrl = await uploadPayloadToOSS(body, env);

          for (const [key, value] of Object.entries(getJSONHeaders())) {
            res.setHeader(key, value);
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ url: ossUrl }));
        } catch (error) {
          console.error('OSS upload error:', error);
          res.statusCode = error instanceof UploadError ? error.statusCode : 500;
          for (const [key, value] of Object.entries(getJSONHeaders())) {
            res.setHeader(key, value);
          }
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Upload failed' }));
        }
      });
    },
  };
}

function ossGalleryPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'oss-gallery',
    configureServer(server) {
      server.middlewares.use('/api/oss-gallery', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Access-Control-Max-Age', '86400');
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (!isGalleryOSSConfigured(env)) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: 'OSS not configured' }));
          return;
        }

        try {
          const url = new URL(req.url || '/', `http://${req.headers.host}`);
          const prefix = url.searchParams.get('prefix') || env.OSS_GALLERY_PREFIX || 'image/';
          const images = await listGalleryImages(prefix, env);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.statusCode = 200;
          res.end(JSON.stringify(images));
        } catch (error) {
          console.error('OSS gallery list error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to list gallery' }));
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), imageProxyPlugin(), newApiProxyPlugin(), ossUploadPlugin(env), ossGalleryPlugin(env)],
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
