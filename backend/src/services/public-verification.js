const SNAPSHOT_FIELDS = [
  'id', 'service_id', 'pricing_model', 'currency', 'amount', 'min_amount', 'max_amount',
  'percentage', 'formula', 'conditions', 'label', 'is_current', 'verification_status',
];

function publicReviewEventPredicate(feeAlias = 'f', eventAlias = 've') {
  const snapshotKeys = SNAPSHOT_FIELDS.map((field) => `'${field}'`).join(', ');
  const snapshotMatches = SNAPSHOT_FIELDS.map((field) => `(${eventAlias}.new_values ->> '${field}') IS NOT DISTINCT FROM (${feeAlias}.${field})::text`).join('\n    AND ');
  return `${eventAlias}.fee_option_id = ${feeAlias}.id
    AND ${eventAlias}.service_id = ${feeAlias}.service_id
    AND ${eventAlias}.status = 'verified'
    AND ${eventAlias}.source_id IS NOT NULL
    AND ${eventAlias}.checked_at IS NOT NULL
    AND NULLIF(BTRIM(${eventAlias}.checked_by), '') IS NOT NULL
    AND NULLIF(BTRIM(${eventAlias}.evidence_summary), '') IS NOT NULL
    AND NULLIF(BTRIM(${eventAlias}.verification_method), '') IS NOT NULL
    AND ${eventAlias}.new_values ?& ARRAY[${snapshotKeys}]
    AND ${snapshotMatches}
    AND EXISTS (
      SELECT 1 FROM admin_users reviewer
       WHERE reviewer.id = ${eventAlias}.actor_admin_user_id
         AND reviewer.role = 'admin'
         AND LOWER(BTRIM(reviewer.display_name)) = LOWER(BTRIM(${eventAlias}.checked_by))
    )
    AND EXISTS (
      SELECT 1 FROM fee_sources review_source
       WHERE review_source.fee_option_id = ${feeAlias}.id
         AND review_source.source_id = ${eventAlias}.source_id
    )`;
}

function publicVerifiedReviewExistsSql(feeAlias = 'f') {
  return `EXISTS (
    SELECT 1 FROM verification_events ve
     WHERE ${publicReviewEventPredicate(feeAlias, 've')}
  )`;
}

function publicLinkedSourceExistsSql(feeAlias = 'f') {
  return `EXISTS (
    SELECT 1 FROM fee_sources public_source_link
    JOIN sources public_source ON public_source.id = public_source_link.source_id
     WHERE public_source_link.fee_option_id = ${feeAlias}.id
       AND public_source.source_type <> 'other'
  )`;
}

function publicFeeStatusSql(feeAlias = 'f') {
  return `CASE
    WHEN ${feeAlias}.verification_status = 'superseded' OR ${feeAlias}.is_current = FALSE THEN 'historical_or_superseded'
    WHEN ${feeAlias}.verification_status = 'conflicting' THEN 'conflicting'
    WHEN ${feeAlias}.verification_status = 'unable_to_verify' THEN 'unable_to_verify'
    WHEN ${feeAlias}.verification_status = 'pending' THEN 'pending'
    WHEN ${feeAlias}.verification_status = 'verified' AND ${publicVerifiedReviewExistsSql(feeAlias)} THEN 'verified'
    WHEN ${feeAlias}.verification_status = 'verified' AND ${publicLinkedSourceExistsSql(feeAlias)} THEN 'source_supported'
    ELSE 'pending'
  END`;
}

function sameSnapshot(eventSnapshot, currentSnapshot) {
  if (!eventSnapshot || typeof eventSnapshot !== 'object' || !currentSnapshot) return false;
  return SNAPSHOT_FIELDS.every((field) => Object.hasOwn(eventSnapshot, field)
    && (eventSnapshot[field] ?? null) === (currentSnapshot[field] ?? null));
}

function hasValidPublicReview({ feeOption, reviewEvents = [], linkedSources = [] }) {
  if (!feeOption || feeOption.verification_status !== 'verified' || feeOption.is_current !== true) return false;
  const sourceIds = new Set(linkedSources.map((source) => String(source.id)));
  return reviewEvents.some((event) => event
    && String(event.fee_option_id) === String(feeOption.id)
    && String(event.service_id) === String(feeOption.service_id)
    && event.status === 'verified'
    && event.actor_admin_user_id != null
    && event.reviewer_role === 'admin'
    && String(event.reviewer_display_name || '').trim().toLowerCase() === String(event.checked_by || '').trim().toLowerCase()
    && String(event.checked_by || '').trim() !== ''
    && String(event.evidence_summary || '').trim() !== ''
    && String(event.verification_method || '').trim() !== ''
    && event.checked_at != null
    && event.source_id != null
    && sourceIds.has(String(event.source_id))
    && sameSnapshot(event.new_values, feeOption));
}

function projectPublicFeeStatus({ feeOption, reviewEvents = [], linkedSources = [] }) {
  if (!feeOption) return 'pending';
  if (feeOption.verification_status === 'superseded' || feeOption.is_current === false) return 'historical_or_superseded';
  if (feeOption.verification_status === 'conflicting') return 'conflicting';
  if (feeOption.verification_status === 'unable_to_verify') return 'unable_to_verify';
  if (feeOption.verification_status === 'pending') return 'pending';
  if (feeOption.verification_status === 'verified') {
    if (hasValidPublicReview({ feeOption, reviewEvents, linkedSources })) return 'verified';
    return linkedSources.some((source) => {
      const sourceType = source.source_type || source.sourceType;
      return Boolean(sourceType && sourceType !== 'other');
    }) ? 'source_supported' : 'pending';
  }
  return 'pending';
}

module.exports = {
  hasValidPublicReview,
  projectPublicFeeStatus,
  publicFeeStatusSql,
  publicReviewEventPredicate,
  publicVerifiedReviewExistsSql,
};
