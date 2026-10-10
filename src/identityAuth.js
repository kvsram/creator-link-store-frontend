const TOKEN_KEYS = ['token', 'verification_token', 'reset_token'];

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
    identifier: String(fallbackEmail ?? '').trim().toLowerCase(),
    expiresAt: response?.expiresAt ?? response?.expires_at ?? null
  };
}

export function tokenFromSearch(search) {
  const params = new URLSearchParams(search || '');
  for (const key of TOKEN_KEYS) {
    const token = params.get(key);
    if (token?.trim()) return token.trim();
  }
  return '';
}

export async function requestV1WithFallback(request, v1Path, legacyPath, options) {
  try {
    return await request(v1Path, options);
  } catch (failure) {
    if (failure?.status !== 404 && failure?.status !== 501) throw failure;
    return request(legacyPath, options);
  }
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
  if (String(password ?? '').length < 8) return 'Use a password with at least 8 characters.';
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
    expiresAt: row?.expiresAt ?? row?.expires_at ?? null,
    device: String(row?.device ?? row?.deviceLabel ?? row?.device_label ?? 'Unknown device'),
    location: String(row?.location ?? row?.locationLabel ?? row?.location_label ?? '')
  })).filter(row => row.id);
}

export function sessionTimestamp(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}
