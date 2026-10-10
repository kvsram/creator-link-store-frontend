function list(value) {
  return Array.isArray(value) ? value : [];
}

export function availableMeetingSlots(configuration = {}, now = Date.now()) {
  const slots = list(configuration.slots ?? configuration.meeting_slots);
  return slots.filter(slot => {
    const startsAt = Date.parse(slot?.startsAt ?? slot?.starts_at ?? '');
    const remaining = slot?.remaining;
    return Number.isFinite(startsAt)
      && startsAt > now
      && (remaining == null || Number(remaining) > 0);
  });
}
