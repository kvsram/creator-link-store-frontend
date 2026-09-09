import test from 'node:test';
import assert from 'node:assert/strict';
import {
  profileForm,
  profileSaveFailure,
  profileSavePayload,
  savedProfile,
  validateProfileForm
} from '../src/profileSettings.js';

test('normalizes the existing settings response and account fallback', () => {
  assert.deepEqual(profileForm(
    {display_name: 'Alex Creates', username: 'Alex_Creates', bio: 'Practical creator systems', phone: '+91 98765 43210'},
    {displayName: 'Fallback', handle: 'fallback'}
  ), {
    displayName: 'Alex Creates',
    handle: 'alex_creates',
    bio: 'Practical creator systems',
    phone: '+91 98765 43210'
  });
  assert.equal(profileForm({}, {displayName: 'Fallback', handle: 'fallback'}).displayName, 'Fallback');
});

test('validates profile identity and bio before saving', () => {
  const valid = {displayName: 'Alex Creates', handle: 'alex_creates', bio: 'A short bio'};
  assert.equal(validateProfileForm(valid), '');
  assert.match(validateProfileForm({...valid, displayName: ' '}), /creator or business name/i);
  assert.match(validateProfileForm({...valid, handle: 'bad-address'}), /3–40/);
  assert.match(validateProfileForm({...valid, bio: 'x'.repeat(281)}), /280/);
  assert.match(validateProfileForm({...valid, phone: 'call me'}), /phone number/i);
});

test('builds a trimmed lowercase profile update payload', () => {
  assert.deepEqual(profileSavePayload({
    displayName: '  Alex Creates  ',
    handle: '  Alex_Creates ',
    bio: '  Useful templates  ',
    phone: '  +91 98765 43210  '
  }), {
    displayName: 'Alex Creates',
    handle: 'alex_creates',
    bio: 'Useful templates',
    phone: '+91 98765 43210'
  });
});

test('accepts direct or nested saved-profile responses', () => {
  assert.equal(savedProfile({handle: 'new_handle', displayName: 'New Name', bio: ''}).handle, 'new_handle');
  assert.equal(savedProfile({profile: {username: 'nested', display_name: 'Nested'}}).displayName, 'Nested');
});

test('maps conflict and throttling failures to actionable copy', () => {
  assert.match(profileSaveFailure(409), /already in use/i);
  assert.match(profileSaveFailure(429), /wait/i);
  assert.equal(profileSaveFailure(400, 'That address is reserved.'), 'That address is reserved.');
  assert.match(profileSaveFailure(500), /not changed/i);
});
