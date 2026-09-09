import test from 'node:test';
import assert from 'node:assert/strict';
import {leadSubmissionIdentity} from '../src/leadSubmission.js';

test('reuses one idempotency key for retries of the same normalized lead payload', () => {
  let generated = 0;
  const createKey = () => `submission-key-${++generated}`;
  const first = leadSubmissionIdentity(null, {
    creatorId: 7,
    email: ' Visitor@Example.com ',
    name: ' Visitor ',
    phone: ' +91 98765 43210 ',
    consent: true
  }, createKey);
  const retry = leadSubmissionIdentity(first, {
    creatorId: 7,
    email: 'visitor@example.com',
    name: 'Visitor',
    phone: '+91 98765 43210',
    consent: true
  }, createKey);

  assert.equal(retry.key, first.key);
  assert.equal(generated, 1);
});

test('creates a new idempotency key when submitted lead data changes', () => {
  let generated = 0;
  const createKey = () => `submission-key-${++generated}`;
  const first = leadSubmissionIdentity(null, {
    creatorId: 7,
    email: 'first@example.com',
    name: '',
    phone: null,
    consent: false
  }, createKey);
  const changed = leadSubmissionIdentity(first, {
    creatorId: 7,
    email: 'second@example.com',
    name: '',
    phone: null,
    consent: false
  }, createKey);

  assert.notEqual(changed.key, first.key);
  assert.equal(generated, 2);
});
