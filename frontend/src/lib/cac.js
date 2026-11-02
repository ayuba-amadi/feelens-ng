export const CAC_FEATURED_GROUPS = [
  {
    key: 'registration',
    label: 'Registration',
    slugs: [
      'business-name-registration-ctc-registration-documents',
      'company-with-share-capital-small-private-other-than-small',
      'cac-007-incorporation-of-incorporated-trustees',
      'cac-008-registration-of-limited-partnership',
      'cac-009-registration-of-limited-liability-partnership',
    ],
  },
  {
    key: 'change_of_name',
    label: 'Change of Name',
    slugs: [
      'cac-010-change-of-name-business-name',
      'cac-011-change-of-name-company',
      'cac-012-change-of-name-incorporated-trustees',
      'cac-013-change-of-name-limited-partnership',
      'cac-014-change-of-name-limited-liability-partnership',
    ],
  },
];

export function groupCacServices(services = []) {
  const featuredGroups = CAC_FEATURED_GROUPS.map((group) => ({
    ...group,
    services: services.filter((service) => (
      service.catalogueGroup === group.key
      && group.slugs.includes(service.slug)
    )),
  }));
  const featuredSlugs = new Set(featuredGroups.flatMap((group) => group.services.map((service) => service.slug)));
  const otherServices = services.filter((service) => !featuredSlugs.has(service.slug));
  return { featuredGroups, otherServices };
}

export function isCacCompanyRegistration(slug) {
  return slug === 'company-with-share-capital-small-private-other-than-small';
}

export function isCacBusinessNameRegistration(slug) {
  return slug === 'business-name-registration-ctc-registration-documents';
}

export function isCacCompanyNameChange(slug) {
  return slug === 'cac-011-change-of-name-company';
}

export function cacFeaturedCardFee(slug) {
  if (isCacBusinessNameRegistration(slug)) return { label: '₦20,000', detail: 'Official CAC registration fee.' };
  if (isCacCompanyRegistration(slug)) return { label: 'Share-capital formula', detail: '₦10,000 or ₦20,000 per ₦1,000,000 or part thereof.' };
  if (isCacCompanyNameChange(slug)) return { label: '3 fee options', detail: 'Small ₦10,000 · Other ₦20,000 · Public ₦50,000.' };
  return null;
}

export function cacCompanyChangeFeeOptions() {
  return [
    { label: 'Small Company', amount: 10_000, conditions: 'Applies to Small Companies.' },
    { label: 'Company other than Small Company and LTD/GTE', amount: 20_000, conditions: 'Applies to a Company other than Small Company and LTD/GTE.' },
    { label: 'Public Company', amount: 50_000, conditions: 'Applies to Public Companies.' },
  ];
}
