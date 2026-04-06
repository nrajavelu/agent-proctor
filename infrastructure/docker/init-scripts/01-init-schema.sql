-- Ayan.ai PostgreSQL Database Schema
-- Phase 1 Infrastructure Setup
-- Generated: 2026-04-05

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Keycloak schema for separation
CREATE SCHEMA IF NOT EXISTS keycloak;

-- Switch to main database schema
SET search_path TO public;

-- =============================================================================
-- ORGANISATIONS TABLE
-- =============================================================================
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE, -- TAO/external system ID
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    theme JSONB DEFAULT '{
        "primary_color": "#1e40af",
        "secondary_color": "#f59e0b", 
        "background_color": "#f8fafc",
        "text_color": "#1f2937",
        "font_family": "Inter, sans-serif",
        "organization_name": "",
        "support_email": "",
        "support_phone": "",
        "verification_messages": {
            "welcome": "Welcome to your exam verification",
            "camera_check": "Please verify your camera is working properly",
            "id_capture": "Please upload a clear photo of your ID",
            "room_scan": "Show your exam environment",
            "rules_title": "Examination Policies", 
            "completion": "Thank you. Your exam has been submitted successfully."
        },
        "zero_references_to_provider": true
    }'::JSONB,
    default_rules_config JSONB DEFAULT '{}'::JSONB,
    keycloak_realm VARCHAR(100),
    api_keys JSONB DEFAULT '[]'::JSONB, -- [{ id, pk, sk_hash, created_at, revoked_at }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- EXAMS TABLE  
-- =============================================================================
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE, -- TAO test/assessment ID
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_min INTEGER NOT NULL DEFAULT 60,
    instructions TEXT,
    exam_app_url TEXT NOT NULL, -- URL to exam application
    addons_config JSONB DEFAULT '{
        "face_verify": true,
        "id_verify": false, 
        "env_scan": true,
        "screen_record": true,
        "browser_lock": true
    }'::JSONB,
    metrics_config JSONB DEFAULT '{
        "face_detection_weight": 0.25,
        "browser_violation_weight": 0.30,
        "audio_violation_weight": 0.20,
        "motion_violation_weight": 0.25
    }'::JSONB,
    rules_config JSONB DEFAULT '{
        "allow_calculator": false,
        "allow_notes": false,
        "allow_breaks": false,
        "max_violations": 5
    }'::JSONB,
    callback_url TEXT, -- Optional webhook URL
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BATCHES TABLE
-- =============================================================================
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE, -- TAO group/batch ID
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- DELIVERIES TABLE  
-- =============================================================================
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE, -- TAO delivery execution ID
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')) DEFAULT 'scheduled',
    candidate_ids JSONB DEFAULT '[]'::JSONB, -- Array of candidate IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE, -- TAO session/attempt ID
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    candidate_id VARCHAR(255) NOT NULL, -- External candidate identifier
    room_id VARCHAR(255), -- LiveKit room ID
    agent_id VARCHAR(255), -- AI agent instance ID  
    status VARCHAR(50) CHECK (status IN ('created', 'active', 'completed', 'interrupted', 'failed')) DEFAULT 'created',
    credibility_score DECIMAL(5,2) CHECK (credibility_score >= 0 AND credibility_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- VIOLATIONS TABLE
-- =============================================================================
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL, -- b1, b2, c1, a1, etc.
    type VARCHAR(50) NOT NULL, -- browser, camera, audio, behavior
    severity DECIMAL(3,2) CHECK (severity >= 0 AND severity <= 1) DEFAULT 0.5,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1) DEFAULT 0.5,
    weight DECIMAL(3,2) CHECK (weight >= 0 AND weight <= 1) DEFAULT 0.5,
    metadata JSONB DEFAULT '{}'::JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- RECORDINGS TABLE
-- =============================================================================
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- video, audio, screen
    storage_url TEXT NOT NULL, -- MinIO/S3 URL
    duration_sec INTEGER,
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SCORE_HISTORY TABLE
-- =============================================================================
CREATE TABLE score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100) NOT NULL,
    breakdown JSONB DEFAULT '{}'::JSONB, -- Detailed score breakdown
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Organisation indexes
CREATE INDEX idx_organisations_slug ON organisations(slug);
CREATE INDEX idx_organisations_external_id ON organisations(external_id) WHERE external_id IS NOT NULL;

