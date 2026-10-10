import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authFailureMessage,
  generatedStoreHandle,
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
    {...valid, handle: 'must_not_be_sent', phone: '+1'}, '01234567-89ab-cdef'), {
      handle: 'alex_creates_0123456789ab',
      displayName: 'Alex Creates', email: 'alex@example.com', password: 'twelve-chars'
    });
});

test('creates an invisible safe compatibility link without using email data', () => {
  assert.equal(generatedStoreHandle('K.V. Sriram 89-8', '01234567-89ab-cdef'),
    'k_v_sriram_89_8_0123456789ab');
  assert.equal(generatedStoreHandle('José Creates', '01234567-89ab-cdef'),
    'jose_creates_0123456789ab');
  assert.equal(generatedStoreHandle('సృష్టికర్త 🎨', '01234567-89ab-cdef'),
    'creator_0123456789ab');
  assert.match(generatedStoreHandle('A very long creator name '.repeat(4),
    '01234567-89ab-cdef'), /^[a-z0-9_]{3,40}$/);
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
  assert.match(authFailureMessage('registration', 409), /could not create/i);
  assert.doesNotMatch(authFailureMessage('registration', 409), /store address/i);
  assert.match(authFailureMessage('login', 401), /sign-in failed/i);
  assert.match(authFailureMessage('login', 429), /too many attempts/i);
  assert.match(authFailureMessage('login', 403, 'EMAIL_NOT_VERIFIED'), /verify your email/i);
  assert.match(authFailureMessage('reset', 410), /expired/i);
});
