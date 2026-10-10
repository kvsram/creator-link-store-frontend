import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumePostVerificationDestination,
  maskedEmail,
  locationWithoutAuthTokens,
  needsEmailVerification,
  normalizeSessions,
  pendingVerificationDetails,
  recoveryEmailPayload,
  rememberPostVerificationIntent,
  requireActiveAuthAccount,
  requirePendingRegistration,
  resendCooldownSeconds,
  resetPasswordPayload,
  scrubAuthTokenFromHistory,
  tokenFromSearch,
  validateNewPassword,
  validateRecoveryEmail,
  verificationEmailPrefill,
  verificationRequired
} from '../src/identityAuth.js';

test('recognizes flat v1 pending-verification registration responses', () => {
  assert.equal(verificationRequired({status: 'pending_verification', verificationRequired: true}), true);
  assert.equal(verificationRequired({status: 'active', verificationRequired: false}), false);
  assert.equal(verificationRequired({displayName: 'Legacy account'}), false);
});

test('keeps verification details useful without exposing an email token', () => {
  assert.equal(maskedEmail('alex@example.com'), 'al***@example.com');
  assert.deepEqual(pendingVerificationDetails({expiresAt: '2030-01-01T00:00:00Z'}, 'alex@example.com'), {
    emailHint: 'al***@example.com', email: 'alex@example.com', expiresAt: '2030-01-01T00:00:00Z'
  });
  assert.equal(verificationEmailPrefill(' ALEX@EXAMPLE.COM '), 'alex@example.com');
  assert.equal(verificationEmailPrefill('alex_handle'), '');
  assert.equal(resendCooldownSeconds({retryAfterSeconds: 45}), 45);
  assert.equal(resendCooldownSeconds({retry_after_seconds: 900}), 300);
  assert.equal(tokenFromSearch('?token=one-time-value'), 'one-time-value');
  assert.equal(tokenFromSearch('?verification_token=compatibility-value'), 'compatibility-value');
  assert.equal(tokenFromSearch('?token=legacy-query', '#token=fragment-value'), 'fragment-value');
  assert.equal(tokenFromSearch('', '#?reset_token=fragment-reset'), 'fragment-reset');
  assert.equal(tokenFromSearch('?unrelated=value'), '');
});

test('validates recovery and reset payloads before API calls', () => {
  assert.equal(validateRecoveryEmail('alex@example.com'), '');
  assert.match(validateRecoveryEmail('not-an-email'), /valid email/i);
  assert.deepEqual(recoveryEmailPayload(' ALEX@EXAMPLE.COM '), {email: 'alex@example.com'});
  assert.match(validateNewPassword('eleven-char', 'eleven-char'), /12–128/i);
  assert.match(validateNewPassword('😀'.repeat(11), '😀'.repeat(11)), /12–128/i);
  assert.equal(validateNewPassword('😀'.repeat(12), '😀'.repeat(12)), '');
  assert.match(validateNewPassword('a'.repeat(129), 'a'.repeat(129)), /12–128/i);
  assert.match(validateNewPassword(' '.repeat(12), ' '.repeat(12)), /12–128/i);
  assert.match(validateNewPassword('a-long-password-value', 'different-value-here'), /do not match/i);
  assert.equal(validateNewPassword('a-long-password-value', 'a-long-password-value'), '');
  assert.deepEqual(resetPasswordPayload(' token ', 'a-long-password-value'), {token: 'token', newPassword: 'a-long-password-value'});
});

test('removes auth tokens from browser history while preserving safe URL state', () => {
  const location = {
    pathname: '/verify-email', search: '?token=legacy-secret&campaign=welcome',
    hash: '#token=fragment-secret&status=working'
  };
  assert.equal(locationWithoutAuthTokens(location), '/verify-email?campaign=welcome#status=working');
  const calls = [];
  const history = {state: {route: true}, replaceState: (...args) => calls.push(args)};
  assert.equal(scrubAuthTokenFromHistory(location, history), true);
  assert.deepEqual(calls, [[{route: true}, '', '/verify-email?campaign=welcome#status=working']]);
  assert.equal(scrubAuthTokenFromHistory({pathname: '/verify-email', search: '', hash: '#status'}, history), false);
  assert.equal(calls.length, 1);
});

test('keeps a short-lived non-entitling Pro navigation intent only on the same browser', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  assert.equal(rememberPostVerificationIntent(storage, 'pro', 1_000), true);
  assert.equal(consumePostVerificationDestination(storage, 2_000),
    '/dashboard/settings?tab=billing&plan=pro');
  assert.equal(consumePostVerificationDestination(storage, 2_000), '/dashboard/');
  rememberPostVerificationIntent(storage, 'pro', 1_000);
  assert.equal(consumePostVerificationDestination(storage, 3_700_001), '/dashboard/');
  rememberPostVerificationIntent(storage, 'pro', 1_000);
  assert.equal(rememberPostVerificationIntent(storage, 'starter', 1_000), false);
  assert.equal(consumePostVerificationDestination(storage, 2_000), '/dashboard/');
});

test('requires the complete Identity v1 response before changing authentication state', () => {
  const active = {id: 7, publicId: 'account-public-id', handle: 'alex_creates',
    displayName: 'Alex Creates', status: 'active', emailVerified: true};
  const pending = {...active, status: 'pending_verification', emailVerified: false,
    verificationRequired: true};
  assert.equal(requireActiveAuthAccount(active), active);
  assert.equal(requirePendingRegistration(pending), pending);
  assert.throws(() => requireActiveAuthAccount('<html>fallback</html>'),
    failure => failure.code === 'INVALID_AUTH_RESPONSE');
  assert.throws(() => requireActiveAuthAccount({...active, emailVerified: false}),
    failure => failure.code === 'INVALID_AUTH_RESPONSE');
  assert.throws(() => requirePendingRegistration({...pending, verificationRequired: false}),
    failure => failure.code === 'INVALID_AUTH_RESPONSE');
});

test('recognizes unverified login failures and normalizes public session ids', () => {
  assert.equal(needsEmailVerification({status: 403, code: 'EMAIL_NOT_VERIFIED'}), true);
  assert.equal(needsEmailVerification({status: 401, code: 'EMAIL_NOT_VERIFIED'}), false);
  assert.deepEqual(normalizeSessions({sessions: [{
    publicId: 'ses_public', isCurrent: true, deviceLabel: 'Safari on macOS',
    lastSeenAt: '2030-01-01T00:00:00Z', idleExpiresAt: '2030-01-02T00:00:00Z',
    expiresAt: '2030-02-01T00:00:00Z', authMethod: 'email_verification'
  }]}), [{
    id: 'ses_public', current: true, createdAt: null,
    lastSeenAt: '2030-01-01T00:00:00Z', idleExpiresAt: '2030-01-02T00:00:00Z',
    expiresAt: '2030-02-01T00:00:00Z', authMethod: 'email_verification',
    device: 'Safari on macOS', location: ''
  }]);
});
