'use strict';

/**
 * Builds a minimal Express app connected to the test MongoDB.
 * Must be called before requiring any auth modules.
 *
 * Usage:
 *   const { buildTestApp, teardownTestApp } = require('./helpers/testApp');
 *   before(async () => { app = await buildTestApp(); });
 *   after(async () => { await teardownTestApp(); });
 */

// Capture the test URI before dotenv runs (database.js loads dotenv with override:true)
const TEST_MONGO_URI =
  process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/babichat_test';

// Required env vars for better-auth and CSRF — set before any module load
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || 'babichat-test-secret-min-32-characters!!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'babichat-test-jwt-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'babichat-test-csrf-secret';

let _app = null;
let _mongoose = null;

async function buildTestApp() {
  if (_app) return _app;

  // 1. Require database module — this triggers dotenv.config({ override: true }),
  //    which may overwrite env vars from a .env file.
  const connectDB = require('../../config/database');

  // 2. Override env vars that must differ in the test environment.
  //    These are set AFTER dotenv runs (step 1) so they take precedence.
  process.env.MONGODB_URI = TEST_MONGO_URI;

  // Disable email verification: if RESEND_API_KEY is set in .env, better-auth
  // will require email verification which blocks login tests.
  // In tests, we always want requireEmailVerification: false.
  delete process.env.RESEND_API_KEY;

  // 3. Connect to the test database. auth.js needs mongoose.connection.db to be
  //    live before betterAuth() is called (which happens at require() time).
  await connectDB();
  _mongoose = require('mongoose');

  // 4. Now it is safe to require routes that transitively load auth.js.
  const express = require('express');
  const cookieParser = require('cookie-parser');

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount only the auth router — no Socket.IO, no rate-limiting, no helmet
  const authRoutes = require('../../routes/authBetter');
  app.use('/api/auth', authRoutes);

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'OK', timestamp: new Date().toISOString() })
  );

  _app = app;
  return app;
}

async function teardownTestApp() {
  if (_mongoose?.connection?.db) {
    await _mongoose.connection.db.dropDatabase();
    await _mongoose.disconnect();
  }
  _app = null;
  _mongoose = null;
}

module.exports = { buildTestApp, teardownTestApp };
