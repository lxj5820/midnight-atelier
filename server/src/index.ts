import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import routes from './routes.js';
import { initializeAdminUser, initializeSubscriptionPlans, initializeSystemSettings, prisma } from './db.js';

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET environment variable is required');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        'https://midnightatelier.netlify.app',
        'https://midnight-atelier-production.up.railway.app',
        'http://localhost:3000',
        'http://localhost:8080',
      ];
      // 允许 Netlify preview 部署 (--midnightatelier.netlify.app 格式) 和 localhost
      if (!origin || allowed.includes(origin) || origin.endsWith('--midnightatelier.netlify.app') || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.json({
    message: 'Midnight Atelier API Server',
    version: '2.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vercel serverless mode - don't use app.listen
const isVercel = process.env.VERCEL === 'true';

if (!isVercel) {
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await initializeAdminUser();
    await initializeSubscriptionPlans();
    await initializeSystemSettings();
  });
}

// Initialize on startup (for both local and Vercel)
initializeAdminUser().catch(console.error);
initializeSubscriptionPlans().catch(console.error);
initializeSystemSettings().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
