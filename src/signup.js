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

export function handleAvailabilityRequest(form) {
  return {username: form?.handle || ''};
}

export function authFailureMessage(operation, status, code = '') {
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (String(code).toUpperCase() === 'EMAIL_NOT_VERIFIED') {
    return 'Verify your email before signing in. You can request another verification email below.';
  }
  if (operation === 'availability') return 'We could not check that store address right now. Try again.';
  if (operation === 'registration') return 'We could not create that account. The store address or email may already be in use. Sign in or try different details.';
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
  if (!/^[a-zA-Z0-9_]{3,40}$/.test(form?.handle || '')) {
    return 'Use 3–40 letters, numbers, or underscores for your store address.';
  }
  if (!(form?.displayName || '').trim()) {
    return 'Enter the creator or business name visitors should see.';
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form?.email || '')) {
    return 'Enter a valid email address.';
  }
  if ((form?.password || '').length < 8) {
    return 'Use a password with at least 8 characters.';
  }
  return '';
}
