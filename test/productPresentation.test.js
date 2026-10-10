import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkoutTrustLabel,
  productDetailPath,
  productImageValidation,
  publicProductHighlights,
  publicProductMedia
} from '../src/productPresentation.js';

test('builds stable public detail paths only for positive product identifiers', () => {
  assert.equal(productDetailPath('Alex', 42), '/alex/products/42');
  assert.equal(productDetailPath('creator_name', '9'), '/creator_name/products/9');
  assert.equal(productDetailPath('', 42), '');
  assert.equal(productDetailPath('alex', 0), '');
  assert.equal(productDetailPath('alex', 'invalid'), '');
});

test('normalizes cover and future gallery payloads without duplicating the cover', () => {
  assert.deepEqual(publicProductMedia({
    title: 'Creator course',
    thumbnail_url: 'https://cdn.example/cover.webp',
    gallery: [
      {id: 8, public_url: 'https://cdn.example/cover.webp'},
      {id: 9, public_url: 'https://cdn.example/result.webp', alt_text: 'Student result'}
    ]
  }).images, [
    {id: 'cover', url: 'https://cdn.example/cover.webp', altText: 'Creator course'},
    {id: 9, url: 'https://cdn.example/result.webp', altText: 'Student result'}
  ]);
});

test('deduplicates creator and product-type highlights', () => {
  assert.deepEqual(
    publicProductHighlights({highlights: ['Lifetime access', 'Private calls']}, ['Private calls', '12 lessons']),
    ['Lifetime access', 'Private calls', '12 lessons']
  );
});

test('validates public product photo type and size before previewing it', () => {
  assert.equal(productImageValidation({type: 'image/webp', size: 1024}), '');
  assert.match(productImageValidation({type: 'image/gif', size: 1024}), /JPG, PNG, or WebP/);
  assert.match(productImageValidation({type: 'image/jpeg', size: 9 * 1024 * 1024}), /8 MB/);
});

test('uses honest checkout trust copy for paid and free offers', () => {
  assert.match(checkoutTrustLabel({type: 'course', price_subunits: 49900}), /Review your order/);
  assert.match(checkoutTrustLabel({type: 'lead-magnet', price_subunits: 0}), /no payment required/);
});
