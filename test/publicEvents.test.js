import test from 'node:test';
import assert from 'node:assert/strict';
import {postPublicView, publicViewDecision, publicViewPayload} from '../src/publicEvents.js';

test('records at most one view for each successfully loaded normalized handle', () => {
  let recordedHandles = [];

  const first = publicViewDecision(recordedHandles, ' Alex ');
  assert.equal(first.shouldRecord, true);
  assert.deepEqual(first.recordedHandles, ['alex']);
  recordedHandles = first.recordedHandles;

  const duplicate = publicViewDecision(recordedHandles, 'ALEX');
  assert.equal(duplicate.shouldRecord, false);
  assert.deepEqual(duplicate.recordedHandles, ['alex']);

  const another = publicViewDecision(recordedHandles, 'maya');
  assert.equal(another.shouldRecord, true);
  assert.deepEqual(another.recordedHandles, ['alex', 'maya']);
});

test('builds the public handle view contract without accepting a creator id', () => {
  const payload = publicViewPayload(' Alex ', '/Alex', 'https://instagram.com/');
  assert.deepEqual(payload, {
    handle: 'alex',
    path: '/Alex',
    referrer: 'https://instagram.com/'
  });
  assert.equal('creatorId' in payload, false);
});

test('posts view tracking best-effort and suppresses raw tracking failures', async () => {
  const calls = [];
  const accepted = await postPublicView(async (...args) => calls.push(args), {handle: 'alex', path: '/alex', referrer: null});
  assert.equal(accepted, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/events/view');
  assert.deepEqual(JSON.parse(calls[0][1].body), {handle: 'alex', path: '/alex', referrer: null});

  const rawServerDetail = 'SQLSTATE internal_secret';
  const rejected = await postPublicView(async () => {throw new Error(rawServerDetail)}, {handle: 'alex', path: '/alex', referrer: null});
  assert.equal(rejected, false);
  assert.equal(String(rejected).includes(rawServerDetail), false);
});
