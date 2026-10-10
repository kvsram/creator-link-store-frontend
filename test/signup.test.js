import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authFailureMessage,
  isInsecureHttpLocation,
  loginNoticeFromSearch,
  signupRegistrationPayload,
  signupPlanFromSearch,
  validateSignupDetails
} from '../src/signup.js';

test('only an explicit pro query selects the premium signup journey', () => {
  assert.equal(signupPlanFromSearch('?plan=pro'), 'pro');
  assert.equal(signupPlanFromSearch('?plan=starter'), 'starter');
  assert.equal(signupPlanFromSearch('?plan=anything-else'), 'starter');
  assert.equal(signupPlanFromSearch(''), 'starter');
});

test('validates creator identity fields before calling availability or registration APIs', () => {
  const valid = {displayName: 'Alex Creates', email: 'alex@example.com', password: 'twelve-chars'};
  assert.equal(validateSignupDetails(valid), '');
  assert.match(validateSignupDetails({...valid, displayName: '  '}), /business name/);
  assert.match(validateSignupDetails({...valid, email: 'invalid'}), /valid email/);
  assert.match(validateSignupDetails({...valid, password: 'eleven-char'}), /12–128/);
  assert.equal(validateSignupDetails({...valid, password: '😀'.repeat(12)}), '');
  assert.match(validateSignupDetails({...valid, password: '😀'.repeat(11)}), /12–128/);
  assert.match(validateSignupDetails({...valid, password: 'a'.repeat(129)}), /12–128/);
  assert.match(validateSignupDetails({...valid, password: ' '.repeat(12)}), /12–128/);
  assert.deepEqual(signupRegistrationPayload(
    {...valid, displayName: '  Alex Creates  ', email: ' ALEX@EXAMPLE.COM ',
      handle: 'must_not_be_sent', phone: '+1'}), {
      displayName: 'Alex Creates', email: 'alex@example.com', password: 'twelve-chars'
    });
});

test('leaves store-link allocation to the Identity v1 backend', () => {
  const body = signupRegistrationPayload({
    displayName: 'K.V. Sriram', email: 'sriram@example.test', password: 'twelve-chars',
    handle: 'client_must_not_choose_this'
  });
  assert.equal('handle' in body, false);
});

test('explains a recoverable login destination for accounts created by older clients', () => {
  assert.match(loginNoticeFromSearch('?account=created'), /account was created/i);
  assert.match(loginNoticeFromSearch('?account=created'), /sign in/i);
  assert.match(loginNoticeFromSearch('?verified=1'), /verified/i);
  assert.match(loginNoticeFromSearch('?reset=1'), /password changed/i);
  assert.match(loginNoticeFromSearch('?signedOut=1'), /signed out/i);
  assert.equal(loginNoticeFromSearch('?account=other'), '');
});

test('auth failures use purpose-built public copy instead of server details', () => {
  assert.match(authFailureMessage('registration', 409), /could not complete signup/i);
  assert.doesNotMatch(authFailureMessage('registration', 409), /email may already|registered email/i);
  assert.match(authFailureMessage('login', 401), /sign-in failed/i);
  assert.match(authFailureMessage('login', 503), /service is unavailable/i);
  assert.match(authFailureMessage('login', 0, 'NETWORK_ERROR'), /service is unavailable/i);
  assert.match(authFailureMessage('login', 429), /too many attempts/i);
  assert.match(authFailureMessage('login', 403, 'EMAIL_NOT_VERIFIED'), /verify your email/i);
  assert.match(authFailureMessage('reset', 410), /expired/i);
});

test('shows the synthetic-credential warning only over plain HTTP', () => {
  assert.equal(isInsecureHttpLocation({protocol: 'http:'}), true);
  assert.equal(isInsecureHttpLocation({protocol: 'https:'}), false);
  assert.equal(isInsecureHttpLocation({protocol: ''}), false);
});
