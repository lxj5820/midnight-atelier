import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import app from './index.js';

// Ensure initialization only runs once
let initialized = false;

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!initialized) {
    initialized = true;
    initializeDatabase().catch(console.error);
  }

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
