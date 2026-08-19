import { SOURCE_TYPES, VERIFICATION_STATUSES } from './constants.js'
import { validateFeeOption } from '../utils/validateFeeLensData.js'

const officialSourceTypes = new Set(Object.values(SOURCE_TYPES))

export function canBeMarkedVerified(feeOption, sources = []) {
  const validation = validateFeeOption(feeOption, sources)
  if (!validation.valid || feeOption.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) return false
  return feeOption.evidenceSourceIds.some((sourceId) => {
    const source = sources.find((candidate) => candidate.id === sourceId)
    return source && source.active === true && source.recordType === 'production' && typeof source.url === 'string' && source.url.trim() !== '' && officialSourceTypes.has(source.sourceType)
  })
}

export function getVerificationLabel(status) {
  const labels = {
    [VERIFICATION_STATUSES.VERIFIED]: 'Verified from official source',
    [VERIFICATION_STATUSES.PENDING]: 'Official schedule identified — verification pending',
    [VERIFICATION_STATUSES.UNABLE_TO_VERIFY]: 'Unable to verify from current public sources',
    [VERIFICATION_STATUSES.DISPUTED]: 'Conflicting official information',
    [VERIFICATION_STATUSES.SUPERSEDED]: 'Superseded official information',
  }
  return labels[status] ?? 'Unknown verification status'
}

export function getPublicationLabel(status) {
  const labels = {
    published: 'Published',
    not_located: 'Official amount not publicly located',
    conflicting: 'Conflicting official information',
    superseded: 'Superseded official information',
  }
  return labels[status] ?? 'Unknown publication status'
}
