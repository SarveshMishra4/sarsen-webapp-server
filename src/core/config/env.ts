/**
 * env.ts
 *
 * Loads and validates all environment variables at server startup.
 *
 * PURPOSE:
 * If any required variable is missing or malformed, the server refuses
 * to start and prints a clear message telling you exactly which variable
 * is missing. This prevents silent failures mid-runtime.
 *
 * USAGE:
 * Import this file FIRST in your app.ts or server.ts, before anything else.
 *   import './core/config/env';
 *
 * HOW TO DEBUG:
 * If server won't start and shows "Missing required env vars", open your
 * .env file and check that every variable listed in REQUIRED_VARS exists
 * and has a non-empty value.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (result.error) {
  console.error('[ENV] Failed to load .env file:', result.error.message);
  console.error('[ENV] Make sure a .env file exists in your project root.');
  process.exit(1);
}

// ─── Required Variables ──────────────────────────────────────────────────────
// Add any new required variable here. Server will not start if any are missing.

const REQUIRED_VARS: string[] = [
  'MONGODB_URI',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'PORT',
  'NODE_ENV',
];

// ─── Optional Variables (with documented defaults) ───────────────────────────
// These are not required but their defaults are logged on startup for clarity.

const OPTIONAL_VARS: Record<string, string> = {
  ADMIN_SEEDS: '[] (no admins will be seeded)',
  LOG_LEVEL: 'info',
};

// ─── Validation ──────────────────────────────────────────────────────────────

const missing: string[] = [];

for (const key of REQUIRED_VARS) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.error('\n[ENV] ❌ Server startup failed — missing required environment variables:\n');
  for (const key of missing) {
    console.error(`   → ${key}`);
  }
  console.error('\nAdd these variables to your .env file and restart.\n');
  process.exit(1);
}

// ─── Warn about optional vars using defaults ─────────────────────────────────

for (const [key, defaultNote] of Object.entries(OPTIONAL_VARS)) {
  if (!process.env[key] || process.env[key]!.trim() === '') {
    console.warn(`[ENV] ⚠️  ${key} not set — defaulting to: ${defaultNote}`);
  }
}

// ─── NODE_ENV Validation ─────────────────────────────────────────────────────

const validEnvs = ['development', 'production', 'test'];
if (!validEnvs.includes(process.env.NODE_ENV!)) {
  console.error(
    `[ENV] ❌ Invalid NODE_ENV: "${process.env.NODE_ENV}". Must be one of: ${validEnvs.join(', ')}`
  );
  process.exit(1);
}

// ─── JWT_SECRET Length Warning ───────────────────────────────────────────────

if (process.env.JWT_SECRET!.length < 32) {
  console.warn(
    '[ENV] ⚠️  JWT_SECRET is shorter than 32 characters. Use a longer random secret in production.'
  );
}

// ─── Startup Summary ─────────────────────────────────────────────────────────

console.log('[ENV] ✅ All required environment variables loaded successfully.');
console.log(`[ENV]    NODE_ENV  : ${process.env.NODE_ENV}`);
console.log(`[ENV]    PORT      : ${process.env.PORT}`);
console.log(`[ENV]    MONGODB   : ${process.env.MONGODB_URI!.split('@').pop() ?? 'set'}`); // Hides credentials
console.log(`[ENV]    RAZORPAY  : key ID ${process.env.RAZORPAY_KEY_ID}`);

// ─── Typed Exports ───────────────────────────────────────────────────────────
// Import these anywhere instead of using process.env directly.
// This gives you autocomplete and prevents typos.

export const env = {
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
  PORT: parseInt(process.env.PORT!, 10),
  MONGODB_URI: process.env.MONGODB_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET!,
  ADMIN_SEEDS: process.env.ADMIN_SEEDS ?? '[]',
  LOG_LEVEL: (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
};