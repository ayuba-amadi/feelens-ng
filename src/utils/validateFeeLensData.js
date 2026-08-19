import {
  ALL_ENUMS,
  CHARGE_CLASSES,
  PRICING_MODELS,
} from '../domain/constants.js'

const valuesOf = (enumObject) => Object.values(enumObject)
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const result = (errors = []) => ({ valid: errors.length === 0, errors })
const error = (path, code, message) => ({ path, code, message })

const required = (record, fields, path, errors) => {
  fields.forEach((field) => {
    if (!record || !Object.prototype.hasOwnProperty.call(record, field)) {
      errors.push(error(`${path}.${field}`, 'required', `${field} is required.`))
    }
  })
}

const checkEnum = (value, enumObject, path, errors) => {
  if (!valuesOf(enumObject).includes(value)) {
    errors.push(error(path, 'invalid_enum', `${path} must be one of: ${valuesOf(enumObject).join(', ')}.`))
  }
}

const checkSourceReferences = (sourceIds, sources, path, errors) => {
  if (!Array.isArray(sourceIds)) {
    errors.push(error(path, 'invalid_array', `${path} must be an array.`))
    return
  }
  if (Array.isArray(sources)) {
    const sourceIdsSet = new Set(sources.map((source) => source.id))
    sourceIds.forEach((sourceId, index) => {
      if (!sourceIdsSet.has(sourceId)) errors.push(error(`${path}[${index}]`, 'missing_reference', `Evidence source ${sourceId} does not exist.`))
    })
  }
}

export function validateAgency(agency) {
  const errors = []
  if (!isObject(agency)) return result([error('agency', 'invalid_record', 'Agency must be an object.')])
  required(agency, ['id', 'slug', 'name', 'jurisdiction', 'active', 'recordType'], 'agency', errors)
  if (agency.jurisdiction !== undefined) checkEnum(agency.jurisdiction, ALL_ENUMS.JURISDICTIONS, 'agency.jurisdiction', errors)
  if (agency.recordType !== undefined) checkEnum(agency.recordType, ALL_ENUMS.RECORD_TYPES, 'agency.recordType', errors)
  if (agency.recordType === ALL_ENUMS.RECORD_TYPES.PRODUCTION && !agency.officialWebsite) errors.push(error('agency.officialWebsite', 'production_website_required', 'Production agencies require their authoritative officialWebsite.'))
  if (agency.officialWebsite !== null && agency.officialWebsite !== undefined && typeof agency.officialWebsite !== 'string') errors.push(error('agency.officialWebsite', 'invalid_type', 'officialWebsite must be a URL string or null.'))
  return result(errors)
}

export function validateSource(source) {
  const errors = []
  if (!isObject(source)) return result([error('source', 'invalid_record', 'Source must be an object.')])
  required(source, ['id', 'title', 'sourceType', 'jurisdiction', 'active', 'recordType'], 'source', errors)
  if (source.sourceType !== undefined) checkEnum(source.sourceType, ALL_ENUMS.SOURCE_TYPES, 'source.sourceType', errors)
  if (source.jurisdiction !== undefined) checkEnum(source.jurisdiction, ALL_ENUMS.JURISDICTIONS, 'source.jurisdiction', errors)
  if (source.recordType !== undefined) checkEnum(source.recordType, ALL_ENUMS.RECORD_TYPES, 'source.recordType', errors)
  if (source.recordType === ALL_ENUMS.RECORD_TYPES.PRODUCTION && !source.url) errors.push(error('source.url', 'production_url_required', 'Production sources require an authoritative URL.'))
  if (source.url !== null && source.url !== undefined && typeof source.url !== 'string') errors.push(error('source.url', 'invalid_type', 'url must be a URL string or null.'))
  return result(errors)
}

