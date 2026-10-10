const HANDLE_PATTERN = /^[a-z0-9_]{3,40}$/;

export function profileForm(profile = {}, account = {}) {
  return {
    displayName: String(profile.displayName ?? profile.display_name ?? account.displayName ?? ''),
    handle: String(profile.handle ?? profile.username ?? account.handle ?? '').toLowerCase(),
    bio: String(profile.bio ?? ''),
    phone: String(profile.phone ?? '')
  };
}

export function validateProfileForm(form) {
  const displayName = String(form?.displayName ?? '').trim();
  const handle = String(form?.handle ?? '').trim().toLowerCase();
  const bio = String(form?.bio ?? '').trim();
  const phone = String(form?.phone ?? '').trim();

  if (!displayName) return 'Enter the creator or business name visitors should see.';
  if (displayName.length > 80) return 'Display name must be 80 characters or fewer.';
  if (!HANDLE_PATTERN.test(handle)) {
    return 'Use 3–40 lowercase letters, numbers, or underscores for your store link.';
  }
  if (bio.length > 280) return 'Bio must be 280 characters or fewer.';
  if (phone && !/^[+()0-9 .-]{7,32}$/.test(phone)) {
    return 'Use a valid 7–32 character phone number, or leave it blank.';
  }
  return '';
}

export function profileSavePayload(form) {
  return {
    displayName: String(form?.displayName ?? '').trim(),
    handle: String(form?.handle ?? '').trim().toLowerCase(),
    bio: String(form?.bio ?? '').trim(),
    phone: String(form?.phone ?? '').trim() || null
  };
}

export function savedProfile(response, fallback = {}) {
  return profileForm(response?.profile ?? response, fallback);
}

export function profileSaveFailure(status, serverMessage = '') {
  if (status === 409) return 'That store link is already in use. Choose another one.';
  if (status === 429) return 'Too many profile changes. Wait a moment and try again.';
  if (status === 401) return 'Your session expired. Sign in again before saving.';
  if (status === 400 && serverMessage) return serverMessage;
  return 'We could not save your profile right now. Your existing profile was not changed.';
}
