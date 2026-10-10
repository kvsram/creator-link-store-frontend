export function signupPlanFromSearch(search) {
  return new URLSearchParams(search || '').get('plan') === 'pro' ? 'pro' : 'starter';
}

export function loginNoticeFromSearch(search) {
  const params = new URLSearchParams(search || '');
  if (params.get('account') === 'created') {
    return 'Your account was created, but automatic sign-in did not complete. Sign in with the email and password you just chose.';
  }
  if (params.get('verified') === '1') return 'Email verified. You can sign in now.';
  if (params.get('reset') === '1') return 'Password changed. Sign in with your new password.';
  if (params.get('signedOut') === '1') return 'You signed out securely.';
  return '';
}

function secureStoreLinkNonce() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure random values are unavailable in this browser.');
}

export function generatedStoreHandle(displayName, randomValue) {
  let base = String(displayName ?? '').normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (base.length < 3) base = 'creator';
  const suffix = String(randomValue ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (suffix.length < 12) throw new Error('A secure store-link suffix is required.');
  return `${base.slice(0, 27)}_${suffix.slice(0, 12)}`;
}

export function signupRegistrationPayload(form, randomValue = secureStoreLinkNonce()) {
  return {
    handle: generatedStoreHandle(form?.displayName, randomValue),
    displayName: String(form?.displayName ?? ''),
    email: String(form?.email ?? ''),
    password: String(form?.password ?? '')
  };
}

export function authFailureMessage(operation, status, code = '') {
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (String(code).toUpperCase() === 'EMAIL_NOT_VERIFIED') {
    return 'Verify your email before signing in. You can request another verification email below.';
  }
  if (operation === 'registration') return 'We could not create that account. The email may already be registered. Sign in or try another email.';
  if (operation === 'verification') return status === 400 || status === 410
    ? 'This verification link is invalid or expired. Request a new email.'
    : 'We could not verify this email right now. Try again.';
  if (operation === 'recovery') return 'We could not start account recovery right now. Try again.';
  if (operation === 'reset') return status === 400 || status === 410
    ? 'This password-reset link is invalid or expired. Request a new one.'
    : 'We could not change the password right now. Try again.';
  if (operation === 'logout') return 'We could not sign you out. Check your connection and try again.';
  return 'Sign-in failed. Check your details and try again.';
}

export function validateSignupDetails(form) {
  if (!(form?.displayName || '').trim()) {
    return 'Enter the creator or business name visitors should see.';
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form?.email || '')) {
    return 'Enter a valid email address.';
  }
  const password = String(form?.password || '');
  const passwordLength = Array.from(password).length;
  if (!password.trim() || passwordLength < 12 || passwordLength > 128) {
    return 'Use a password with 12–128 characters.';
  }
  return '';
}
