import { PUBLICATION_STATUSES, VERIFICATION_STATUSES } from '../domain/constants.js'

export const getServiceBySlug = (services, slug) => services.find((service) => service.slug === slug)
export const getAgencyById = (agencies, id) => agencies.find((agency) => agency.id === id)
export const getAgencyBySlug = (agencies, slug) => agencies.find((agency) => agency.slug === slug)
export const getServicesByAgency = (services, agencyId) => services.filter((service) => service.agencyId === agencyId)
export const getSourcesForFeeOption = (feeOption, sources) => sources.filter((source) => feeOption.evidenceSourceIds?.includes(source.id))

export function getSourcesForService(service, sources) {
  const sourceIds = new Set()
  service?.feeOptions?.forEach((feeOption) => feeOption.evidenceSourceIds?.forEach((sourceId) => sourceIds.add(sourceId)))
  service?.requirements?.forEach((requirement) => requirement.evidenceSourceIds?.forEach((sourceId) => sourceIds.add(sourceId)))
  service?.processSteps?.forEach((step) => step.evidenceSourceIds?.forEach((sourceId) => sourceIds.add(sourceId)))
  service?.officialChannels?.forEach((channel) => channel.evidenceSourceIds?.forEach((sourceId) => sourceIds.add(sourceId)))
  return sources.filter((source) => sourceIds.has(source.id))
}

export function getServiceVerificationStatus(service) {
  const feeOptions = service?.feeOptions ?? []
  if (service?.publicationStatus === PUBLICATION_STATUSES.CONFLICTING || feeOptions.some((feeOption) => feeOption.publicationStatus === PUBLICATION_STATUSES.CONFLICTING || feeOption.verificationStatus === VERIFICATION_STATUSES.DISPUTED)) return VERIFICATION_STATUSES.DISPUTED
  if (feeOptions.some((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.SUPERSEDED)) return VERIFICATION_STATUSES.SUPERSEDED
  if (feeOptions.some((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.UNABLE_TO_VERIFY)) return VERIFICATION_STATUSES.UNABLE_TO_VERIFY
  if (feeOptions.some((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.PENDING)) return VERIFICATION_STATUSES.PENDING
  if (feeOptions.length > 0 && feeOptions.every((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.VERIFIED)) return VERIFICATION_STATUSES.VERIFIED
  return service?.verification?.status ?? VERIFICATION_STATUSES.UNABLE_TO_VERIFY
}
