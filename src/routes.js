const DASHBOARD_PREFIX = '/dashboard';
const MARKETING_PATHS = new Set(['/', '/about', '/create-store', '/features', '/pricing']);

export function resolveRoute(pathname) {
  const normalized = normalizePath(pathname);
  if (MARKETING_PATHS.has(normalized)) return {kind: 'marketing'};
  if (normalized === '/signup' || normalized === '/register') return {kind: 'signup'};
  if (normalized === '/login') return {kind: 'login'};
  if (normalized === DASHBOARD_PREFIX) return {kind: 'dashboard', section: 'home'};
  if (normalized.startsWith(`${DASHBOARD_PREFIX}/`)) {
    return {kind: 'dashboard', section: normalized.slice(DASHBOARD_PREFIX.length + 1).split('/')[0] || 'home'};
  }

  const segments = normalized.slice(1).split('/');
  if (segments.length === 3 && segments[1] === 'products') {
    try {
      const handle = decodeURIComponent(segments[0]).toLowerCase();
      const productId = Number(segments[2]);
      if (!handle || !Number.isSafeInteger(productId) || productId <= 0) return {kind: 'not-found'};
      return {kind: 'product-detail', handle, productId};
    } catch {
      return {kind: 'not-found'};
    }
  }
  if (segments.length !== 1 || !segments[0]) return {kind: 'not-found'};
  try {
    return {kind: 'store', handle: decodeURIComponent(segments[0]).toLowerCase()};
  } catch {
    return {kind: 'not-found'};
  }
}

function normalizePath(pathname) {
  const path = String(pathname || '/').split(/[?#]/, 1)[0];
  if (path === '/') return path;
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}
