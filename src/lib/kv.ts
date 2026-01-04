/**
 * KV Utility - Automatically uses Vercel KV in production or mock in development
 */

// Use mock KV for local development if KV_URL is not set
import { kv as kvMock } from './kv-mock';

// Use Vercel KV in production, mock in local development
let kv: typeof kvMock;
try {
  const vercelKv = require('@vercel/kv');
  kv = process.env.KV_URL ? vercelKv.kv : kvMock;
  if (!process.env.KV_URL) {
    console.log('📦 Using in-memory KV mock (local development)');
  }
} catch {
  kv = kvMock;
  console.log('📦 Using in-memory KV mock (local development)');
}

export { kv };
