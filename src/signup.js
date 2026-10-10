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

export function signupRegistrationPayload(form) {
  return {
    displayName: String(form?.displayName ?? '').trim(),
    email: String(form?.email ?? '').trim().toLowerCase(),
    password: String(form?.password ?? '')
  };
}

export function authFailureMessage(operation, status, code = '') {
  const normalizedCode = String(code).toUpperCase();
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (normalizedCode === 'EMAIL_NOT_VERIFIED') {
    return 'Verify your email before signing in. You can request another verification email below.';
  }
  if (!status || status >= 500 || ['NETWORK_ERROR', 'REQUEST_TIMEOUT', 'INVALID_API_RESPONSE',
    'INVALID_AUTH_RESPONSE', 'CSRF_BOOTSTRAP_INVALID'].includes(normalizedCode)) {
    return 'The account service is unavailable right now. Check your connection and try again.';
  }
  if (operation === 'registration') return 'We could not complete signup. Check the details, sign in if you already have an account, or try again later.';
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

export function isInsecureHttpLocation(locationLike = {}) {
  return String(locationLike.protocol ?? '').toLowerCase() === 'http:';
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
