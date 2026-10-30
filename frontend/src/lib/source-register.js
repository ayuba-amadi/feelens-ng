export function sourceRows(items) {
  return items.map((source, index) => {
    const associations = Array.isArray(source.associations) ? source.associations : [];
    const services = new Map();
    const mdas = new Map();
    const statuses = new Set();
    for (const association of associations) {
      if (association.mdaSlug && association.mdaName) mdas.set(association.mdaSlug, association.mdaName);
      if (association.mdaSlug && association.serviceSlug && association.serviceName) {
        services.set(`${association.mdaSlug}/${association.serviceSlug}`, association);
      }
      if (association.verificationStatus) statuses.add(association.verificationStatus);
    }
    return { ...source, key: index, mdas: [...mdas].map(([slug, name]) => ({ slug, name })), services: [...services.values()], statuses: [...statuses] };
  });
}

export function filterSources(sources, { query = '', mda = '', sourceType = '', tier = '', status = '' }) {
  const needle = query.trim().toLowerCase();
  return sources.filter((source) => {
    const searchable = [source.title, source.publisher, source.url, ...source.mdas.map((item) => item.name), ...source.services.map((item) => item.serviceName)].filter(Boolean).join(' ').toLowerCase();
    return (!needle || searchable.includes(needle))
      && (!mda || source.mdas.some((item) => item.slug === mda))
      && (!sourceType || source.sourceType === sourceType)
      && (!tier || String(source.evidenceTier || '') === tier)
      && (!status || source.statuses.includes(status));
  });
}
