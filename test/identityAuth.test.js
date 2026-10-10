import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maskedEmail,
  locationWithoutAuthTokens,
  needsEmailVerification,
  normalizeSessions,
  pendingVerificationDetails,
  recoveryEmailPayload,
  requestV1WithFallback,
  resetPasswordPayload,
  scrubAuthTokenFromHistory,
  tokenFromSearch,
  validateNewPassword,
  validateRecoveryEmail,
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
    emailHint: 'al***@example.com', identifier: 'alex@example.com', expiresAt: '2030-01-01T00:00:00Z'
  });
  assert.equal(tokenFromSearch('?token=one-time-value'), 'one-time-value');
  assert.equal(tokenFromSearch('?verification_token=compatibility-value'), 'compatibility-value');
  assert.equal(tokenFromSearch('?unrelated=value'), '');
});

test('validates recovery and reset payloads before API calls', () => {
  assert.equal(validateRecoveryEmail('alex@example.com'), '');
  assert.match(validateRecoveryEmail('not-an-email'), /valid email/i);
  assert.deepEqual(recoveryEmailPayload(' ALEX@EXAMPLE.COM '), {email: 'alex@example.com'});
  assert.match(validateNewPassword('fourteen-chars', 'fourteen-chars'), /at least 15/i);
  assert.match(validateNewPassword('a-long-password-value', 'different-value-here'), /do not match/i);
  assert.equal(validateNewPassword('a-long-password-value', 'a-long-password-value'), '');
  assert.deepEqual(resetPasswordPayload(' token ', 'a-long-password-value'), {token: 'token', newPassword: 'a-long-password-value'});
});

test('removes auth tokens from browser history while preserving safe URL state', () => {
  const location = {pathname: '/verify-email', search: '?token=secret&campaign=welcome', hash: '#status'};
  assert.equal(locationWithoutAuthTokens(location), '/verify-email?campaign=welcome#status');
  const calls = [];
  const history = {state: {route: true}, replaceState: (...args) => calls.push(args)};
  assert.equal(scrubAuthTokenFromHistory(location, history), true);
  assert.deepEqual(calls, [[{route: true}, '', '/verify-email?campaign=welcome#status']]);
  assert.equal(scrubAuthTokenFromHistory({pathname: '/verify-email', search: ''}, history), false);
  assert.equal(calls.length, 1);
});

test('uses the v1 endpoint and falls back only when the endpoint is unavailable', async () => {
  const paths = [];
  const request = async path => {
    paths.push(path);
    if (path.startsWith('/api/v1/')) throw Object.assign(new Error('missing'), {status: 404});
    return {legacy: true};
  };
  assert.deepEqual(await requestV1WithFallback(request, '/api/v1/auth/sessions', '/api/auth/login', {}), {legacy: true});
  assert.deepEqual(paths, ['/api/v1/auth/sessions', '/api/auth/login']);

  await assert.rejects(
    requestV1WithFallback(async () => {throw Object.assign(new Error('bad credentials'), {status: 401})}, '/v1', '/legacy', {}),
    /bad credentials/
  );
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
