import test from 'node:test';
import assert from 'node:assert/strict';
import {ApiError, createApiClient} from '../src/apiClient.js';

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', ...headers}
  });
}

test('safe requests include cookies without bootstrapping CSRF', async () => {
  const calls = [];
  const client = createApiClient({baseUrl: 'https://app.example', fetchImpl: async (url, options) => {
    calls.push({url, options});
    return json(200, {id: 7});
  }});
  assert.deepEqual(await client.request('/api/v1/auth/me'), {id: 7});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://app.example/api/v1/auth/me');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.headers.get('Accept'), 'application/json');
  assert.equal(calls[0].options.headers.has('X-XSRF-TOKEN'), false);
});

test('unsafe requests bootstrap and cache the server CSRF contract', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({url, options});
    if (url.endsWith('/csrf')) {
      return json(200, {headerName: 'X-XSRF-TOKEN', parameterName: '_csrf', token: 'csrf-one'});
    }
    return json(200, {ok: true});
  };
  const client = createApiClient({fetchImpl});
  await client.request('/api/v1/auth/sessions', {method: 'POST', body: '{"login":true}'});
  await client.request('/api/v1/auth/sessions/current', {method: 'DELETE'});
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, '/api/v1/auth/csrf');
  assert.equal(calls[1].options.headers.get('X-XSRF-TOKEN'), 'csrf-one');
  assert.equal(calls[2].options.headers.get('X-XSRF-TOKEN'), 'csrf-one');
  assert.equal(calls[1].options.headers.get('Content-Type'), 'application/json');
});

test('refreshes CSRF once after the server rejects a stale token', async () => {
  let bootstrap = 0;
  let mutation = 0;
  const tokens = [];
  const client = createApiClient({fetchImpl: async (url, options) => {
    if (url.endsWith('/csrf')) {
      bootstrap += 1;
      return json(200, {headerName: 'X-XSRF-TOKEN', token: `csrf-${bootstrap}`});
    }
    mutation += 1;
    tokens.push(options.headers.get('X-XSRF-TOKEN'));
    if (mutation === 1) {
      return json(403, {error: 'Security token is missing or invalid.', code: 'CSRF_TOKEN_INVALID'});
    }
    return json(200, {authenticated: true});
  }});
  assert.deepEqual(await client.request('/api/v1/auth/sessions', {method: 'POST', body: '{}'}),
    {authenticated: true});
  assert.equal(bootstrap, 2);
  assert.equal(mutation, 2);
  assert.deepEqual(tokens, ['csrf-1', 'csrf-2']);
});

test('does not retry non-CSRF authorization failures', async () => {
  let calls = 0;
  const client = createApiClient({fetchImpl: async url => {
    calls += 1;
    if (url.endsWith('/csrf')) return json(200, {headerName: 'X-XSRF-TOKEN', token: 'csrf'});
    return json(403, {error: 'Verify your email.', code: 'EMAIL_NOT_VERIFIED'});
  }});
  await assert.rejects(
    client.request('/api/v1/auth/sessions', {method: 'POST', body: '{}'}),
    failure => failure instanceof ApiError
      && failure.status === 403 && failure.code === 'EMAIL_NOT_VERIFIED'
  );
  assert.equal(calls, 2);
});

test('returns structured HTTP failures', async () => {
  const client = createApiClient({fetchImpl: async () => json(429, {
    error: 'Slow down.', code: 'RATE_LIMITED', retryAfterSeconds: 30
  })});
  await assert.rejects(client.request('/api/v1/auth/me'), failure => {
    assert.equal(failure.name, 'ApiError');
    assert.equal(failure.status, 429);
    assert.equal(failure.code, 'RATE_LIMITED');
    assert.equal(failure.retryable, true);
    assert.equal(failure.payload.retryAfterSeconds, 30);
    assert.equal(failure.method, 'GET');
    assert.equal(failure.path, '/api/v1/auth/me');
    return true;
  });
});

test('aborts slow requests at the configured timeout', async () => {
  const fetchImpl = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), {once: true});
  });
  const client = createApiClient({fetchImpl, defaultTimeoutMs: 5});
  await assert.rejects(client.request('/api/v1/auth/me'), failure => {
    assert.equal(failure.code, 'REQUEST_TIMEOUT');
    assert.equal(failure.timedOut, true);
    assert.equal(failure.retryable, true);
    return true;
  });
});

test('does not set a JSON content type for file uploads', async () => {
  let headers;
  const client = createApiClient({fetchImpl: async (url, options) => {
    if (url.endsWith('/csrf')) return json(200, {headerName: 'X-XSRF-TOKEN', token: 'csrf'});
    headers = options.headers;
    return json(200, {stored: true});
  }});
  const body = new FormData();
  body.append('file', new Blob(['hello']), 'hello.txt');
  assert.deepEqual(await client.request('/api/v1/products/1/files', {method: 'POST', body}), {stored: true});
  assert.equal(headers.has('Content-Type'), false);
  assert.equal(headers.get('X-XSRF-TOKEN'), 'csrf');
});

test('rejects successful HTML and malformed JSON instead of accepting false auth success', async () => {
  const htmlClient = createApiClient({fetchImpl: async () => new Response('<html>fallback</html>', {
    status: 200, headers: {'Content-Type': 'text/html'}
  })});
  await assert.rejects(htmlClient.request('/api/v1/auth/me'), failure =>
    failure instanceof ApiError && failure.status === 200 && failure.code === 'INVALID_API_RESPONSE');

  const malformedClient = createApiClient({fetchImpl: async () => new Response('{not-json', {
    status: 200, headers: {'Content-Type': 'application/json'}
  })});
  await assert.rejects(malformedClient.request('/api/v1/auth/me'), failure =>
    failure instanceof ApiError && failure.status === 200 && failure.code === 'INVALID_API_RESPONSE');
});
