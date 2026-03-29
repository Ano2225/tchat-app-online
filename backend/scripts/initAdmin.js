#!/usr/bin/env node
/**
 * initAdmin.js
 * ------------
 * Creates the admin user in MongoDB compatible with better-auth.
 *
 * better-auth's mongodbAdapter stores IDs as:
 *   - 24-char hex → ObjectId (converted automatically)
 *   - 32-char hex → plain string (new ObjectId() fails, kept as-is)
 * We use 32-char hex so IDs stay as strings and queries match correctly.
 *
 * Usage:
 *   node backend/scripts/initAdmin.js
 *   npm run init-admin
 *
 * Safe to re-run — skips creation if admin already exists.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), override: true });

const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Hash password using better-auth's scrypt format: "<salt_hex>:<key_hex>"
 * Matches exactly: node_modules/better-auth/dist/crypto/password.mjs
 */
async function hashPassword(password) {
  const { scryptAsync } = await import('@noble/hashes/scrypt.js');
  const { hex } = await import('@better-auth/utils/hex');
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
  const key  = await scryptAsync(password.normalize('NFKC'), salt, { N: 16384, r: 16, p: 1, dkLen: 64, maxmem: 128 * 16384 * 16 * 2 });
  const keyHex = Buffer.from(key).toString('hex');
  return `${salt}:${keyHex}`;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const MONGODB_URI    = process.env.MONGODB_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@babichat.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not defined in .env');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error('❌  ADMIN_PASSWORD is not defined in .env');
  process.exit(1);
}

/**
 * Generate a 32-char hex ID — NOT a valid MongoDB ObjectId format (24 chars).
 * better-auth's mongodbAdapter stores this as a plain string, ensuring
 * that userId lookups are string-to-string comparisons (no ObjectId coercion).
 */
const generateId = () => crypto.randomBytes(16).toString('hex'); // 32 chars

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅  MongoDB connected');

  const db         = mongoose.connection.db;
  const userCol    = db.collection('user');
  const accountCol = db.collection('account');

  // ── Check existing ──────────────────────────────────────────────────────────
  const existing = await userCol.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    // Ensure role is admin even if the user was created another way
    const existingId = existing._id?.toString?.() ?? existing._id;
    if (existing.role !== 'admin') {
      await userCol.updateOne({ _id: existing._id }, { $set: { role: 'admin' } });
      console.log('✅  Role updated to admin.');
    } else {
      console.log(`ℹ️   Admin already exists (email: ${ADMIN_EMAIL}) — nothing to do.`);
    }

    // Verify a credential account exists for this user
    const acc = await accountCol.findOne({ userId: existingId, providerId: 'credential' });
    if (!acc) {
      console.log('⚠️   No credential account found — creating one…');
      const hash = await hashPassword(ADMIN_PASSWORD);
      const now  = new Date();
      await accountCol.insertOne({
        _id:                    generateId(),
        accountId:              existingId,
        providerId:             'credential',
        userId:                 existingId,
        password:               hash,
        accessToken:            null,
        refreshToken:           null,
        idToken:                null,
        accessTokenExpiresAt:   null,
        refreshTokenExpiresAt:  null,
        scope:                  null,
        createdAt:              now,
        updatedAt:              now,
      });
      console.log('✅  Credential account created.');
    }

    await mongoose.disconnect();
    return;
  }

  // ── Hash password (better-auth scrypt format: salt:key) ────────────────────
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const now    = new Date();
  const userId = generateId(); // 32-char hex string

  // ── Insert user — _id stored as plain string (not ObjectId) ────────────────
  await userCol.insertOne({
    _id:           userId,        // 32-char hex → stored as string by MongoDB
    email:         ADMIN_EMAIL,
    emailVerified: true,
    username:      ADMIN_USERNAME,
    name:          ADMIN_USERNAME,
    role:          'admin',
    isAnonymous:   false,
    isOnline:      false,
    isBlocked:     false,
    blockedUsers:  [],
    createdAt:     now,
    updatedAt:     now,
  });

  // ── Insert credential account ───────────────────────────────────────────────
  // accountId = userId (better-auth convention for credential provider)
  await accountCol.insertOne({
    _id:                    generateId(),
    accountId:              userId,       // same as userId for credential auth
    providerId:             'credential',
    userId:                 userId,       // matches user._id (string)
    password:               passwordHash,
    accessToken:            null,
    refreshToken:           null,
    idToken:                null,
    accessTokenExpiresAt:   null,
    refreshTokenExpiresAt:  null,
    scope:                  null,
    createdAt:              now,
    updatedAt:              now,
  });

  console.log('✅  Admin user created successfully!');
  console.log(`    Username : ${ADMIN_USERNAME}`);
  console.log(`    Email    : ${ADMIN_EMAIL}`);
  console.log(`    Role     : admin`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
