const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CSRF_PATH = '/api/v1/auth/csrf';
const DEFAULT_CSRF_HEADER = 'X-XSRF-TOKEN';
const CSRF_FAILURE_CODE = 'CSRF_TOKEN_INVALID';

export class ApiError extends Error {
  constructor({message, status = 0, code = 'API_ERROR', payload = null, method, path,
    retryable = false, timedOut = false, cause}) {
    super(message, cause ? {cause} : undefined);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
    this.method = method;
    this.path = path;
    this.retryable = retryable;
    this.timedOut = timedOut;
  }
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function responseCode(payload) {
  return String(payload?.code ?? '').trim().toUpperCase();
}

function errorMessage(payload, status) {
  return String(payload?.error ?? payload?.detail ?? payload?.message ?? '').trim()
    || `Request failed: ${status}`;
}

async function responsePayload(response) {
  if (response.status === 204) return {payload: null, validJson: true};
  const text = await response.text();
  if (!text.trim()) return {payload: null, validJson: true};
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('json')) {
    try { return {payload: JSON.parse(text), validJson: true} }
    catch { return {payload: {error: 'The server returned invalid JSON.'}, validJson: false} }
  }
  return {payload: text, validJson: false};
}

function withTimeout(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener?.('abort', abortFromExternal, {once: true});
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out.', 'TimeoutError'));
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', abortFromExternal);
    }
  };
}

export function createApiClient({
  baseUrl = '',
  fetchImpl = globalThis.fetch?.bind(globalThis),
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
  csrfPath = DEFAULT_CSRF_PATH
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

  let csrf = null;
  let csrfPromise = null;

  async function rawRequest(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs : defaultTimeoutMs;
    const timeout = withTimeout(options.signal, timeoutMs);
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body != null && !isFormData(options.body) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        body: options.body,
        credentials: 'include',
        headers,
        signal: timeout.signal
      });
      const parsed = await responsePayload(response);
      const payload = parsed.payload;
      if (!response.ok) {
        const code = responseCode(payload) || `HTTP_${response.status}`;
        throw new ApiError({
          message: errorMessage(payload, response.status),
          status: response.status,
          code,
          payload,
          method,
          path,
          retryable: response.status === 408 || response.status === 429 || response.status >= 500
        });
      }
      if (!parsed.validJson) {
        throw new ApiError({
          message: 'The server returned an invalid API response.',
          status: response.status,
          code: 'INVALID_API_RESPONSE',
          payload: null,
          method,
          path
        });
      }
      return {payload, response};
    } catch (failure) {
      if (failure instanceof ApiError) throw failure;
      const timedOut = timeout.timedOut();
      throw new ApiError({
        message: timedOut ? 'The request timed out.'
          : options.signal?.aborted ? 'The request was cancelled.'
            : 'The service could not be reached.',
        code: timedOut ? 'REQUEST_TIMEOUT'
          : options.signal?.aborted ? 'REQUEST_ABORTED' : 'NETWORK_ERROR',
        method,
        path,
        retryable: !options.signal?.aborted,
        timedOut,
        cause: failure
      });
    } finally {
      timeout.cleanup();
    }
  }

  async function csrfToken() {
    if (csrf) return csrf;
    if (!csrfPromise) {
      csrfPromise = rawRequest(csrfPath).then(({payload}) => {
        const token = String(payload?.token ?? '').trim();
        const headerName = String(payload?.headerName ?? DEFAULT_CSRF_HEADER).trim();
        if (!token || !headerName) {
          throw new ApiError({
            message: 'The server did not issue a valid security token.',
            code: 'CSRF_BOOTSTRAP_INVALID',
            method: 'GET',
            path: csrfPath
          });
        }
        csrf = {token, headerName};
        return csrf;
      }).finally(() => { csrfPromise = null });
    }
    return csrfPromise;
  }

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const requiresCsrf = !SAFE_METHODS.has(method) && options.csrf !== false;
    let attemptedRefresh = false;
    while (true) {
      const headers = new Headers(options.headers || {});
      if (requiresCsrf) {
        const current = await csrfToken();
        headers.set(current.headerName, current.token);
      }
      try {
        const {payload} = await rawRequest(path, {...options, method, headers});
        return payload;
      } catch (failure) {
        if (!requiresCsrf || attemptedRefresh || failure.status !== 403
          || responseCode(failure.payload) !== CSRF_FAILURE_CODE) throw failure;
        attemptedRefresh = true;
        csrf = null;
      }
    }
  }

  return {
    request,
    clearCsrfToken() { csrf = null },
    bootstrapCsrf: csrfToken
  };
}
