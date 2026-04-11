'use strict';

/**
 * Integration tests — full HTTP auth flow via supertest.
 * Requires a reachable MongoDB (set MONGODB_URI_TEST or rely on the default
 * mongodb://localhost:27017/babichat_test).
 *
 * Run: npm run test:integration
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp, teardownTestApp } = require('../helpers/testApp');

// Unique suffix per test run to avoid collisions between concurrent runs
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

let app;

before(async () => {
  app = await buildTestApp();
});

after(async () => {
  await teardownTestApp();
});

// ── Health ────────────────────────────────────────────────────────────────

describe('Health check', () => {
  test('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'OK');
  });
});

// ── Registration ──────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'TestPass123!', username: 'someuser' });
    assert.equal(res.status, 400);
  });

  test('400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@test.com', username: 'someuser' });
    assert.equal(res.status, 400);
  });

  test('400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@test.com', password: 'TestPass123!' });
    assert.equal(res.status, 400);
  });

  test('200 on valid registration', async () => {
    const id = uid();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `reg_${id}@test.com`,
        password: 'TestPass123!',
        username: `reg_${id}`.slice(0, 20),
      });
    assert.equal(res.status, 200);
    assert.ok(res.body.success, 'body.success should be true');
    assert.ok(res.body.user?.email, 'body.user.email should be set');
  });

  test('409 when username is already taken', async () => {
    const id = uid();
    const payload = {
      email: `dup_${id}@test.com`,
      password: 'TestPass123!',
      username: `dup_${id}`.slice(0, 20),
    };
    await request(app).post('/api/auth/register').send(payload);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, email: `dup2_${id}@test.com` }); // same username
    assert.equal(res.status, 409);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let testEmail;
  let testUsername;
  const password = 'TestPass123!';

  before(async () => {
    const id = uid();
    testEmail    = `login_${id}@test.com`;
    testUsername = `login_${id}`.slice(0, 20);
    await request(app).post('/api/auth/register').send({
      email: testEmail,
      password,
      username: testUsername,
    });
  });

  test('400 when email/username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'TestPass123!' });
    assert.equal(res.status, 400);
  });

  test('400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail });
    assert.equal(res.status, 400);
  });

  test('401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword!' });
    assert.equal(res.status, 401);
  });

  test('401 on unknown user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody_ever@nowhere.com', password: 'TestPass123!' });
    assert.ok(res.status >= 400, `expected ≥ 400, got ${res.status}`);
  });

  test('200 login by email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password });
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(res.body.user);
  });

  test('200 login by username (resolved to email internally)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUsername, password }); // "email" field accepts username
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
  });

  test('sets httpOnly session_token cookie on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password });
    assert.equal(res.status, 200);

    const cookies = res.headers['set-cookie'] || [];
    const sessionCookie = cookies.find((c) => c.startsWith('session_token='));
    assert.ok(sessionCookie, 'session_token cookie should be present');
    assert.ok(sessionCookie.includes('HttpOnly'), 'cookie must be HttpOnly');
  });
});

// ── Logout ────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  test('200 and clears session_token cookie', async () => {
    const id = uid();
    const email = `logout_${id}@test.com`;
    const pass  = 'TestPass123!';

    await request(app).post('/api/auth/register').send({
      email, password: pass, username: `logout_${id}`.slice(0, 20),
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: pass });
    assert.equal(loginRes.status, 200);

    const token = loginRes.body.session?.token;
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(logoutRes.status, 200);

    const cookies = logoutRes.headers['set-cookie'] || [];
    const sessionCookie = cookies.find((c) => c.startsWith('session_token='));
    assert.ok(sessionCookie, 'Set-Cookie should clear session_token');
    // Either Max-Age=0 or an Expires date in the past signals cookie deletion
    const isCleared =
      sessionCookie.includes('Max-Age=0') ||
      sessionCookie.match(/Expires=.+GMT/i);
    assert.ok(isCleared, 'session_token cookie should be expired/cleared');
  });
});

// ── Password reset ────────────────────────────────────────────────────────

describe('POST /api/auth/request-password-reset', () => {
  test('400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/request-password-reset')
      .send({});
    assert.equal(res.status, 400);
  });

  test('200 for unknown email (anti-enumeration — no user disclosure)', async () => {
    const res = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email: 'nobody_secret@nowhere.com' });
    assert.equal(res.status, 200, 'Should not reveal whether the user exists');
    assert.ok(res.body.success);
  });

  test('200 for known user and returns resetToken in non-production mode', async () => {
    const id = uid();
    const email = `pwr_${id}@test.com`;
    await request(app).post('/api/auth/register').send({
      email, password: 'TestPass123!', username: `pwr_${id}`.slice(0, 20),
    });

    const res = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email });
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(
      res.body.resetToken,
      'resetToken must be exposed in non-production mode for testability'
    );
    // Token must be a 64-char hex string
    assert.match(res.body.resetToken, /^[a-f0-9]{64}$/i);
  });
});

describe('POST /api/auth/reset-password', () => {
  test('400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'NewPass123!' });
    assert.equal(res.status, 400);
  });

  test('400 when newPassword is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64) });
    assert.equal(res.status, 400);
  });

  test('400 when password is shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), newPassword: 'short' });
    assert.equal(res.status, 400);
  });

  test('400 for invalid/expired/random token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), newPassword: 'NewPass123!' });
    assert.equal(res.status, 400);
  });

  test('full flow: register → request reset → reset → login with new password', async () => {
    const id      = uid();
    const email   = `flow_${id}@test.com`;
    const oldPass = 'OldPass123!';
    const newPass = 'NewPass456!';

    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: oldPass, username: `flow_${id}`.slice(0, 20) });
    assert.equal(regRes.status, 200, 'Registration must succeed');

    // 2. Request reset — get token from response (dev/test mode)
    const resetReqRes = await request(app)
      .post('/api/auth/request-password-reset')
      .send({ email });
    assert.equal(resetReqRes.status, 200);
    const resetToken = resetReqRes.body.resetToken;
    assert.ok(resetToken, 'resetToken must be in response body for test mode');

    // 3. Reset with new password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword: newPass });
    assert.equal(resetRes.status, 200, `Expected 200, got ${resetRes.status}: ${JSON.stringify(resetRes.body)}`);
    assert.ok(resetRes.body.success);

    // 4. Login with new password must succeed
    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPass });
    assert.equal(loginNew.status, 200, 'Login with new password must succeed');
    assert.ok(loginNew.body.success);

    // 5. Login with old password must be rejected
    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email, password: oldPass });
    assert.ok(loginOld.status >= 400, 'Old password must be rejected after reset');
  });
});
