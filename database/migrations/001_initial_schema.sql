-- FeeLens NG Phase 1
-- Representation of the existing PostgreSQL schema.
-- PostgreSQL 13 compatible. This migration is intentionally not executed by Phase 1.

CREATE TABLE mdas (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
    id BIGSERIAL PRIMARY KEY,
    mda_id BIGINT NOT NULL REFERENCES mdas(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mda_id, slug)
);

COMMENT ON TABLE services IS 'A government service is not itself a fee. A service may have multiple fee options.';

CREATE TABLE fee_options (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    pricing_model TEXT NOT NULL CHECK (pricing_model IN (
        'fixed', 'free', 'range', 'percentage', 'formula', 'variable', 'unknown'
    )),
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    amount NUMERIC(14, 2),
    min_amount NUMERIC(14, 2),
    max_amount NUMERIC(14, 2),
    percentage NUMERIC(9, 6),
    formula TEXT,
    label TEXT,
    notes TEXT,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (amount IS NULL OR amount >= 0),
    CHECK (min_amount IS NULL OR min_amount >= 0),
    CHECK (max_amount IS NULL OR max_amount >= 0),
    CHECK (min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount),
    CHECK (percentage IS NULL OR percentage >= 0),
    CHECK (pricing_model <> 'unknown' OR (
        amount IS NULL AND min_amount IS NULL AND max_amount IS NULL
        AND percentage IS NULL AND formula IS NULL
    )),
    CHECK (pricing_model <> 'free' OR (
        COALESCE(amount, 0) = 0 AND min_amount IS NULL AND max_amount IS NULL
        AND percentage IS NULL AND formula IS NULL
    )),
    CHECK (pricing_model <> 'fixed' OR amount IS NOT NULL),
    CHECK (pricing_model <> 'range' OR (min_amount IS NOT NULL AND max_amount IS NOT NULL)),
    CHECK (pricing_model <> 'percentage' OR percentage IS NOT NULL),
    CHECK (pricing_model <> 'formula' OR formula IS NOT NULL),
    CHECK (pricing_model NOT IN ('variable') OR label IS NOT NULL OR notes IS NOT NULL)
);

COMMENT ON COLUMN fee_options.pricing_model IS 'unknown is not zero; it means the fee has not been established.';

CREATE TABLE sources (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'act', 'regulation', 'gazette', 'statutory_instrument',
        'approved_fee_schedule', 'official_circular', 'official_website',
        'official_portal', 'official_notice', 'correspondence', 'foi_response', 'other'
    )),
    evidence_tier SMALLINT NOT NULL CHECK (evidence_tier IN (1, 2, 3)),
    publisher TEXT,
    url TEXT,
    document_reference TEXT,
    publication_date DATE,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN sources.evidence_tier IS 'Tier 1 is primary legal/approved evidence; Tier 2 is official publication; Tier 3 is formal correspondence or FOI.';

CREATE TABLE fee_sources (
    fee_option_id BIGINT NOT NULL REFERENCES fee_options(id) ON DELETE CASCADE,
    source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    excerpt TEXT,
    page_or_section TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fee_option_id, source_id)
);

CREATE TABLE official_channels (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('website', 'portal', 'office', 'email', 'phone', 'other')),
    name TEXT NOT NULL,
    url TEXT,
    contact_value TEXT,
    instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_events (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    fee_option_id BIGINT REFERENCES fee_options(id) ON DELETE RESTRICT,
    source_id BIGINT REFERENCES sources(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN (
        'verified', 'pending', 'conflicting', 'unable_to_verify', 'superseded'
    )),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_by TEXT,
    notes TEXT,
    supersedes_event_id BIGINT REFERENCES verification_events(id) ON DELETE RESTRICT
);

COMMENT ON COLUMN verification_events.status IS 'Conflicting official evidence is retained and must not be silently resolved.';

CREATE TABLE foi_requests (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    requesting_body TEXT,
    request_reference TEXT,
    submitted_at DATE,
    responded_at DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'acknowledged', 'responded', 'closed', 'withdrawn'
    )),
    request_text TEXT,
    response_summary TEXT,
    source_id BIGINT REFERENCES sources(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_admin_user_id BIGINT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX services_mda_id_idx ON services (mda_id);
CREATE INDEX fee_options_service_id_idx ON fee_options (service_id);
CREATE INDEX fee_sources_source_id_idx ON fee_sources (source_id);
CREATE INDEX official_channels_service_id_idx ON official_channels (service_id);
CREATE INDEX verification_events_service_id_idx ON verification_events (service_id);
CREATE INDEX verification_events_status_idx ON verification_events (status);
CREATE INDEX foi_requests_service_id_idx ON foi_requests (service_id);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_admin_user_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);

