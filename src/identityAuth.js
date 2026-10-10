const TOKEN_KEYS = ['token', 'verification_token', 'reset_token'];
const POST_VERIFICATION_INTENT_KEY = 'creatorStore.postVerificationIntent.v1';
const POST_VERIFICATION_INTENT_TTL_MS = 60 * 60 * 1000;

export function verificationRequired(response) {
  const status = String(response?.status ?? response?.accountStatus ?? response?.account_status ?? '')
    .trim().toLowerCase().replaceAll('-', '_');
  return response?.verificationRequired === true
    || response?.verification_required === true
    || status === 'verification_required'
    || status === 'pending_verification';
}

export function maskedEmail(value) {
  const email = String(value ?? '').trim();
  const separator = email.lastIndexOf('@');
  if (separator < 1) return 'your email address';
  const local = email.slice(0, separator);
  const visible = local.length > 1 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}${email.slice(separator)}`;
}

export function pendingVerificationDetails(response, fallbackEmail = '') {
  return {
    emailHint: String(response?.emailHint ?? response?.email_hint ?? '').trim()
      || maskedEmail(fallbackEmail),
    email: verificationEmailPrefill(fallbackEmail),
    expiresAt: response?.expiresAt ?? response?.expires_at ?? null
  };
}

export function verificationEmailPrefill(value) {
  const email = String(value ?? '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
}

export function resendCooldownSeconds(response, fallback = 30) {
  const raw = response?.retryAfterSeconds ?? response?.retry_after_seconds ?? fallback;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds)) return fallback;
  return Math.max(1, Math.min(300, Math.ceil(seconds)));
}

function tokenFromParameters(raw) {
  const params = new URLSearchParams(String(raw || '').replace(/^#\??/, ''));
  for (const key of TOKEN_KEYS) {
    const token = params.get(key);
    if (token?.trim()) return token.trim();
  }
  return '';
}

export function tokenFromSearch(search, hash = '') {
  return tokenFromParameters(hash) || tokenFromParameters(search);
}

function cleanedAuthParameters(raw, prefix) {
  const source = String(raw || '');
  if (!source) return '';
  const normalized = source.replace(/^#\??/, '');
  if (!normalized.includes('=')) return source;
  const params = new URLSearchParams(normalized);
  TOKEN_KEYS.forEach(key => params.delete(key));
  const value = params.toString();
  return value ? `${prefix}${value}` : '';
}

export function locationWithoutAuthTokens(locationLike = {}) {
  const params = new URLSearchParams(locationLike.search || '');
  TOKEN_KEYS.forEach(key => params.delete(key));
  const search = params.toString();
  const hash = cleanedAuthParameters(locationLike.hash, '#');
  return `${locationLike.pathname || '/'}${search ? `?${search}` : ''}${hash}`;
}

export function scrubAuthTokenFromHistory(locationLike, historyLike) {
  if (!tokenFromSearch(locationLike?.search, locationLike?.hash)) return false;
  historyLike?.replaceState?.(historyLike.state ?? null, '', locationWithoutAuthTokens(locationLike));
  return true;
}

export function rememberPostVerificationIntent(storage, plan, now = Date.now()) {
  try {
    if (plan !== 'pro') {
      storage?.removeItem?.(POST_VERIFICATION_INTENT_KEY);
      return false;
    }
    storage?.setItem?.(POST_VERIFICATION_INTENT_KEY, JSON.stringify({
      intent: 'view_pro_billing', expiresAt: now + POST_VERIFICATION_INTENT_TTL_MS
    }));
    return true;
  } catch {
    return false;
  }
}

export function consumePostVerificationDestination(storage, now = Date.now()) {
  let value = null;
  try {
    value = storage?.getItem?.(POST_VERIFICATION_INTENT_KEY);
    storage?.removeItem?.(POST_VERIFICATION_INTENT_KEY);
  } catch {
    return '/dashboard/';
  }
  if (!value) return '/dashboard/';
  try {
    const parsed = JSON.parse(value);
    return parsed?.intent === 'view_pro_billing' && Number(parsed?.expiresAt) > now
      ? '/dashboard/settings?tab=billing&plan=pro' : '/dashboard/';
  } catch {
    return '/dashboard/';
  }
}

function accountProjection(response, expectedStatus) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return false;
  const status = String(response.status ?? '').trim().toLowerCase();
  return response.id != null
    && String(response.publicId ?? '').trim().length > 0
    && String(response.handle ?? '').trim().length >= 3
    && String(response.displayName ?? '').trim().length > 0
    && typeof response.emailVerified === 'boolean'
    && status === expectedStatus;
}

function invalidAuthResponse() {
  return Object.assign(new Error('The account service returned an invalid response.'), {
    code: 'INVALID_AUTH_RESPONSE', status: 0
  });
}

export function requirePendingRegistration(response) {
  const explicitlyRequiresVerification = response?.verificationRequired === true
    || response?.verification_required === true;
  if (!accountProjection(response, 'pending_verification') || !explicitlyRequiresVerification) {
    throw invalidAuthResponse();
  }
  return response;
}

export function requireActiveAuthAccount(response) {
  if (!accountProjection(response, 'active') || response.emailVerified !== true) {
    throw invalidAuthResponse();
  }
  return response;
}

export function recoveryEmailPayload(email) {
  return {email: String(email ?? '').trim().toLowerCase()};
}

export function validateRecoveryEmail(email) {
  const value = String(email ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return 'Enter a valid email address.';
  if (value.length > 255) return 'That email address is too long.';
  return '';
}

export function validateNewPassword(password, confirmation) {
  const value = String(password ?? '');
  const length = Array.from(value).length;
  if (!value.trim() || length < 12 || length > 128) return 'Use a password with 12–128 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return '';
}

export function resetPasswordPayload(token, password) {
  return {token: String(token ?? '').trim(), newPassword: String(password ?? '')};
}

export function failureCode(failure) {
  return String(failure?.code ?? failure?.payload?.code ?? '').trim().toUpperCase();
}

export function needsEmailVerification(failure) {
  return failure?.status === 403 && failureCode(failure) === 'EMAIL_NOT_VERIFIED';
}

export function normalizeSessions(response) {
  const rows = Array.isArray(response) ? response : response?.sessions ?? response?.items ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map(row => ({
    id: String(row?.publicId ?? row?.public_id ?? row?.id ?? row?.sessionId ?? row?.session_id ?? ''),
    current: row?.current === true || row?.isCurrent === true || row?.is_current === true,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    lastSeenAt: row?.lastSeenAt ?? row?.last_seen_at ?? null,
    idleExpiresAt: row?.idleExpiresAt ?? row?.idle_expires_at ?? null,
    expiresAt: row?.expiresAt ?? row?.expires_at ?? null,
    authMethod: String(row?.authMethod ?? row?.auth_method ?? 'password'),
    device: String(row?.device ?? row?.deviceLabel ?? row?.device_label ?? 'Unknown device'),
    location: String(row?.location ?? row?.locationLabel ?? row?.location_label ?? '')
  })).filter(row => row.id);
}

export function sessionTimestamp(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}
