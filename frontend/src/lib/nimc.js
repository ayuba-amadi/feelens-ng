export const NIMC_CHARTER_OFFICIAL_URL = 'https://nimc-cms.idvault.co/storage/Uploads/nimc-service-charter-february-2026.pdf';
export const NIMC_CHARTER_HOSTED_URL = '/sources/nimc-service-charter-february-2026.pdf';
export const NIS_SLA_OFFICIAL_URL = 'https://immigration.gov.ng/wp-content/uploads/2026/04/SERVICE-LEVEL-AGREEMENT-2026_.pdf';
export const NIS_SLA_HOSTED_URL = '/sources/nis-service-level-agreement-2026.pdf';

export function isNimcCharterSource(source = {}) {
  const url = String(source.url || source.officialUrl || source.official_url || '').toLowerCase();
  const title = String(source.title || source.name || '').toLowerCase();
  return url === NIMC_CHARTER_OFFICIAL_URL.toLowerCase()
    || url.endsWith(NIMC_CHARTER_HOSTED_URL.toLowerCase())
    || title.includes('nimc service charter')
    || title.includes('nimc service level agreement');
}

export function nimcPdfPage(source = {}) {
  const reference = String(source.pageOrSection || source.page_or_section || source.documentReference || source.document_reference || '');
  const match = reference.match(/PDF\s+(?:page|p\.?)\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function nimcPrintedPage(source = {}) {
  const reference = String(source.pageOrSection || source.page_or_section || source.documentReference || source.document_reference || '');
  const match = reference.match(/Printed\s+(?:page|p\.?)\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function nimcSectionLabel(source = {}) {
  const reference = String(source.pageOrSection || source.page_or_section || source.documentReference || source.document_reference || '');
  const match = reference.match(/Section\s+([^·;]+)/i);
  return match ? match[1].trim() : null;
}

export function nimcViewerHref(source = {}) {
  if (!isNimcCharterSource(source)) return null;
  const page = nimcPdfPage(source);
  return `/sources/nimc-service-charter${page ? `?page=${page}` : ''}`;
}

export function isNisSlaSource(source = {}) {
  return source.url === NIS_SLA_OFFICIAL_URL || String(source.title || '').toLowerCase().includes('nis service level agreement');
}

export function nisPdfPage(source = {}) {
  const reference = String(source.pageOrSection || source.page_or_section || '');
  const match = reference.match(/PDF\s+p+p?\.?\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function nisViewerHref(source = {}) {
  if (!isNisSlaSource(source)) return null;
  const page = nisPdfPage(source);
  return `/sources/nis-service-level-agreement${page ? `?page=${page}` : ''}`;
}
