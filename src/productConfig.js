const DEFAULT_TIME_ZONE = 'UTC';

export const PRODUCT_TYPE_DEFINITIONS = Object.freeze({
  'lead-magnet': Object.freeze({icon: '🎁', label: 'Lead magnet', description: 'Collect contact details with a free resource', fileKinds: ['download']}),
  'digital-download': Object.freeze({icon: '⬇', label: 'Digital download', description: 'Sell a file, template, or guide', fileKinds: ['download']}),
  meeting: Object.freeze({icon: '📅', label: 'Meeting', description: 'Let buyers book an available time', fileKinds: []}),
  fulfillment: Object.freeze({icon: '📦', label: 'Custom service', description: 'Deliver a personalized service or result', fileKinds: []}),
  course: Object.freeze({icon: '🎓', label: 'Course', description: 'Organize lessons into a learning path', fileKinds: ['lesson-video', 'supporting-material']}),
  membership: Object.freeze({icon: '↻', label: 'Membership', description: 'Offer recurring subscriber access', fileKinds: []}),
  webinar: Object.freeze({icon: '▶', label: 'Webinar', description: 'Host one or more scheduled live sessions', fileKinds: []}),
  community: Object.freeze({icon: '👥', label: 'Community', description: 'Sell access to a private group', fileKinds: []}),
  'url-media': Object.freeze({icon: '🏷️', label: 'Promotion / external link', description: 'Share a sponsor, affiliate, shop, or media link', fileKinds: []})
});

export const PRODUCT_TYPES = Object.freeze(Object.keys(PRODUCT_TYPE_DEFINITIONS));