export function validateFeeOption(feeOption, sources = null) {
  const errors = []
  if (!isObject(feeOption)) return result([error('feeOption', 'invalid_record', 'Fee option must be an object.')])
  required(feeOption, ['id', 'label', 'chargeClass', 'pricingModel', 'currency', 'amount', 'evidenceSourceIds', 'publicationStatus', 'verificationStatus'], 'feeOption', errors)
  if (feeOption.chargeClass !== undefined) checkEnum(feeOption.chargeClass, ALL_ENUMS.CHARGE_CLASSES, 'feeOption.chargeClass', errors)
  if (feeOption.pricingModel !== undefined) checkEnum(feeOption.pricingModel, ALL_ENUMS.PRICING_MODELS, 'feeOption.pricingModel', errors)
  if (feeOption.publicationStatus !== undefined) checkEnum(feeOption.publicationStatus, ALL_ENUMS.PUBLICATION_STATUSES, 'feeOption.publicationStatus', errors)
  if (feeOption.verificationStatus !== undefined) checkEnum(feeOption.verificationStatus, ALL_ENUMS.VERIFICATION_STATUSES, 'feeOption.verificationStatus', errors)
  checkSourceReferences(feeOption.evidenceSourceIds, sources, 'feeOption.evidenceSourceIds', errors)

  switch (feeOption.pricingModel) {
    case PRICING_MODELS.FIXED:
      if (!isFiniteNumber(feeOption.amount)) errors.push(error('feeOption.amount', 'fixed_amount_required', 'FIXED fee options require a numeric amount.'))
      if (feeOption.minAmount !== null || feeOption.maxAmount !== null) errors.push(error('feeOption', 'fixed_range_fields', 'FIXED fee options must use null minAmount and maxAmount.'))
      break
    case PRICING_MODELS.FREE:
      if (feeOption.amount !== 0) errors.push(error('feeOption.amount', 'free_amount_invalid', 'FREE fee options must have amount 0.'))
      break
    case PRICING_MODELS.RANGE:
      if (!isFiniteNumber(feeOption.minAmount) || !isFiniteNumber(feeOption.maxAmount) || feeOption.maxAmount < feeOption.minAmount) errors.push(error('feeOption', 'range_invalid', 'RANGE fee options require numeric min/max amounts with maxAmount at least minAmount.'))
      break
    case PRICING_MODELS.PERCENTAGE:
      if (!isFiniteNumber(feeOption.percentageRate)) errors.push(error('feeOption.percentageRate', 'percentage_rate_required', 'PERCENTAGE fee options require a numeric percentageRate.'))
      break
    case PRICING_MODELS.FORMULA:
      if (typeof feeOption.formulaDescription !== 'string' || feeOption.formulaDescription.trim() === '') errors.push(error('feeOption.formulaDescription', 'formula_required', 'FORMULA fee options require formulaDescription.'))
      break
    case PRICING_MODELS.VARIABLE:
    case PRICING_MODELS.UNKNOWN:
      if (feeOption.amount !== null) errors.push(error('feeOption.amount', 'amount_must_be_null', `${feeOption.pricingModel.toUpperCase()} fee options must have a null amount.`))
      break
    default:
      break
  }

  if (feeOption.verificationStatus === ALL_ENUMS.VERIFICATION_STATUSES.VERIFIED && (!Array.isArray(feeOption.evidenceSourceIds) || feeOption.evidenceSourceIds.length === 0)) errors.push(error('feeOption.evidenceSourceIds', 'verified_evidence_required', 'VERIFIED fee options require at least one evidence source.'))
  if (feeOption.verificationStatus === ALL_ENUMS.VERIFICATION_STATUSES.VERIFIED && Array.isArray(sources) && Array.isArray(feeOption.evidenceSourceIds)) feeOption.evidenceSourceIds.forEach((sourceId) => {
    const source = sources.find((candidate) => candidate.id === sourceId)
    if (source && (source.recordType !== ALL_ENUMS.RECORD_TYPES.PRODUCTION || source.active !== true || typeof source.url !== 'string' || source.url.trim() === '')) errors.push(error(`feeOption.evidenceSourceIds`, 'invalid_verified_evidence', 'Verified fee options must reference active production sources with authoritative URLs.'))
  })
  return result(errors)
}

