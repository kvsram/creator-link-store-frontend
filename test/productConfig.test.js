import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_TYPES,
  defaultProductConfiguration,
  normalizeProductConfiguration,
  productVisual,
  publicConfigurationSummary,
  toDateTimeLocal,
  toIsoDateTime,
  validateProductConfiguration
} from '../src/productConfig.js';

test('defines every supported product and promotion type with fresh defaults', () => {
  assert.deepEqual(PRODUCT_TYPES, [
    'lead-magnet', 'digital-download', 'meeting', 'fulfillment', 'course',
    'membership', 'webinar', 'community', 'url-media'
  ]);
  for (const type of PRODUCT_TYPES) {
    assert.equal(productVisual(type).length, 3);
    assert.equal(defaultProductConfiguration(type, 'Asia/Kolkata').schemaVersion, 1);
  }
  const first = defaultProductConfiguration('course');
  first.modules[0].title = 'Changed';
  assert.equal(defaultProductConfiguration('course').modules[0].title, 'Module 1');
});

test('normalizes legacy and snake-case authoring data without dropping identifiers', () => {
  const membership = normalizeProductConfiguration('membership', {
    billingInterval: 'annual',
    memberBenefits: 'Private calls\nTemplates',
    plans: [{id: 7, name: 'Pro', amount_subunits: 49900, interval_name: 'monthly', interval_count: 2}]
  });
  assert.deepEqual(membership.benefits, ['Private calls', 'Templates']);
  assert.deepEqual(membership.plans[0], {
    id: 7, name: 'Pro', amountSubunits: 49900, interval: 'monthly', intervalCount: 2
  });

  const meeting = normalizeProductConfiguration('meeting', {
    timezone: 'Asia/Kolkata', slots: [{id: 9, starts_at: '2026-10-01T10:00:00Z', ends_at: '2026-10-01T11:00:00Z'}]
  });
  assert.equal(meeting.slots[0].id, 9);
  assert.equal(meeting.slots[0].startsAt, '2026-10-01T10:00:00Z');
});

test('requires a staged or existing download before publishing an upload product', () => {
  const configuration = defaultProductConfiguration('digital-download');
  const blocked = validateProductConfiguration('digital-download', configuration, {status: 'published'});
  assert.equal(blocked.valid, false);
  assert.match(blocked.errors.join(' '), /Upload the delivery file/);

  const ready = validateProductConfiguration('digital-download', configuration, {
    status: 'published', pendingFileKinds: ['download']
  });
  assert.equal(ready.valid, true);
});

test('allows incomplete type-specific drafts while retaining publish gates', () => {
  const membership = defaultProductConfiguration('membership');
  const community = defaultProductConfiguration('community');
  const webinar = {...defaultProductConfiguration('webinar'), sessions: [{startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', capacity: 10, joinUrl: ''}]};

  assert.equal(validateProductConfiguration('membership', membership, {status: 'draft'}).valid, true);
  assert.equal(validateProductConfiguration('community', community, {status: 'draft'}).valid, true);
  assert.equal(validateProductConfiguration('webinar', webinar, {status: 'draft'}).valid, true);
  assert.equal(validateProductConfiguration('membership', membership, {status: 'published'}).valid, false);
  assert.equal(validateProductConfiguration('community', community, {status: 'published'}).valid, false);
  assert.equal(validateProductConfiguration('webinar', webinar, {status: 'published'}).valid, false);
});

test('validates complete publish configuration for every sellable type', () => {
  const cases = {
    'lead-magnet': [{...defaultProductConfiguration('lead-magnet'), deliveryMode: 'redirect', redirectUrl: 'https://example.test/free'}, {}],
    'digital-download': [defaultProductConfiguration('digital-download'), {existingFileKinds: ['download']}],
    meeting: [{...defaultProductConfiguration('meeting', 'Asia/Kolkata'), slots: [{startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z'}]}, {}],
    fulfillment: [{...defaultProductConfiguration('fulfillment'), checkoutFields: [{label: 'Your brief', fieldType: 'textarea', required: true}]}, {}],
    course: [defaultProductConfiguration('course'), {}],
    membership: [{...defaultProductConfiguration('membership'), benefits: ['Weekly workshop'], plans: [{name: 'Monthly', amountSubunits: 49900, interval: 'monthly', intervalCount: 1}]}, {}],
    webinar: [{...defaultProductConfiguration('webinar', 'Asia/Kolkata'), sessions: [{startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', capacity: 100, joinUrl: 'https://meet.example.test/private'}]}, {}],
    community: [{...defaultProductConfiguration('community'), accessUrl: 'https://discord.example.test/invite', benefits: ['Private channel']}, {}],
    'url-media': [defaultProductConfiguration('url-media'), {}]
  };

  for (const [type, [configuration, options]] of Object.entries(cases)) {
    const result = validateProductConfiguration(type, configuration, {status: 'published', ...options});
    assert.equal(result.valid, true, `${type}: ${result.errors.join('; ')}`);
  }
});

test('public summaries never expose private delivery or access URLs', () => {
  const webinar = publicConfigurationSummary('webinar', {
    timezone: 'Asia/Kolkata',
    sessions: [{startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', capacity: 10, joinUrl: 'https://secret.example/join'}]
  }).join(' ');
  const community = publicConfigurationSummary('community', {
    platform: 'discord', accessUrl: 'https://secret.example/invite', benefits: ['Private events']
  }).join(' ');
  assert.doesNotMatch(webinar, /secret|join/i);
  assert.doesNotMatch(community, /secret|invite/i);
});

test('converts schedule wall times using the selected product timezone', () => {
  assert.equal(toDateTimeLocal('2026-10-01T04:30:00.000Z', 'Asia/Kolkata'), '2026-10-01T10:00');
  assert.equal(toIsoDateTime('2026-10-01T10:00', 'Asia/Kolkata'), '2026-10-01T04:30:00.000Z');
  assert.equal(toIsoDateTime('2026-07-01T10:00', 'America/Chicago'), '2026-07-01T15:00:00.000Z');
  assert.equal(toIsoDateTime('not-a-date', 'Asia/Kolkata'), '');
});
