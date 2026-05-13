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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), imageProxyPlugin()],
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
