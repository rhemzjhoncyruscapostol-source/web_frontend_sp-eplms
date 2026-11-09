// Small fetch wrapper: adds the access token, and when it has expired quietly
// swaps the refresh token for a new pair and retries the request once.

const configuredBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const BASE = (() => {
  try {
    const configuredUrl = new URL(configuredBase, window.location.origin);
    if (configuredUrl.origin === 'https://web-sp-eplms.onrender.com') return '/api';
  } catch {
    // Keep the configured value so malformed URLs fail with the normal fetch error.
  }
  return configuredBase;
})();
const KEY = 'ormindoro.session';

let session = null;
try {
  session = JSON.parse(localStorage.getItem(KEY) || 'null');
} catch {
  session = null;
}

export const hasSession = () => Boolean(session && session.refresh);

export function saveTokens(tokens) {
  session = { access: tokens.access_token, refresh: tokens.refresh_token };
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage can be unavailable (private mode); the session then lasts until reload */
  }
}

export function clearTokens() {
  const old = session;
  session = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return old;
}

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

let refreshing = null;

async function refreshTokens() {
  if (!session || !session.refresh) return false;
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        saveTokens(data.tokens);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// Called when we cannot recover a session (set by AuthProvider).
let onSignedOut = () => {};
export const setSignedOutHandler = (fn) => {
  onSignedOut = fn;
};

async function request(path, { method = 'GET', body, auth = true, retry = true, blob = false } = {}) {
  const headers = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && session && session.access) headers.Authorization = `Bearer ${session.access}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0);
  }

  if (res.status === 401 && auth && retry && hasSession()) {
    if (await refreshTokens()) return request(path, { method, body, auth, retry: false, blob });
    clearTokens();
    onSignedOut();
  }

  if (res.ok && blob) return res.blob();

  const contentType = res.headers.get('content-type') || 'unknown content type';
  const responseText = await res.text();
  const trimmedResponse = responseText.trim();
  let data = null;
  try {
    data = trimmedResponse ? JSON.parse(trimmedResponse) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || `Something went wrong (${res.status}).`, res.status, data && data.errors);
  }
  if (data === null) {
    const responseKind = trimmedResponse === 'null' ? 'JSON null' : 'an empty or invalid JSON body';
    throw new ApiError(
      `The server returned ${responseKind} (HTTP ${res.status}, ${contentType}). Please retry; if it continues, share this message with support.`,
      res.status
    );
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body ?? {} }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body: body ?? {} }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body: body ?? {} }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  blob: (path) => request(path, { blob: true }),
};
