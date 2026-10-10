import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../src/routes.js';

test('keeps product, signup, login, storefront, and dashboard routes separate', () => {
  assert.deepEqual(resolveRoute('/'), {kind: 'marketing'});
  assert.deepEqual(resolveRoute('/create-store'), {kind: 'marketing'});
  assert.deepEqual(resolveRoute('/features'), {kind: 'marketing'});
  assert.deepEqual(resolveRoute('/pricing'), {kind: 'marketing'});
  assert.deepEqual(resolveRoute('/signup'), {kind: 'signup'});
  assert.deepEqual(resolveRoute('/register/'), {kind: 'signup'});
  assert.deepEqual(resolveRoute('/login'), {kind: 'login'});
  assert.deepEqual(resolveRoute('/verify-email?token=secret'), {kind: 'verify-email'});
  assert.deepEqual(resolveRoute('/forgot-password'), {kind: 'forgot-password'});
  assert.deepEqual(resolveRoute('/reset-password?token=secret'), {kind: 'reset-password'});
  assert.deepEqual(resolveRoute('/dashboard'), {kind: 'dashboard', section: 'home'});
  assert.deepEqual(resolveRoute('/dashboard/analytics'), {kind: 'dashboard', section: 'analytics'});
  assert.deepEqual(resolveRoute('/alex'), {kind: 'store', handle: 'alex'});
});

test('does not reinterpret nested or missing routes as creator handles', () => {
  assert.deepEqual(resolveRoute('/alex/products'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute('/bad%2'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute(''), {kind: 'marketing'});
});
