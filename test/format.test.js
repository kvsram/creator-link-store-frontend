import test from 'node:test';
import assert from 'node:assert/strict';
import {money} from '../src/format.js';

test('formats integer paise as INR without treating paise as rupees', () => {
  const formatted = money(49900, 'INR').replace(/\u00a0/g, ' ');
  assert.match(formatted, /₹\s*499\.00/);
});

test('uses zero for missing or invalid subunits', () => {
  assert.match(money(undefined, 'INR').replace(/\u00a0/g, ' '), /₹\s*0\.00/);
  assert.match(money('not-a-number', 'INR').replace(/\u00a0/g, ' '), /₹\s*0\.00/);
});
