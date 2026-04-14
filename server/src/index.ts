import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes.js';
import { initializeAdminUser, initializeSubscriptionPlans } from './db.js';

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET environment variable is required');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS headers - must be before any other handlers to catch preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://midnightatelier.netlify.app',
    'https://midnight-atelier-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:8080',
  ];

  // Allow Netlify preview deployments and localhost
  const isAllowedOrigin = origin && (allowedOrigins.includes(origin) || origin.endsWith('.netlify.app') || origin.includes('localhost'));

  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(
  cors({
    origin: [
      'https://midnightatelier.netlify.app',
      'https://*.netlify.app',
      'https://midnight-atelier-production.up.railway.app',
      'http://localhost:3000',
      'http://localhost:8080',
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.json({
    message: 'Midnight Atelier API Server',
    version: '1.1',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initializeSubscriptionPlans();
  await initializeAdminUser();
});
