const freezeEnum = (values) => Object.freeze(values)

export const JURISDICTIONS = freezeEnum({
  FEDERAL: 'federal',
  FCT: 'fct',
  STATE: 'state',
  LOCAL: 'local',
})

export const PRICING_MODELS = freezeEnum({
  FIXED: 'fixed',
  FREE: 'free',
  RANGE: 'range',
  PERCENTAGE: 'percentage',
  FORMULA: 'formula',
  VARIABLE: 'variable',
  UNKNOWN: 'unknown',
})

export const PUBLICATION_STATUSES = freezeEnum({
  PUBLISHED: 'published',
  NOT_LOCATED: 'not_located',
  CONFLICTING: 'conflicting',
  SUPERSEDED: 'superseded',
})

export const VERIFICATION_STATUSES = freezeEnum({
  VERIFIED: 'verified',
  PENDING: 'pending',
  UNABLE_TO_VERIFY: 'unable_to_verify',
  DISPUTED: 'disputed',
  SUPERSEDED: 'superseded',
})

export const SOURCE_TYPES = freezeEnum({
  ACT: 'act',
  REGULATION: 'regulation',
  GAZETTE: 'gazette',
  OFFICIAL_FEE_SCHEDULE: 'official_fee_schedule',
  OFFICIAL_PORTAL: 'official_portal',
  OFFICIAL_NOTICE: 'official_notice',
  SERVICE_CHARTER: 'service_charter',
  OFFICIAL_GUIDELINE: 'official_guideline',
  OFFICIAL_FAQ: 'official_faq',
  OTHER_OFFICIAL: 'other_official',
})

export const CHANNEL_TYPES = freezeEnum({
  INFORMATION: 'information',
  APPLICATION: 'application',
  PAYMENT: 'payment',
  COMPLAINT: 'complaint',
  PHYSICAL_OFFICE: 'physical_office',
})

export const USER_TYPES = freezeEnum({
  INDIVIDUAL: 'individual',
  BUSINESS: 'business',
  ORGANISATION: 'organisation',
})

export const CHARGE_CLASSES = freezeEnum({
  APPLICATION_FEE: 'application_fee',
  REGISTRATION_FEE: 'registration_fee',
  LICENCE_FEE: 'licence_fee',
  RENEWAL_FEE: 'renewal_fee',
  CERTIFICATION_FEE: 'certification_fee',
  MODIFICATION_FEE: 'modification_fee',
  INSPECTION_FEE: 'inspection_fee',
  PERMIT_FEE: 'permit_fee',
  LEVY: 'levy',
  TAX: 'tax',
  DUTY: 'duty',
  PENALTY: 'penalty',
  FINE: 'fine',
  SERVICE_CHARGE: 'service_charge',
  OTHER: 'other',
})

export const SERVICE_CATEGORIES = freezeEnum({
  IDENTITY: 'identity',
  IMMIGRATION: 'immigration',
  BUSINESS: 'business',
  TRANSPORT: 'transport',
  TAX_REVENUE: 'tax_revenue',
  LAND_PROPERTY: 'land_property',
  EDUCATION: 'education',
  HEALTH_REGULATION: 'health_regulation',
  STANDARDS_COMPLIANCE: 'standards_compliance',
  CIVIL_REGISTRATION: 'civil_registration',
  UTILITIES: 'utilities',
  OTHER: 'other',
})

export const RECORD_TYPES = freezeEnum({
  PRODUCTION: 'production',
  DEMO: 'demo',
})

export const ALL_ENUMS = Object.freeze({
  JURISDICTIONS,
  PRICING_MODELS,
  PUBLICATION_STATUSES,
  VERIFICATION_STATUSES,
  SOURCE_TYPES,
  CHANNEL_TYPES,
  USER_TYPES,
  CHARGE_CLASSES,
  SERVICE_CATEGORIES,
  RECORD_TYPES,
})
