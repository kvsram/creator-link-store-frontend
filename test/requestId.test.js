import test from 'node:test';
import assert from 'node:assert/strict';
import {newIdempotencyKey, stableRequestIdentity} from '../src/requestId.js';

test('uses native randomUUID when the current browser exposes it', () => {
  const expected = 'b4287a3b-f948-4782-a7fc-0ae84a2f3647';
  assert.equal(newIdempotencyKey({randomUUID: () => expected}), expected);
});

test('creates an RFC 4122 version-4 key with getRandomValues on plain HTTP', () => {
  const cryptoApi = {
    getRandomValues(bytes) {
      bytes.fill(0xab);
      return bytes;
    }
  };
  assert.equal(newIdempotencyKey(cryptoApi), 'abababab-abab-4bab-abab-abababababab');
});

test('stable request identity reuses a key only for the same payload fingerprint', () => {
  let generated = 0;
  const createKey = () => `request-${++generated}`;
  const first = stableRequestIdentity(null, 'payload-a', createKey);
  const retry = stableRequestIdentity(first, 'payload-a', createKey);
  const changed = stableRequestIdentity(retry, 'payload-b', createKey);
  assert.equal(retry.key, first.key);
  assert.notEqual(changed.key, first.key);
  assert.equal(generated, 2);
});
