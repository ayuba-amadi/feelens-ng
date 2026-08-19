import { PUBLICATION_STATUSES, VERIFICATION_STATUSES } from '../domain/constants.js'

const getFeeOptions = (services) => services.flatMap((service) => service.feeOptions ?? [])

export function getDatasetMetrics({ agencies = [], sources = [], services = [] } = {}) {
  const feeOptions = getFeeOptions(services)
  return {
    totalInstitutions: agencies.length,
    totalServices: services.length,
    totalFeeOptions: feeOptions.length,
    verifiedFeeOptions: feeOptions.filter((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.VERIFIED).length,
    conflictingFeeOptions: feeOptions.filter((feeOption) => feeOption.publicationStatus === PUBLICATION_STATUSES.CONFLICTING).length,
    pendingFeeOptions: feeOptions.filter((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.PENDING).length,
    unableToVerifyFeeOptions: feeOptions.filter((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.UNABLE_TO_VERIFY).length,
    notLocatedFeeOptions: feeOptions.filter((feeOption) => feeOption.publicationStatus === PUBLICATION_STATUSES.NOT_LOCATED).length,
    servicesWithScheduleReferencedNotIngested: services.filter((service) => service.feeOptions?.some((feeOption) => feeOption.pricingModel === 'unknown' && feeOption.publicationStatus === PUBLICATION_STATUSES.PUBLISHED && feeOption.verificationStatus === VERIFICATION_STATUSES.PENDING)).length,
    servicesWithPublicFeeAmountNotLocated: services.filter((service) => service.feeOptions?.some((feeOption) => feeOption.publicationStatus === PUBLICATION_STATUSES.NOT_LOCATED)).length,
    sourceCount: sources.length,
  }
}

export function getAgencyCoverage(agency, services = [], sources = []) {
  const agencyServices = services.filter((service) => service.agencyId === agency.id)
  const feeOptions = getFeeOptions(agencyServices)
  const sourceIds = new Set()
  agencyServices.forEach((service) => {
    service.feeOptions?.forEach((feeOption) => feeOption.evidenceSourceIds?.forEach((sourceId) => sourceIds.add(sourceId)))
    service.officialChannels?.forEach((channel) => channel.evidenceSourceIds?.forEach((sourceId) => sourceIds.add(sourceId)))
  })
  return {
    institution: agency.name,
    jurisdiction: agency.jurisdiction,
    services: agencyServices.length,
    verifiedFeeOptions: feeOptions.filter((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.VERIFIED).length,
    pendingFeeOptions: feeOptions.filter((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.PENDING).length,
    conflictingFeeOptions: feeOptions.filter((feeOption) => feeOption.publicationStatus === PUBLICATION_STATUSES.CONFLICTING).length,
    notLocatedFeeOptions: feeOptions.filter((feeOption) => feeOption.publicationStatus === PUBLICATION_STATUSES.NOT_LOCATED).length,
    primarySourceCoverage: [...sourceIds].filter((sourceId) => sources.some((source) => source.id === sourceId)).length,
  }
}
