const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const MIN_PUBLIC_SEARCH_LENGTH = 2;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'unavailable' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const result = query.toString();
  return result ? `?${result}` : '';
}

function listItems(payload, keys) {
  const containers = [payload, payload?.data].filter(Boolean);
  for (const container of containers) {
    if (Array.isArray(container)) return container;
    for (const key of keys) if (Array.isArray(container[key])) return container[key];
  }
  return [];
}

function listMetadata(payload) {
  const containers = [payload, payload?.data].filter(Boolean);
  const metadata = containers.find((container) => container.pagination || container.meta) || {};
  const pagination = metadata.pagination || metadata.meta || {};
  return {
    pagination: metadata.pagination || pagination,
    page: pagination.page ?? metadata.page,
    pageSize: pagination.pageSize ?? metadata.pageSize,
    total: pagination.total ?? metadata.total,
    totalPages: pagination.totalPages ?? metadata.totalPages,
    hasMore: Boolean(pagination.hasMore ?? metadata.hasMore),
  };
}

function normalizeFeeOption(option = {}) {
  return {
    ...option,
    // The public API uses the schema's descriptive names; the existing fee
    // formatter also accepts these compact aliases for range values.
    minAmount: option.minAmount ?? option.minimumAmount,
    maxAmount: option.maxAmount ?? option.maximumAmount,
    verifiedDate: option.verifiedDate ?? option.verifiedAt,
    nextReviewDate: option.nextReviewDate ?? option.nextReviewAt,
  };
}

function normalizeSource(source = {}) {
  return {
    ...source,
    retrievedDate: source.retrievedDate ?? source.accessedAt,
  };
}

function normalizeService(service = {}) {
  const feeOptions = Array.isArray(service.feeOptions)
    ? service.feeOptions.map(normalizeFeeOption)
    : [];
  const sources = Array.isArray(service.sources) ? service.sources.map(normalizeSource) : [];
  const officialChannels = Array.isArray(service.officialChannels) ? service.officialChannels : [];
  const processSteps = service.processSteps ?? service.process ?? service.steps ?? [];

  return {
    ...service,
    feeOptions,
    sources,
    officialChannels,
    processSteps,
    procedure: processSteps,
    nextReviewDate: service.nextReviewDate ?? service.nextReviewAt,
  };
}

function normalizeSingle(payload, key) {
  if (payload?.[key] !== undefined) return payload[key];
  if (payload?.data?.[key] !== undefined) return payload.data[key];
  return payload?.data ?? payload;
}

function normalizeList(payload, keys, normalize = (item) => item) {
  const metadata = listMetadata(payload);
  return {
    items: listItems(payload, keys).map(normalize),
    ...metadata,
  };
}

async function apiRequest(path, options = {}) {
  const { headers, ...requestOptions } = options;
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...requestOptions,
      headers: { Accept: 'application/json', ...(headers || {}) },
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
      { status: response.status, code: response.status === 404 ? 'not_found' : 'unavailable' },
    );
  }
  return body;
}

export const publicApi = {
  async getPublicStats(options) {
    return normalizeSingle(await apiRequest('/public/stats', options), 'stats');
  },

  async searchPublic(query, options) {
    const term = String(query || '').trim();
    if (term.length < MIN_PUBLIC_SEARCH_LENGTH) return [];
    const payload = await apiRequest(`/public/search${queryString({ q: term })}`, options);
    return listItems(payload, ['results', 'items']);
  },

  async getMdas(params = {}, options) {
    return normalizeList(await apiRequest(`/public/mdas${queryString(params)}`, options), ['items', 'mdas']);
  },

  async getMdaBySlug(slug, options) {
    return normalizeSingle(await apiRequest(`/public/mdas/${encodeURIComponent(slug)}`, options), 'mda');
  },

  async getServicesForMda(slug, params = {}, options) {
    const payload = await apiRequest(`/public/mdas/${encodeURIComponent(slug)}/services${queryString(params)}`, options);
    return normalizeList(payload, ['items', 'services'], normalizeService);
  },

  async getServiceBySlug(slug, options) {
    return normalizeService(normalizeSingle(await apiRequest(`/public/services/${encodeURIComponent(slug)}`, options), 'service'));
  },

  async getSources(params = {}, options) {
    return normalizeList(await apiRequest(`/public/sources${queryString(params)}`, options), ['items', 'sources'], normalizeSource);
  },
};

// Keep the original name available for components outside the public pages.
publicApi.search = publicApi.searchPublic;

export { apiBaseUrl, apiRequest, MIN_PUBLIC_SEARCH_LENGTH, queryString };