-- Exam indexes
CREATE INDEX idx_exams_org_id ON exams(org_id);
CREATE INDEX idx_exams_external_id ON exams(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_exams_org_title ON exams(org_id, title);

-- Batch indexes
CREATE INDEX idx_batches_exam_id ON batches(exam_id);
CREATE INDEX idx_batches_external_id ON batches(external_id) WHERE external_id IS NOT NULL;

-- Delivery indexes
CREATE INDEX idx_deliveries_batch_id ON deliveries(batch_id);
CREATE INDEX idx_deliveries_external_id ON deliveries(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_deliveries_scheduled_at ON deliveries(scheduled_at);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- Session indexes
CREATE INDEX idx_sessions_delivery_id ON sessions(delivery_id);
CREATE INDEX idx_sessions_batch_id ON sessions(batch_id);
CREATE INDEX idx_sessions_exam_id ON sessions(exam_id);
CREATE INDEX idx_sessions_candidate_id ON sessions(candidate_id);
CREATE INDEX idx_sessions_external_id ON sessions(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at) WHERE started_at IS NOT NULL;

-- Violation indexes
CREATE INDEX idx_violations_session_id ON violations(session_id);
CREATE INDEX idx_violations_timestamp ON violations(timestamp);
CREATE INDEX idx_violations_session_timestamp ON violations(session_id, timestamp);
CREATE INDEX idx_violations_type ON violations(type);

-- Recording indexes
CREATE INDEX idx_recordings_session_id ON recordings(session_id);
CREATE INDEX idx_recordings_type ON recordings(type);

-- Score history indexes
CREATE INDEX idx_score_history_session_id ON score_history(session_id);
CREATE INDEX idx_score_history_timestamp ON score_history(timestamp);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR TENANT ISOLATION
-- =============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;  
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

-- Create function to get current org_id from JWT claims
CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
BEGIN
    -- Extract org_id from JWT claims set by middleware
    -- This will be set by our API Gateway JWT middleware
    RETURN current_setting('app.current_org_id', true)::UUID;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has super admin role from JWT
    RETURN COALESCE(current_setting('app.is_super_admin', true)::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for organisations (super admin can see all, regular users only their org)
CREATE POLICY org_isolation_policy ON organisations
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR id = current_org_id());

-- RLS Policies for exams
CREATE POLICY exam_isolation_policy ON exams  
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR org_id = current_org_id());

-- RLS Policies for batches (through exam relationship)
CREATE POLICY batch_isolation_policy ON batches
    FOR ALL TO PUBLIC  
    USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM exams WHERE exams.id = batches.exam_id AND exams.org_id = current_org_id()
    ));

-- RLS Policies for deliveries (through batch → exam relationship)
CREATE POLICY delivery_isolation_policy ON deliveries
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM batches 
        JOIN exams ON exams.id = batches.exam_id 
        WHERE batches.id = deliveries.batch_id AND exams.org_id = current_org_id()
    ));

-- RLS Policies for sessions (through multiple relationships)
CREATE POLICY session_isolation_policy ON sessions
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM deliveries d
        JOIN batches b ON b.id = d.batch_id
        JOIN exams e ON e.id = b.exam_id  
        WHERE d.id = sessions.delivery_id AND e.org_id = current_org_id()
    ));

-- RLS Policies for violations (through session relationship)
CREATE POLICY violation_isolation_policy ON violations
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM sessions s
        JOIN deliveries d ON d.id = s.delivery_id
        JOIN batches b ON b.id = d.batch_id
        JOIN exams e ON e.id = b.exam_id
        WHERE s.id = violations.session_id AND e.org_id = current_org_id()
    ));

-- RLS Policies for recordings (through session relationship)  
CREATE POLICY recording_isolation_policy ON recordings
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM sessions s
        JOIN deliveries d ON d.id = s.delivery_id
        JOIN batches b ON b.id = d.batch_id  
        JOIN exams e ON e.id = b.exam_id
        WHERE s.id = recordings.session_id AND e.org_id = current_org_id()
    ));

-- RLS Policies for score_history (through session relationship)
CREATE POLICY score_history_isolation_policy ON score_history  
    FOR ALL TO PUBLIC
    USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM sessions s
        JOIN deliveries d ON d.id = s.delivery_id
        JOIN batches b ON b.id = d.batch_id
        JOIN exams e ON e.id = b.exam_id  
        WHERE s.id = score_history.session_id AND e.org_id = current_org_id()
    ));

-- =============================================================================
-- TRIGGERS FOR updated_at TIMESTAMPS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON organisations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =============================================================================

-- Create default super admin organisation
INSERT INTO organisations (id, name, slug, theme, created_at) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'Ayan.ai System Administration', 
    'ayan-admin',
    '{
        "primary_color": "#0f172a",
        "secondary_color": "#06b6d4", 
        "background_color": "#020617",
        "text_color": "#f8fafc",
        "font_family": "Inter, sans-serif",
        "organization_name": "Ayan.ai",
        "support_email": "admin@ayan.nunmai.local",
        "support_phone": "+1-555-AYAN-AI"
    }'::JSONB,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ayan_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ayan_user;

-- Create database user for Keycloak
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'keycloak_user') THEN
        CREATE ROLE keycloak_user WITH LOGIN PASSWORD 'keycloak_pass_dev';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA keycloak TO keycloak_user;
GRANT ALL PRIVILEGES ON SCHEMA keycloak TO keycloak_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA keycloak TO keycloak_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA keycloak TO keycloak_user;

-- Setup complete
SELECT 'Ayan.ai database schema initialized successfully!' as status;