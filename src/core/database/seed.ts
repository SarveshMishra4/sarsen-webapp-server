/**
 * seed.ts
 *
 * Run once to create admin accounts.
 * Safe to re-run — skips existing emails.
 *
 * Usage:
 *   npx ts-node src/core/database/seed.ts
 *
 * Admin accounts are defined in .env as a JSON array:
 *   ADMIN_SEEDS='[{"email":"admin1@example.com","password":"StrongPass1!"},{"email":"admin2@example.com","password":"StrongPass2!"}]'
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { adminService } from '../../modules/admin/admin.service.js';

interface AdminSeed {
  email: string;
  password: string;
}

const run = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env');

  const seedsRaw = process.env.ADMIN_SEEDS;
  if (!seedsRaw) throw new Error('ADMIN_SEEDS is not defined in .env');

  let seeds: AdminSeed[];
  try {
    seeds = JSON.parse(seedsRaw);
  } catch {
    throw new Error('ADMIN_SEEDS must be a valid JSON array');
  }

  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error('ADMIN_SEEDS must contain at least one admin entry');
  }

  await mongoose.connect(mongoUri);
  console.log('[Seed] Connected to MongoDB');

  for (const seed of seeds) {
    if (!seed.email || !seed.password) {
      console.warn('[Seed] Skipping invalid entry (missing email or password)');
      continue;
    }
    await adminService.seedAdmin(seed.email, seed.password);
  }

  await mongoose.disconnect();
  console.log('[Seed] Done. MongoDB disconnected.');
};

run().catch((err) => {
  console.error('[Seed] Fatal error:', err.message);
  process.exit(1);
});
