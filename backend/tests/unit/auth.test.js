'use strict';

/**
 * Unit tests — pure functions from the auth layer.
 * No database, no network, no env vars required.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Functions under test (copied verbatim from authBetter.js) ─────────────
// They are private (not exported), so we duplicate them here.
// If they ever diverge from the source, tests will catch it via integration tests.

const extractResetToken = (value) => {
  if (!value) return '';
  const normalized = decodeURIComponent(String(value)).trim();
  const match = normalized.match(/[a-f0-9]{64}/i);
  return match ? match[0].toLowerCase() : '';
};

const isValidUsername = (value) => /^[a-zA-Z0-9_]{3,20}$/.test(value);

const normalizeBaseUrl = (value) => {
  if (!value) return '';
  return String(value).split(',')[0].trim().replace(/\/+$/, '');
};

const isLocalHost = (value) =>
  /(^|\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(value || '').trim());

const buildSessionFromResult = (result) => {
  if (!result) return null;
  const token = result.session?.token || result.token || null;
  if (!token) return result.session || null;
  return { ...(result.session || {}), token };
};

// ── extractResetToken ─────────────────────────────────────────────────────

describe('extractResetToken', () => {
  test('accepts plain 64-char hex token', () => {
    const token = 'a'.repeat(64);
    assert.equal(extractResetToken(token), token);
  });

  test('accepts 64-char hex embedded in a URL', () => {
    const token = '1234567890abcdef'.repeat(4); // 64 chars
    assert.equal(
      extractResetToken(`http://example.com/reset?token=${token}&foo=bar`),
      token
    );
  });

  test('URI-decodes the value before matching', () => {
    const token = 'b'.repeat(64);
    assert.equal(extractResetToken(encodeURIComponent(token)), token);
  });

  test('lowercases the result', () => {
    const upper = 'ABCDEF1234567890'.repeat(4);
    assert.equal(extractResetToken(upper), upper.toLowerCase());
  });

  test('returns empty string for a 63-char hex (too short)', () => {
    assert.equal(extractResetToken('a'.repeat(63)), '');
  });

  test('returns empty string for non-hex content', () => {
    assert.equal(extractResetToken('not-a-token'), '');
    assert.equal(extractResetToken('zzzz'), '');
  });

  test('returns empty string for null / undefined / empty', () => {
    assert.equal(extractResetToken(null), '');
    assert.equal(extractResetToken(undefined), '');
    assert.equal(extractResetToken(''), '');
  });
});

// ── isValidUsername ───────────────────────────────────────────────────────

describe('isValidUsername', () => {
  test('accepts alphanumeric username', () => assert.ok(isValidUsername('user123')));
  test('accepts username with underscore', () => assert.ok(isValidUsername('my_user')));
  test('accepts minimum length (3)', () => assert.ok(isValidUsername('abc')));
  test('accepts maximum length (20)', () => assert.ok(isValidUsername('a'.repeat(20))));

  test('rejects 2 chars (too short)', () => assert.ok(!isValidUsername('ab')));
  test('rejects 21 chars (too long)', () => assert.ok(!isValidUsername('a'.repeat(21))));
  test('rejects spaces', () => assert.ok(!isValidUsername('my user')));
  test('rejects hyphen', () => assert.ok(!isValidUsername('my-user')));
  test('rejects @ symbol', () => assert.ok(!isValidUsername('user@name')));
  test('rejects accented chars', () => assert.ok(!isValidUsername('utilisatéur')));
  test('rejects empty string', () => assert.ok(!isValidUsername('')));
});

// ── normalizeBaseUrl ──────────────────────────────────────────────────────

describe('normalizeBaseUrl', () => {
  test('strips trailing slash', () => {
    assert.equal(normalizeBaseUrl('https://example.com/'), 'https://example.com');
  });

  test('takes first entry from comma-separated list', () => {
    assert.equal(
      normalizeBaseUrl('http://first.com, http://second.com'),
      'http://first.com'
    );
  });

  test('trims surrounding whitespace', () => {
    assert.equal(normalizeBaseUrl('  http://example.com  '), 'http://example.com');
  });

  test('returns empty string for falsy input', () => {
    assert.equal(normalizeBaseUrl(null), '');
    assert.equal(normalizeBaseUrl(undefined), '');
    assert.equal(normalizeBaseUrl(''), '');
  });
});

// ── isLocalHost ───────────────────────────────────────────────────────────

describe('isLocalHost', () => {
  test('detects http://localhost', () => assert.ok(isLocalHost('http://localhost')));
  test('detects http://localhost:3000', () =>
    assert.ok(isLocalHost('http://localhost:3000')));
  test('detects 127.0.0.1', () => assert.ok(isLocalHost('http://127.0.0.1:8000')));

  test('rejects production domain', () =>
    assert.ok(!isLocalHost('https://babichat.tech')));
  test('rejects any external domain', () =>
    assert.ok(!isLocalHost('https://example.com')));

  test('returns false for empty / null', () => {
    assert.ok(!isLocalHost(''));
    assert.ok(!isLocalHost(null));
  });
});

// ── buildSessionFromResult ────────────────────────────────────────────────

describe('buildSessionFromResult', () => {
  test('returns null for null / undefined', () => {
    assert.equal(buildSessionFromResult(null), null);
    assert.equal(buildSessionFromResult(undefined), null);
  });

  test('embeds result.token into the returned session object', () => {
    const session = buildSessionFromResult({
      token: 'tok123',
      session: { id: 's1', userId: 'u1' },
    });
    assert.equal(session.token, 'tok123');
    assert.equal(session.id, 's1');
  });

  test('prefers session.token over top-level token', () => {
    const session = buildSessionFromResult({
      token: 'old-token',
      session: { token: 'new-token', id: 's1' },
    });
    assert.equal(session.token, 'new-token');
  });

  test('returns session as-is when no token present', () => {
    const session = buildSessionFromResult({ session: { id: 's1' } });
    assert.equal(session.id, 's1');
    assert.equal(session.token, undefined);
  });
});
