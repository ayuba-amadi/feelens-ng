import { ApiError, apiBaseUrl } from './api';

let csrfToken = null;

function setCsrfToken(token) {
  csrfToken = token || null;
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

async function adminRequest(path, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(options.headers || {}),
  };
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...options,
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('The administration service is unavailable.', { code: 'network' });
  }

  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      setCsrfToken(null);
      window.dispatchEvent(new CustomEvent('feelens:session-expired'));
    }
    const error = new ApiError(body?.error || 'The request could not be completed.', {
      status: response.status,
      code: response.status === 401 ? 'unauthenticated' : 'request_failed',
    });
    error.details = body?.details || [];
    throw error;
  }
  if (body?.csrfToken) setCsrfToken(body.csrfToken);
  return body;
}

function collection(resource) {
  return {
    list: (params = {}) => adminRequest(`/admin/${resource}${queryString(params)}`),
    get: (id) => adminRequest(`/admin/${resource}/${encodeURIComponent(id)}`),
    create: (body) => adminRequest(`/admin/${resource}`, { method: 'POST', body }),
    update: (id, body) => adminRequest(`/admin/${resource}/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  };
}

export const adminApi = {
  async session() {
    const result = await adminRequest('/auth/session');
    setCsrfToken(result.csrfToken);
    return result;
  },
  async login(credentials) {
    const result = await adminRequest('/auth/login', { method: 'POST', body: credentials });
    setCsrfToken(result.csrfToken);
    return result;
  },
  async logout() {
    const result = await adminRequest('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    return result;
  },
  dashboard: () => adminRequest('/admin/dashboard'),
  mdas: collection('mdas'),
  services: collection('services'),
  fees: collection('fees'),
  sources: collection('sources'),
  channels: collection('channels'),
  foi: collection('foi'),
  users: collection('users'),
  verifications: {
    list: (params = {}) => adminRequest(`/admin/verifications${queryString(params)}`),
    create: (body) => adminRequest('/admin/verifications', { method: 'POST', body }),
  },
  auditLogs: (params = {}) => adminRequest(`/admin/audit-logs${queryString(params)}`),
  linkFeeSource: (feeId, body) => adminRequest(`/admin/fees/${feeId}/sources`, { method: 'POST', body }),
  unlinkFeeSource: (feeId, sourceId) => adminRequest(`/admin/fees/${feeId}/sources/${sourceId}`, { method: 'DELETE' }),
  supersedeFee: (feeId, body) => adminRequest(`/admin/fees/${feeId}/supersede`, { method: 'POST', body }),
  account: () => adminRequest('/admin/account'),
  updateAccount: (body) => adminRequest('/admin/account', { method: 'PATCH', body }),
  changePassword: (body) => adminRequest('/admin/account/password', { method: 'POST', body }),
};

export { adminRequest, setCsrfToken };
