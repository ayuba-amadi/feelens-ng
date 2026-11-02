export const NIMC_CHARTER_OFFICIAL_URL = 'https://nimc-cms.idvault.co/storage/Uploads/nimc-service-charter-february-2026.pdf';
export const NIMC_CHARTER_HOSTED_URL = '/sources/nimc-service-charter-february-2026.pdf';
export const NIS_SLA_OFFICIAL_URL = 'https://immigration.gov.ng/wp-content/uploads/2026/04/SERVICE-LEVEL-AGREEMENT-2026_.pdf';
export const NIS_SLA_HOSTED_URL = '/sources/nis-service-level-agreement-2026.pdf';

export const NIMC_CANONICAL_SERVICE_ORDER = [
  'nimc-date-of-birth-modification',
  'nimc-other-information-modification',
  'nimc-diaspora-regular-enrolment-adult-africa',
  'nimc-diaspora-regular-enrolment-child-africa',
  'nimc-diaspora-child-to-adult-migration-africa',
  'nimc-diaspora-regular-slip-reissue-africa',
  'nimc-diaspora-regular-dob-africa',
  'nimc-diaspora-regular-other-fields-africa',
  'nimc-diaspora-premium-enrolment-adult-africa',
  'nimc-diaspora-premium-enrolment-child-africa',
  'nimc-diaspora-premium-child-to-adult-africa',
  'nimc-diaspora-premium-slip-reissue-africa',
  'nimc-diaspora-premium-gmpc-africa',
  'nimc-diaspora-premium-dob-africa',
  'nimc-diaspora-premium-other-fields-africa',
  'nimc-diaspora-regular-enrolment-adult-non-africa',
  'nimc-diaspora-regular-enrolment-child-non-africa',
  'nimc-diaspora-child-to-adult-non-africa',
  'nimc-diaspora-regular-slip-reissue-non-africa',
  'nimc-diaspora-regular-gmpc-non-africa',
];

export const NIMC_CATEGORY_DEFINITIONS = [
  {
    key: 'within-nigeria-regular-modification',
    navGroup: 'within-nigeria',
    superHeading: null,
    jurisdiction: 'Within Nigeria',
    category: 'Regular Modification Services',
    section: '12.5',
    printedPage: 28,
    pdfPage: 31,
  },
  {
    key: 'africa-regular-enrolment',
    navGroup: 'african-countries',
    superHeading: 'Diaspora Services',
    jurisdiction: 'African Countries',
    category: 'Regular Enrolment',
    section: '13.1',
    printedPage: 29,
    pdfPage: 32,
  },
  {
    key: 'africa-regular-modification',
    navGroup: 'african-countries',
    superHeading: 'Diaspora Services',
    jurisdiction: 'African Countries',
    category: 'Regular Modification',
    section: '13.2',
    printedPage: 29,
    pdfPage: 32,
  },
  {
    key: 'africa-premium-enrolment',
    navGroup: 'african-countries',
    superHeading: 'Diaspora Services',
    jurisdiction: 'African Countries',
    category: 'Premium Enrolment',
    section: '14.0',
    printedPage: 30,
    pdfPage: 33,
  },
  {
    key: 'africa-premium-modification',
    navGroup: 'african-countries',
    superHeading: 'Diaspora Services',
    jurisdiction: 'African Countries',
    category: 'Premium Modification',
    section: '14.1',
    printedPage: 30,
    pdfPage: 33,
  },
  {
    key: 'non-africa-regular-enrolment',
    navGroup: 'non-african-countries',
    superHeading: 'Diaspora Services',
    jurisdiction: 'Non-African Countries',
    category: 'Regular Enrolment',
    section: '15.0',
    printedPage: 31,
    pdfPage: 34,
  },
];

export const NIMC_NAVIGATION_FILTERS = [
  { key: 'all', label: 'All services' },
  { key: 'within-nigeria', label: 'Within Nigeria', jurisdiction: 'Within Nigeria' },
  { key: 'african-countries', label: 'African Countries', jurisdiction: 'African Countries' },
  { key: 'non-african-countries', label: 'Non-African Countries', jurisdiction: 'Non-African Countries' },
];

export function sortNimcServices(services = []) {
  const orderMap = new Map(NIMC_CANONICAL_SERVICE_ORDER.map((slug, index) => [slug, index]));
  return [...services].sort((left, right) => {
    const leftSlug = String(left?.slug || '');
    const rightSlug = String(right?.slug || '');
    const leftIndex = orderMap.has(leftSlug) ? orderMap.get(leftSlug) : 999;
    const rightIndex = orderMap.has(rightSlug) ? orderMap.get(rightSlug) : 999;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return String(left?.name || '').localeCompare(String(right?.name || ''));
  });
}

export function groupNimcServices(services = [], navFilter = 'all') {
  const sorted = sortNimcServices(services);
  const filteredDefs = navFilter === 'all'
    ? NIMC_CATEGORY_DEFINITIONS
    : NIMC_CATEGORY_DEFINITIONS.filter((def) => def.navGroup === navFilter);

  const sections = [];
  for (const def of filteredDefs) {
    const matching = sorted.filter(
      (service) =>
        String(service?.jurisdiction || '').toLowerCase() === def.jurisdiction.toLowerCase()
        && String(service?.category || '').toLowerCase() === def.category.toLowerCase(),
    );
    if (matching.length > 0) {
      sections.push({
        ...def,
        services: matching,
      });
    }
  }
  return sections;
}

export function isNimcCharterSource(source = {}) {
  const url = String(source.url || source.officialUrl || source.official_url || '').toLowerCase().split('#')[0];
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
