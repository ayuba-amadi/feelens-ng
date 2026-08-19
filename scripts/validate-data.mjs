import { agencies } from '../src/data/agencies.js'
import { sources } from '../src/data/sources.js'
import { services } from '../src/data/services.js'
import { validateDataset } from '../src/utils/validateFeeLensData.js'
import { canBeMarkedVerified } from '../src/domain/verificationPolicy.js'
import { PRICING_MODELS, VERIFICATION_STATUSES } from '../src/domain/constants.js'
import { getDatasetMetrics } from '../src/utils/dataMetrics.js'

const validation = validateDataset({ agencies, sources, services })
const feeOptions = services.flatMap((service) => service.feeOptions)
const verifiedFeeOptions = feeOptions.filter((feeOption) => feeOption.verificationStatus === VERIFICATION_STATUSES.VERIFIED)
const checks = []
const assertCheck = (condition, message) => { if (!condition) checks.push(message) }

assertCheck(verifiedFeeOptions.every((feeOption) => canBeMarkedVerified(feeOption, sources)), 'Every verified fee option must pass the verification policy.')
const dobService = services.find((service) => service.id === 'nimc-dob-modification')
assertCheck(dobService?.feeOptions.every((feeOption) => !canBeMarkedVerified(feeOption, sources)), 'NIMC date-of-birth conflict must not pass as verified.')
assertCheck(feeOptions.filter((feeOption) => feeOption.pricingModel === PRICING_MODELS.FREE).every((feeOption) => feeOption.amount === 0), 'Every FREE fee option must have amount 0.')
assertCheck(feeOptions.filter((feeOption) => feeOption.currency === 'USD').every((feeOption) => feeOption.currency === 'USD'), 'USD fee options must remain denominated in USD.')
const jambUtme = services.find((service) => service.id === 'jamb-utme-registration')
assertCheck(jambUtme?.feeOptions.some((feeOption) => feeOption.label === 'Government/service fee') && jambUtme?.feeOptions.some((feeOption) => feeOption.label === 'CBT service charge'), 'JAMB government and CBT charges must remain separate fee options.')
assertCheck(sources.filter((source) => source.recordType === 'production').every((source) => typeof source.url === 'string' && source.url.length > 0), 'Production evidence sources must have authoritative URLs.')
const newCoverageAgencyIds = new Set(['cac', 'nafdac', 'fct-development-control', 'fct-doas', 'fct-transportation-secretariat', 'fct-water-board'])
const newCoverageFees = services.filter((service) => newCoverageAgencyIds.has(service.agencyId)).flatMap((service) => service.feeOptions)
assertCheck(newCoverageFees.filter((feeOption) => feeOption.pricingModel === PRICING_MODELS.UNKNOWN).every((feeOption) => feeOption.amount === null), 'Unknown publication-gap fee options must keep amount null.')
assertCheck(services.filter((service) => service.agencyId === 'cac').flatMap((service) => service.feeOptions).every((feeOption) => feeOption.amount === null), 'CAC legacy amounts must not be present in the current dataset.')
assertCheck(services.filter((service) => ['fct-development-control', 'fct-doas', 'fct-transportation-secretariat', 'fct-water-board'].includes(service.agencyId)).flatMap((service) => service.feeOptions).every((feeOption) => feeOption.amount === null), 'Milestone 3B gap institutions must not have unprovided numeric fee amounts.')

if (!validation.valid || checks.length > 0) {
  console.error('FeeLens data validation failed.')
  validation.errors.forEach(({ path, code, message }) => console.error(`${path} [${code}] ${message}`))
  checks.forEach((message) => console.error(`check [integrity] ${message}`))
  process.exitCode = 1
} else {
  const metrics = getDatasetMetrics({ agencies, sources, services })
  console.log(`FeeLens data validation passed: ${metrics.totalInstitutions} agencies, ${sources.length} sources, ${metrics.totalServices} services, ${metrics.totalFeeOptions} fee options.`)
  console.log(`Verified: ${metrics.verifiedFeeOptions}; pending: ${metrics.pendingFeeOptions}; conflicting: ${metrics.conflictingFeeOptions}; unable-to-verify: ${metrics.unableToVerifyFeeOptions}; not-located: ${metrics.notLocatedFeeOptions}.`)
}