export function productVisual(type) {
  const definition = PRODUCT_TYPE_DEFINITIONS[type];
  return definition
    ? [definition.icon, definition.label, definition.description]
    : ['◆', String(type || 'Product').replaceAll('-', ' '), 'Creator offer'];
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function defaultProductConfiguration(type, timeZone = browserTimeZone()) {
  switch (type) {
    case 'digital-download':
      return {schemaVersion: 1, deliveryMode: 'upload', redirectUrl: ''};
    case 'lead-magnet':
      return {schemaVersion: 1, deliveryMode: 'upload', redirectUrl: '', collectName: true, collectEmail: true, collectPhone: false, consentText: ''};
    case 'meeting':
      return {schemaVersion: 1, location: 'google-meet', locationDetails: '', timezone: timeZone, durationMinutes: 60, maxAttendees: 1, minNoticeHours: 12, bufferMinutes: 15, slots: []};
    case 'webinar':
      return {schemaVersion: 1, location: 'google-meet', timezone: timeZone, durationMinutes: 60, capacity: 100, sessions: []};
    case 'course':
      return {schemaVersion: 1, dripDays: 0, modules: [{title: 'Module 1', description: '', lessons: [{title: 'Lesson 1', description: '', videoUrl: ''}]}]};
    case 'membership':
      return {schemaVersion: 1, plans: [{name: 'Monthly membership', amountSubunits: 0, interval: 'monthly', intervalCount: 1}], benefits: [''], memberBenefits: '', welcomeMessage: ''};
    case 'fulfillment':
      return {schemaVersion: 1, turnaroundDays: 3, deliveryFormat: 'file-upload', buyerInstructions: '', checkoutFields: []};
    case 'community':
      return {schemaVersion: 1, platform: 'discord', accessUrl: '', benefits: [''], memberBenefits: '', welcomeMessage: ''};
    case 'url-media':
      return {schemaVersion: 1};
    default:
      return {schemaVersion: 1};
  }
}

export function parseConfiguration(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeProductConfiguration(type, value, timeZone = browserTimeZone()) {
  const defaults = defaultProductConfiguration(type, timeZone);
  const raw = parseConfiguration(value);
  const normalized = {...defaults, ...raw, schemaVersion: 1};

  if (type === 'meeting') {
    normalized.durationMinutes = integer(raw.durationMinutes, defaults.durationMinutes);
    normalized.maxAttendees = integer(raw.maxAttendees, defaults.maxAttendees);
    normalized.minNoticeHours = integer(raw.minNoticeHours, defaults.minNoticeHours);
    normalized.bufferMinutes = integer(raw.bufferMinutes, defaults.bufferMinutes);
    normalized.slots = list(raw.slots).map(normalizeSlot).filter(slot => slot.startsAt);
  }
  if (type === 'webinar') {
    normalized.durationMinutes = integer(raw.durationMinutes, defaults.durationMinutes);
    normalized.capacity = integer(raw.capacity, defaults.capacity);
    const legacySession = raw.startsAt ? [{startsAt: raw.startsAt, endsAt: raw.endsAt, capacity: raw.capacity, joinUrl: raw.joinUrl}] : [];
    normalized.sessions = list(raw.sessions).concat(list(raw.sessions).length ? [] : legacySession)
      .map(session => ({...normalizeSlot(session), capacity: integer(session?.capacity, normalized.capacity), joinUrl: text(session?.joinUrl ?? session?.join_url)}))
      .filter(session => session.startsAt);
  }
  if (type === 'course') {
    normalized.dripDays = integer(raw.dripDays, defaults.dripDays);
    normalized.modules = list(raw.modules === undefined ? defaults.modules : raw.modules).map(module => ({
      id: optionalId(module?.id),
      title: text(module?.title),
      description: text(module?.description),
      lessons: list(module?.lessons).map(lesson => ({
        id: optionalId(lesson?.id),
        title: text(lesson?.title),
        description: text(lesson?.description ?? lesson?.content),
        videoUrl: text(lesson?.videoUrl ?? lesson?.video_url)
      }))
    }));
  }
  if (type === 'membership') {
    const legacyInterval = text(raw.billingInterval) || 'monthly';
    normalized.plans = list(raw.plans === undefined ? defaults.plans : raw.plans).map(plan => ({
      id: optionalId(plan?.id),
      name: text(plan?.name),
      amountSubunits: integer(plan?.amountSubunits ?? plan?.amount_subunits, 0),
      interval: text(plan?.interval ?? plan?.intervalName ?? plan?.interval_name) || legacyInterval,
      intervalCount: integer(plan?.intervalCount ?? plan?.interval_count, 1)
    }));
    if (!normalized.plans.length && raw.billingInterval) {
      normalized.plans = [{name: `${capitalize(legacyInterval)} membership`, amountSubunits: 0, interval: legacyInterval, intervalCount: 1}];
    }
    normalized.benefits = normalizeBenefits(raw.benefits, raw.memberBenefits);
    normalized.memberBenefits = normalized.benefits.filter(Boolean).join('\n');
    normalized.welcomeMessage = text(raw.welcomeMessage);
  }
  if (type === 'fulfillment') {
    normalized.turnaroundDays = integer(raw.turnaroundDays, defaults.turnaroundDays);
    normalized.checkoutFields = list(raw.checkoutFields).map((field, index) => ({
      id: optionalId(field?.id),
      label: text(field?.label),
      fieldType: text(field?.fieldType ?? field?.field_type) || 'text',
      required: Boolean(field?.required),
      position: integer(field?.position, index)
    }));
  }
  if (type === 'community') {
    normalized.benefits = normalizeBenefits(raw.benefits, raw.memberBenefits);
    normalized.memberBenefits = normalized.benefits.filter(Boolean).join('\n');
    normalized.platform = text(raw.platform) || defaults.platform;
    normalized.accessUrl = text(raw.accessUrl);
    normalized.welcomeMessage = text(raw.welcomeMessage);
  }
  if (type === 'lead-magnet') {
    normalized.collectName = raw.collectName !== false;
    normalized.collectEmail = true;
    normalized.collectPhone = Boolean(raw.collectPhone);
    normalized.consentText = text(raw.consentText);
  }
  return normalized;
}

export function validateProductConfiguration(type, value, options = {}) {
  const configuration = normalizeProductConfiguration(type, value, options.timeZone);
  const publishing = options.status === 'published';
  const errors = [];
  const fileKinds = new Set([...(options.existingFileKinds || []), ...(options.pendingFileKinds || [])]);

  if (type === 'digital-download' || type === 'lead-magnet') {
    if (!['upload', 'redirect'].includes(configuration.deliveryMode)) errors.push('Choose file upload or secure redirect delivery.');
    if (configuration.deliveryMode === 'redirect' && (publishing || configuration.redirectUrl) && !isHttpsUrl(configuration.redirectUrl)) errors.push('Enter an absolute HTTPS delivery URL.');
    if (publishing && configuration.deliveryMode === 'upload' && !fileKinds.has('download')) errors.push('Upload the delivery file before publishing.');
  }
  if (type === 'meeting') {
    if (publishing && !configuration.timezone) errors.push('Choose a meeting timezone.');
    bounded(configuration.durationMinutes, 15, 480, 'Meeting duration', errors);
    bounded(configuration.maxAttendees, 1, 500, 'Maximum attendees', errors);
    bounded(configuration.minNoticeHours, 0, 8760, 'Minimum notice', errors);
    bounded(configuration.bufferMinutes, 0, 240, 'Meeting buffer', errors);
    validateSlots(configuration.slots, 'meeting slot', errors, {expectedMinutes: configuration.durationMinutes, maxMinutes: 480, rejectOverlap: true});
    if (publishing && !configuration.slots.length) errors.push('Add at least one meeting slot before publishing.');
  }
  if (type === 'webinar') {
    if (publishing && !configuration.timezone) errors.push('Choose a webinar timezone.');
    bounded(configuration.durationMinutes, 15, 480, 'Webinar duration', errors);
    bounded(configuration.capacity, 1, 100000, 'Webinar capacity', errors);
    validateSlots(configuration.sessions, 'webinar session', errors, {maxMinutes: 1440});
    configuration.sessions.forEach((session, index) => {
      if ((publishing || session.joinUrl) && !isHttpsUrl(session.joinUrl)) errors.push(`Webinar session ${index + 1} needs a private HTTPS join URL.`);
      bounded(session.capacity, 1, 100000, `Webinar session ${index + 1} capacity`, errors);
    });
    if (publishing && !configuration.sessions.length) errors.push('Add at least one webinar session before publishing.');
  }
  if (type === 'course') {
    bounded(configuration.dripDays, 0, 3650, 'Drip delay', errors);
    configuration.modules.forEach((module, moduleIndex) => {
      if (publishing && !module.title) errors.push(`Module ${moduleIndex + 1} needs a title.`);
      module.lessons.forEach((lesson, lessonIndex) => {
        if (publishing && !lesson.title) errors.push(`Lesson ${lessonIndex + 1} in module ${moduleIndex + 1} needs a title.`);
        if (lesson.videoUrl && !isHttpsUrl(lesson.videoUrl)) errors.push(`Lesson ${lessonIndex + 1} video URL must use HTTPS.`);
      });
      if (publishing && !module.lessons.length) errors.push(`Module ${moduleIndex + 1} needs at least one lesson.`);
    });
    if (publishing && !configuration.modules.length) errors.push('Add at least one course module before publishing.');
  }
  if (type === 'membership') {
    configuration.plans.forEach((plan, index) => {
      if (publishing && !plan.name) errors.push(`Membership plan ${index + 1} needs a name.`);
      if ((publishing || plan.interval) && !['daily', 'weekly', 'monthly', 'annual'].includes(plan.interval)) errors.push(`Membership plan ${index + 1} has an unsupported billing interval.`);
      bounded(plan.intervalCount, 1, 365, `Membership plan ${index + 1} interval`, errors);
      if (publishing && plan.amountSubunits <= 0) errors.push(`Membership plan ${index + 1} needs a price greater than ₹0.`);
    });
    if (publishing && !configuration.plans.length) errors.push('Add at least one membership plan before publishing.');
    if (publishing && !configuration.benefits.some(Boolean)) errors.push('Add at least one membership benefit.');
  }
  if (type === 'fulfillment') {
    bounded(configuration.turnaroundDays, 1, 365, 'Delivery time', errors);
    if (!['file-upload', 'email', 'call'].includes(configuration.deliveryFormat)) errors.push('Choose a supported delivery format.');
    configuration.checkoutFields.forEach((field, index) => {
      if (publishing && !field.label) errors.push(`Checkout question ${index + 1} needs a label.`);
      if (!['text', 'textarea', 'email', 'phone', 'number', 'url'].includes(field.fieldType)) errors.push(`Checkout question ${index + 1} has an unsupported type.`);
    });
  }
  if (type === 'community') {
    if ((publishing || configuration.platform) && !['discord', 'whatsapp', 'telegram', 'circle', 'slack', 'custom'].includes(configuration.platform)) errors.push('Choose a supported community platform.');
    if ((publishing || configuration.accessUrl) && !isHttpsUrl(configuration.accessUrl)) errors.push('Enter the private HTTPS community access URL.');
    if (publishing && !configuration.benefits.some(Boolean)) errors.push('Add at least one community benefit.');
  }
  return {valid: errors.length === 0, errors, configuration};
}

export function publicConfigurationSummary(type, value) {
  const configuration = normalizeProductConfiguration(type, value);
  switch (type) {
    case 'digital-download':
      return ['Instant digital delivery'];
    case 'lead-magnet':
      return ['Free resource', configuration.collectPhone ? 'Email and phone required' : 'Email required'];
    case 'meeting':
      return [`${configuration.durationMinutes} minute meeting`, configuration.timezone, countLabel(configuration.slots.length, 'available time')];
    case 'webinar':
      return [configuration.timezone, countLabel(configuration.sessions.length, 'upcoming session')];
    case 'course': {
      const lessons = configuration.modules.reduce((total, module) => total + module.lessons.length, 0);
      return [countLabel(configuration.modules.length, 'module'), countLabel(lessons, 'lesson'), configuration.dripDays ? `Drips over ${configuration.dripDays} days` : 'Immediate access'];
    }
    case 'membership':
      return [countLabel(configuration.plans.length, 'membership plan'), ...configuration.benefits.filter(Boolean).slice(0, 2)];
    case 'fulfillment':
      return [`Delivery in ${configuration.turnaroundDays} day${configuration.turnaroundDays === 1 ? '' : 's'}`, countLabel(configuration.checkoutFields.length, 'checkout question')];
    case 'community':
      return [`Hosted on ${capitalize(configuration.platform)}`, ...configuration.benefits.filter(Boolean).slice(0, 2)];
    default:
      return [];
  }
}

export function toDateTimeLocal(value, timeZone = browserTimeZone()) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const parts = zonedParts(date, timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
  } catch {
    return '';
  }
}

export function toIsoDateTime(value, timeZone = browserTimeZone()) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return '';
  const expected = match.slice(1).map(Number);
  const target = Date.UTC(expected[0], expected[1] - 1, expected[2], expected[3], expected[4]);
  const targetDate = new Date(target);
  if (targetDate.getUTCFullYear() !== expected[0] || targetDate.getUTCMonth() + 1 !== expected[1]
      || targetDate.getUTCDate() !== expected[2] || targetDate.getUTCHours() !== expected[3]
      || targetDate.getUTCMinutes() !== expected[4]) return '';
  try {
    let instant = target;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const shown = zonedParts(new Date(instant), timeZone);
      const represented = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute);
      const adjustment = target - represented;
      instant += adjustment;
      if (adjustment === 0) break;
    }
    const verified = zonedParts(new Date(instant), timeZone);
    if ([verified.year, verified.month, verified.day, verified.hour, verified.minute]
        .some((part, index) => part !== expected[index])) return '';
    return new Date(instant).toISOString();
  } catch {
    return '';
  }
}

