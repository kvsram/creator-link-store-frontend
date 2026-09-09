export function signupPlanFromSearch(search) {
  return new URLSearchParams(search || '').get('plan') === 'pro' ? 'pro' : 'starter';
}

export function loginNoticeFromSearch(search) {
  return new URLSearchParams(search || '').get('account') === 'created'
    ? 'Your account was created, but automatic sign-in did not complete. Sign in with the email and password you just chose.'
    : '';
}

export function handleAvailabilityRequest(form) {
  return {username: form?.handle || ''};
}

export function authFailureMessage(operation, status) {
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (operation === 'availability') return 'We could not check that store address right now. Try again.';
  if (operation === 'registration') return 'We could not create that account. The store address or email may already be in use. Sign in or try different details.';
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
