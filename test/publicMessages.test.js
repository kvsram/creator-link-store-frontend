import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFailureMessage} from '../src/publicMessages.js';

test('public storefront failures never expose a raw server message', () => {
  const rawServerDetail = 'SQLSTATE private_table password=secret';
  for (const operation of ['load', 'checkout', 'leadCapture']) {
    const message = publicFailureMessage(operation, rawServerDetail);
    assert.equal(message.includes(rawServerDetail), false);
    assert.match(message, /try again|connection/i);
  }
});