function zonedParts(date, timeZone) {
  const values = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).forEach(part => {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  });
  return values;
}

function pad(value) { return String(value).padStart(2, '0'); }

function normalizeSlot(slot) {
  return {id: optionalId(slot?.id), startsAt: text(slot?.startsAt ?? slot?.starts_at), endsAt: text(slot?.endsAt ?? slot?.ends_at)};
}

function validateSlots(slots, label, errors, options = {}) {
  const validRanges = [];
  slots.forEach((slot, index) => {
    const start = Date.parse(slot.startsAt);
    const end = Date.parse(slot.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push(`${capitalize(label)} ${index + 1} needs valid start and end times.`);
    else if (end <= start) errors.push(`${capitalize(label)} ${index + 1} must end after it starts.`);
    else {
      const minutes = Math.round((end - start) / 60_000);
      if (options.maxMinutes && minutes > options.maxMinutes) errors.push(`${capitalize(label)} ${index + 1} is longer than ${options.maxMinutes} minutes.`);
      if (options.expectedMinutes && Math.abs(minutes - options.expectedMinutes) > 1) errors.push(`${capitalize(label)} ${index + 1} must match the ${options.expectedMinutes}-minute duration.`);
      validRanges.push({start, end, index});
    }
  });
  if (options.rejectOverlap) validRanges.sort((a,b)=>a.start-b.start).forEach((range,index,ranges)=>{
    if (index && range.start < ranges[index-1].end) errors.push(`${capitalize(label)}s ${ranges[index-1].index+1} and ${range.index+1} overlap.`);
  });
}

function normalizeBenefits(value, legacy) {
  const benefits = list(value).map(text);
  if (benefits.length) return benefits;
  const migrated = text(legacy).split(/\r?\n/).map(text).filter(Boolean);
  return migrated.length ? migrated : [''];
}

function bounded(value, min, max, label, errors) {
  if (!Number.isFinite(value) || value < min || value > max) errors.push(`${label} must be between ${min} and ${max}.`);
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function list(value) { return Array.isArray(value) ? value : []; }
function text(value) { return value == null ? '' : String(value).trim(); }
function integer(value, fallback) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback; }
function optionalId(value) { return value == null || value === '' ? undefined : value; }
function capitalize(value) { const clean = text(value); return clean ? clean[0].toUpperCase() + clean.slice(1) : ''; }
function countLabel(count, singular) { return `${count} ${singular}${count === 1 ? '' : 's'}`; }
