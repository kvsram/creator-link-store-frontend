export function publicViewDecision(recordedHandles, handle) {
  const key = normalizePublicHandle(handle);
  const seen = Array.isArray(recordedHandles) ? recordedHandles : [];
  if (!key || seen.includes(key)) return {shouldRecord: false, recordedHandles: seen};
  return {shouldRecord: true, recordedHandles: [...seen, key]};
}

export function publicViewPayload(handle, path, referrer) {
  return {
    handle: normalizePublicHandle(handle),
    path: String(path || '/'),
    referrer: referrer ? String(referrer) : null
  };
}

export function normalizePublicHandle(handle) {
  return String(handle || '').trim().toLowerCase();
}

export async function postPublicView(request, payload) {
  try {
    await request('/api/events/view', {method: 'POST', body: JSON.stringify(payload)});
    return true;
  } catch {
    return false;
  }
}
