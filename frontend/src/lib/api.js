const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'unavailable' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function unwrap(payload, keys = []) {
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      if (payload[key] !== undefined) return payload[key];
    }
  }
  return payload;
}

function collection(payload, keys) {
  const first = unwrap(payload, ['data']);
  if (Array.isArray(first)) return first;
  if (first && typeof first === 'object') {
    for (const key of keys) if (Array.isArray(first[key])) return first[key];
  }
  const direct = unwrap(payload, keys);
  return Array.isArray(direct) ? direct : [];
}

async function apiRequest(path, options = {}) {
  const { headers, ...requestOptions } = options;
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...requestOptions,
      headers: { Accept: 'application/json', ...(headers || {}) }
    });
  } catch {
    throw new ApiError('Public data is not available right now.', { code: 'network' });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('Public data is not available right now.', { status: response.status, code: 'unavailable' });
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      body.error || (response.status === 404 ? 'This public record was not found.' : 'Public data is not available right now.'),
      { status: response.status, code: response.status === 404 ? 'not_found' : 'unavailable' }
    );
  }
  return body;
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const result = query.toString();
  return result ? `?${result}` : '';
}

export const publicApi = {
  async getPublicStats(options) {
    return unwrap(await apiRequest('/public/stats', options), ['data', 'stats']);
  },
  async search(term, options) {
    const payload = await apiRequest(`/public/search${queryString({ q: term })}`, options);
    return collection(payload, ['results', 'items']);
  },
  async getMdas(params = {}, options) {
    const payload = await apiRequest(`/public/mdas${queryString(params)}`, options);
    return { items: collection(payload, ['items', 'mdas']), total: payload?.meta?.total ?? payload?.total ?? payload?.data?.meta?.total, hasMore: Boolean(payload?.meta?.hasMore ?? payload?.hasMore ?? payload?.data?.meta?.hasMore ?? payload?.data?.hasMore) };
  },
  async getMdaBySlug(slug, options) {
    return unwrap(await apiRequest(`/public/mdas/${encodeURIComponent(slug)}`, options), ['data', 'mda']);
  },
  async getServicesForMda(slug, options) {
    const payload = await apiRequest(`/public/mdas/${encodeURIComponent(slug)}/services`, options);
    return collection(payload, ['items', 'services']);
  },
  async getServiceBySlug(slug, options) {
    return unwrap(await apiRequest(`/public/services/${encodeURIComponent(slug)}`, options), ['data', 'service']);
  },
  async getSources(params = {}, options) {
    const payload = await apiRequest(`/public/sources${queryString(params)}`, options);
    return collection(payload, ['items', 'sources']);
  }
};

export { apiBaseUrl, apiRequest };

