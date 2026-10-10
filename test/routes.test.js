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
  assert.deepEqual(resolveRoute('/dashboard'), {kind: 'dashboard', section: 'home'});
  assert.deepEqual(resolveRoute('/dashboard/analytics'), {kind: 'dashboard', section: 'analytics'});
  assert.deepEqual(resolveRoute('/alex'), {kind: 'store', handle: 'alex'});
  assert.deepEqual(resolveRoute('/Alex/products/42'), {kind: 'product-detail', handle: 'alex', productId: 42});
  assert.deepEqual(resolveRoute('/alex/products/42/'), {kind: 'product-detail', handle: 'alex', productId: 42});
});

test('does not reinterpret nested or missing routes as creator handles', () => {
  assert.deepEqual(resolveRoute('/alex/products'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute('/alex/products/not-a-number'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute('/alex/products/0'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute('/alex/products/2/more'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute('/bad%2'), {kind: 'not-found'});
  assert.deepEqual(resolveRoute(''), {kind: 'marketing'});
});
