import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import app from './index.js';

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize database on first request
  initializeDatabase().catch(console.error);

  return app(req, res);
}

async function initializeDatabase() {
  try {
    const { initializeAdminUser, initializeSubscriptionPlans, initializeSystemSettings } = await import('./db.js');
    await initializeAdminUser();
    await initializeSubscriptionPlans();
    await initializeSystemSettings();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}
