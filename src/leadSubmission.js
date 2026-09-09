import {newIdempotencyKey, stableRequestIdentity} from './requestId.js';

export function leadSubmissionIdentity(previous, payload, createKey = newIdempotencyKey) {
  const fingerprint = JSON.stringify({
    creatorId: Number(payload.creatorId),
    email: String(payload.email || '').trim().toLowerCase(),
    name: String(payload.name || '').trim(),
    phone: payload.phone ? String(payload.phone).trim() : null,
    consent: Boolean(payload.consent)
  });
  return stableRequestIdentity(previous, fingerprint, createKey);
}
