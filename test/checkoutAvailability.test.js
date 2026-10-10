import test from 'node:test';
import assert from 'node:assert/strict';
import {availableMeetingSlots} from '../src/checkoutAvailability.js';

test('keeps only future meeting slots that still have capacity', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  const result = availableMeetingSlots({slots: [
    {id: 1, startsAt: '2026-10-10T11:00:00Z', remaining: 3},
    {id: 2, starts_at: '2026-10-10T13:00:00Z', remaining: 0},
    {id: 3, startsAt: '2026-10-10T14:00:00Z', remaining: 2},
    {id: 4, startsAt: 'not-a-date', remaining: 2}
  ]}, now);

  assert.deepEqual(result.map(slot => slot.id), [3]);
});

test('returns no checkout slots when availability is absent', () => {
  assert.deepEqual(availableMeetingSlots({}, Date.now()), []);
  assert.deepEqual(availableMeetingSlots({meeting_slots: []}, Date.now()), []);
});