export function validateService(service, agencies = null, sources = null) {
  const errors = []
  if (!isObject(service)) return result([error('service', 'invalid_record', 'Service must be an object.')])
  required(service, ['id', 'slug', 'name', 'agencyId', 'jurisdiction', 'category', 'feeOptions', 'requirements', 'processSteps', 'officialChannels', 'publicationStatus', 'verification', 'createdAt', 'updatedAt', 'recordType'], 'service', errors)
  if (service.jurisdiction !== undefined) checkEnum(service.jurisdiction, ALL_ENUMS.JURISDICTIONS, 'service.jurisdiction', errors)
  if (service.category !== undefined) checkEnum(service.category, ALL_ENUMS.SERVICE_CATEGORIES, 'service.category', errors)
  if (service.recordType !== undefined) checkEnum(service.recordType, ALL_ENUMS.RECORD_TYPES, 'service.recordType', errors)
  if (!Array.isArray(service.userTypes)) errors.push(error('service.userTypes', 'invalid_array', 'userTypes must be an array.'))
  else service.userTypes.forEach((type, index) => checkEnum(type, ALL_ENUMS.USER_TYPES, `service.userTypes[${index}]`, errors))
  if (Array.isArray(agencies) && !agencies.some((agency) => agency.id === service.agencyId)) errors.push(error('service.agencyId', 'missing_reference', `Agency ${service.agencyId} does not exist.`))
  if (!Array.isArray(service.feeOptions)) errors.push(error('service.feeOptions', 'invalid_array', 'feeOptions must be an array.'))
  else service.feeOptions.forEach((feeOption, index) => validateFeeOption(feeOption, sources).errors.forEach((item) => errors.push({ ...item, path: `service.feeOptions[${index}].${item.path.replace('feeOption.', '')}` })))
  if (!Array.isArray(service.requirements)) errors.push(error('service.requirements', 'invalid_array', 'requirements must be an array.'))
  else service.requirements.forEach((requirement, index) => { required(requirement, ['id', 'text', 'mandatory', 'evidenceSourceIds'], `service.requirements[${index}]`, errors); checkSourceReferences(requirement?.evidenceSourceIds, sources, `service.requirements[${index}].evidenceSourceIds`, errors) })
  if (!Array.isArray(service.processSteps)) errors.push(error('service.processSteps', 'invalid_array', 'processSteps must be an array.'))
  else service.processSteps.forEach((step, index) => { required(step, ['step', 'title', 'description', 'evidenceSourceIds'], `service.processSteps[${index}]`, errors); checkSourceReferences(step?.evidenceSourceIds, sources, `service.processSteps[${index}].evidenceSourceIds`, errors) })
  if (!Array.isArray(service.officialChannels)) errors.push(error('service.officialChannels', 'invalid_array', 'officialChannels must be an array.'))
  else service.officialChannels.forEach((channel, index) => { required(channel, ['type', 'label', 'url', 'description', 'evidenceSourceIds'], `service.officialChannels[${index}]`, errors); if (channel?.type !== undefined) checkEnum(channel.type, ALL_ENUMS.CHANNEL_TYPES, `service.officialChannels[${index}].type`, errors); checkSourceReferences(channel?.evidenceSourceIds, sources, `service.officialChannels[${index}].evidenceSourceIds`, errors) })
  if (service.verification && service.verification.status !== undefined) checkEnum(service.verification.status, ALL_ENUMS.VERIFICATION_STATUSES, 'service.verification.status', errors)
  return result(errors)
}

const duplicateIdErrors = (records, collectionName) => {
  const seen = new Set()
  const errors = []
  records.forEach((record, index) => {
    if (seen.has(record?.id)) errors.push(error(`${collectionName}[${index}].id`, 'duplicate_id', `Duplicate ${collectionName} id: ${record.id}.`))
    seen.add(record?.id)
  })
  return errors
}

export function validateDataset({ agencies = [], sources = [], services = [] } = {}) {
  const errors = []
  ;[['agencies', agencies], ['sources', sources], ['services', services]].forEach(([name, records]) => {
    if (!Array.isArray(records)) errors.push(error(name, 'invalid_array', `${name} must be an array.`))
    else errors.push(...duplicateIdErrors(records, name))
  })
  if (!Array.isArray(agencies) || !Array.isArray(sources) || !Array.isArray(services)) return result(errors)
  agencies.forEach((agency, index) => validateAgency(agency).errors.forEach((item) => errors.push({ ...item, path: `agencies[${index}].${item.path.replace('agency.', '')}` })))
  sources.forEach((source, index) => validateSource(source).errors.forEach((item) => errors.push({ ...item, path: `sources[${index}].${item.path.replace('source.', '')}` })))
  services.forEach((service, index) => validateService(service, agencies, sources).errors.forEach((item) => errors.push({ ...item, path: `services[${index}].${item.path.replace('service.', '')}` })))
  return result(errors)
}

export { CHARGE_CLASSES }
