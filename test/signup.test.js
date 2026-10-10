import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authFailureMessage,
  handleAvailabilityRequest,
  loginNoticeFromSearch,
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
  const valid = {handle: 'alex_creates', displayName: 'Alex Creates', email: 'alex@example.com', password: 'password123'};
  assert.equal(validateSignupDetails(valid), '');
  assert.match(validateSignupDetails({...valid, handle: 'a'}), /3–40/);
  assert.match(validateSignupDetails({...valid, displayName: '  '}), /business name/);
  assert.match(validateSignupDetails({...valid, email: 'invalid'}), /valid email/);
  assert.match(validateSignupDetails({...valid, password: 'short'}), /at least 8/);
});

test('checks only the public handle before registration', () => {
  const body = handleAvailabilityRequest({handle: 'alex_creates', email: 'alex@example.com'});
  assert.deepEqual(body, {username: 'alex_creates'});
  assert.equal('email' in body, false);
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
  assert.match(authFailureMessage('availability', 500), /store address/i);
  assert.match(authFailureMessage('registration', 409), /could not create/i);
  assert.match(authFailureMessage('login', 401), /sign-in failed/i);
  assert.match(authFailureMessage('login', 429), /too many attempts/i);
  assert.match(authFailureMessage('login', 403, 'EMAIL_NOT_VERIFIED'), /verify your email/i);
  assert.match(authFailureMessage('reset', 410), /expired/i);
});
