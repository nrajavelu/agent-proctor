-- Ayan.ai Development Seed Data
-- Phase 1 Infrastructure Setup
-- Generated: 2026-04-05

-- =============================================================================
-- SEED ORGANISATIONS
-- =============================================================================

-- Demo University organisation with complete branding
INSERT INTO organisations (
    id,
    external_id,
    name, 
    slug,
    logo_url,
    theme,
    default_rules_config,
    keycloak_realm,
    created_at
) VALUES 
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'tao_org_demo_001', 
    'Demo University',
    'demo-university',
    'https://storage.ayan.nunmai.local/logos/demo-university.png',
    '{
        "primary_color": "#1e3a8a",
        "secondary_color": "#f59e0b",
        "background_color": "#f8fafc", 
        "text_color": "#1f2937",
        "font_family": "Inter, sans-serif",
        "organization_name": "Demo University",
        "support_email": "support@demo-university.edu",
        "support_phone": "+1-555-DEMO-EDU",
        "logo_url": "https://storage.ayan.nunmai.local/logos/demo-university.png",
        "favicon_url": "https://storage.ayan.nunmai.local/icons/demo-university.ico",
        "verification_messages": {
            "welcome": "Welcome to Demo University''s secure examination platform",
            "camera_check": "Please ensure your camera is positioned clearly to show your face and workspace", 
            "id_capture": "Please upload a clear photo of your student ID or government-issued photo ID",
            "room_scan": "Please slowly pan your camera to show your entire exam environment",
            "rules_title": "Demo University Examination Policies",
            "completion": "Thank you for completing your Demo University examination. Results will be available within 24 hours."
        },
        "custom_css": ".exam-header { background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); }",
        "zero_references_to_provider": true
    }'::JSONB,
    '{
        "allow_calculator": false,
        "allow_notes": false, 
        "allow_breaks": true,
        "max_violations": 5,
        "break_duration_min": 10,
        "max_breaks": 2,
        "auto_submit_on_violations": true,
        "require_id_verification": true,
        "require_environment_scan": true,
        "browser_lockdown": true,
        "disable_clipboard": true,
        "disable_right_click": true,
        "monitor_audio": true,
        "face_detection_interval": 30
    }'::JSONB,
    'demo-university',
    NOW()
),
(
    'b2c3d4e5-f6g7-8901-bcde-f23456789012', 
    'tao_org_corp_001',
    'Corporate Training Institute',
    'corporate-training',
    'https://storage.ayan.nunmai.local/logos/corporate-training.png',
    '{
        "primary_color": "#059669",
        "secondary_color": "#dc2626", 
        "background_color": "#ffffff",
        "text_color": "#111827",
        "font_family": "Roboto, sans-serif",
        "organization_name": "Corporate Training Institute",
        "support_email": "training@corp-institute.com",
        "support_phone": "+1-555-CORP-TRN",
        "logo_url": "https://storage.ayan.nunmai.local/logos/corporate-training.png",
        "verification_messages": {
            "welcome": "Welcome to the Corporate Training certification exam",
            "camera_check": "Verify your webcam shows a clear view of your workspace",
            "id_capture": "Please provide photo identification for verification",
            "room_scan": "Demonstrate your testing environment meets requirements", 
            "rules_title": "Professional Certification Exam Guidelines",
            "completion": "Congratulations! Your certification exam has been submitted successfully."
        },
        "zero_references_to_provider": true
    }'::JSONB,
    '{
        "allow_calculator": true,
        "allow_notes": true,
        "allow_breaks": false,
        "max_violations": 3,
        "require_id_verification": false,
        "browser_lockdown": false,
        "monitor_audio": false
    }'::JSONB,
    'corporate-training',
    NOW()
);

-- =============================================================================
-- SEED EXAMS
-- =============================================================================

INSERT INTO exams (
    id,
    external_id,
    org_id,
    title,
    description,
    duration_min, 
    instructions,
    exam_app_url,
    addons_config,
    metrics_config,
    rules_config,
    callback_url,
    created_by
) VALUES 
(
    'e1a2b3c4-d5e6-f789-0abc-def123456789',
    'tao_test_demo_finance_001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Financial Literacy Assessment',
    'Comprehensive evaluation of financial knowledge covering investments, budgeting, and risk management',
    45,
    'This assessment contains 10 multiple-choice questions about financial literacy. You have 45 minutes to complete all questions. Read each question carefully and select the best answer. You may not return to previous questions once submitted.',
    'http://localhost:3001',
    '{
        "face_verify": true,
        "id_verify": true,
        "env_scan": true, 
        "screen_record": true,
        "browser_lock": true,
        "audio_monitor": true
    }'::JSONB,
    '{
        "face_detection_weight": 0.30,
        "browser_violation_weight": 0.25,
        "audio_violation_weight": 0.20,
        "motion_violation_weight": 0.15,
        "environment_weight": 0.10
    }'::JSONB,
    '{
        "allow_calculator": true,
        "allow_notes": false,
        "allow_breaks": false,
        "max_violations": 5,
        "auto_submit_threshold": 10,
        "require_webcam": true,
        "require_microphone": true,
        "full_screen_required": true
    }'::JSONB,
    'https://demo-university.edu/webhooks/exam-results',
    'admin@demo-university.edu'
), 
(
    'e2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'tao_test_corp_leadership_001', 
    'b2c3d4e5-f6g7-8901-bcde-f23456789012',
    'Leadership Skills Certification',
    'Professional assessment of leadership competencies and management capabilities', 
    90,
    'This certification exam evaluates your leadership and management skills through scenario-based questions and case studies. Complete all sections within the allocated time.',
    'http://localhost:3002',
    '{
        "face_verify": true,
        "id_verify": false,
        "env_scan": false,
        "screen_record": true,  
        "browser_lock": false,
        "audio_monitor": false
    }'::JSONB,
    '{
        "face_detection_weight": 0.40,
        "browser_violation_weight": 0.35,
        "audio_violation_weight": 0.15,
        "motion_violation_weight": 0.10
    }'::JSONB,
    '{
        "allow_calculator": true,
        "allow_notes": true,
        "allow_breaks": true,
        "max_violations": 8,
        "break_duration_min": 15,
        "max_breaks": 1
    }'::JSONB,
    'https://corp-institute.com/api/exam-webhooks',
    'admin@corp-institute.com'
);

-- =============================================================================
-- SEED BATCHES
-- =============================================================================

INSERT INTO batches (
    id,
    external_id,
    exam_id,
    name,
    description
) VALUES 
(
    'b1a2b3c4-d5e6-f789-0abc-def123456789',
    'tao_batch_demo_spring_2026',
    'e1a2b3c4-d5e6-f789-0abc-def123456789',
    'Spring 2026 Cohort',
    'Financial literacy assessment for graduating seniors, Spring 2026 semester'
), 
(
    'b2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'tao_batch_demo_fall_2025',
    'e1a2b3c4-d5e6-f789-0abc-def123456789',
    'Fall 2025 Cohort', 
    'Makeup examinations for Fall 2025 financial literacy requirements'
),
(
    'b3c4d5e6-f7g8-9012-3cde-f4567890123a',
    'tao_batch_corp_q1_2026',
    'e2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'Q1 2026 Leadership Certification',
    'First quarter leadership certification program for new managers'
);

-- =============================================================================
-- SEED DELIVERIES  
-- =============================================================================

INSERT INTO deliveries (
    id,
    external_id,
    batch_id,
    scheduled_at,
    end_at,
    status,
    candidate_ids
) VALUES 
(
    'd1a2b3c4-d5e6-f789-0abc-def123456789', 
    'tao_delivery_demo_session_001',
    'b1a2b3c4-d5e6-f789-0abc-def123456789',
    '2026-04-15 09:00:00+00',
    '2026-04-15 10:30:00+00', 
    'scheduled',
    '["student_001", "student_002", "student_003", "student_004", "student_005"]'::JSONB
),
(
    'd2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'tao_delivery_demo_makeup_001', 
    'b2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    '2026-04-10 14:00:00+00',
    '2026-04-10 15:30:00+00',
    'active',
    '["student_006", "student_007"]'::JSONB
),
(
    'd3c4d5e6-f7g8-9012-3cde-f4567890123a',
    'tao_delivery_corp_leadership_001',
    'b3c4d5e6-f7g8-9012-3cde-f4567890123a', 
    '2026-04-20 10:00:00+00',
    '2026-04-20 11:30:00+00',
    'scheduled',
    '["manager_001", "manager_002", "manager_003"]'::JSONB
);

-- =============================================================================
-- SEED SAMPLE SESSIONS
-- =============================================================================

INSERT INTO sessions (
    id,
    external_id,
    delivery_id,
    batch_id,
    exam_id, 
    candidate_id,
    room_id,
    agent_id,
    status,
    credibility_score,
    risk_level,
    started_at,
    ended_at
) VALUES 
(
    's1a2b3c4-d5e6-f789-0abc-def123456789',
    'tao_session_demo_student001', 
    'd2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'b2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'e1a2b3c4-d5e6-f789-0abc-def123456789',
    'student_006',
    'room_student006_20260410_140000',
    'agent_demo_001',
    'completed', 
    87.5,
    'low',
    '2026-04-10 14:05:00+00',
    '2026-04-10 14:52:00+00'
),
(
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'tao_session_demo_student007',
    'd2b3c4d5-e6f7-8901-2bcd-ef3456789012', 
    'b2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'e1a2b3c4-d5e6-f789-0abc-def123456789',
    'student_007',
    'room_student007_20260410_140000',
    'agent_demo_002', 
    'completed',
    72.3,
    'medium',
    '2026-04-10 14:03:00+00',
    '2026-04-10 14:48:00+00'
);

-- =============================================================================
-- SEED SAMPLE VIOLATIONS
-- =============================================================================

INSERT INTO violations (
    id,
    session_id,
    code,
    type,
    severity,
    confidence,
    weight,
    metadata,
    timestamp
) VALUES 
(
    uuid_generate_v4(),
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012', 
    'b1',
    'browser',
    0.8,
    0.9,
    0.3,
    '{"action": "window_blur", "duration_sec": 3, "url_attempted": "google.com"}'::JSONB,
    '2026-04-10 14:15:30+00'
),
(
    uuid_generate_v4(),
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'c2', 
    'camera',
    0.6,
    0.7,
    0.25,
    '{"faces_detected": 0, "duration_sec": 8, "suspected_cause": "user_left_frame"}'::JSONB,
    '2026-04-10 14:28:45+00'
),
(
    uuid_generate_v4(),
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'a1',
    'audio', 
    0.5,
    0.6,
    0.2,
    '{"noise_type": "conversation", "volume_db": 65, "duration_sec": 12}'::JSONB,
    '2026-04-10 14:35:20+00'
);

-- =============================================================================
-- SEED SAMPLE RECORDINGS
-- =============================================================================

INSERT INTO recordings (
    id, 
    session_id,
    type,
    storage_url,
    duration_sec,
    size_bytes
) VALUES 
(
    uuid_generate_v4(),
    's1a2b3c4-d5e6-f789-0abc-def123456789',
    'video',
    'https://storage.ayan.nunmai.local/recordings/s1a2b3c4-d5e6-f789-0abc-def123456789/video.mp4',
    2820, -- 47 minutes
    125000000 -- ~125MB
),
(
    uuid_generate_v4(),
    's1a2b3c4-d5e6-f789-0abc-def123456789',
    'screen',
    'https://storage.ayan.nunmai.local/recordings/s1a2b3c4-d5e6-f789-0abc-def123456789/screen.mp4', 
    2820,
    89000000 -- ~89MB
),
(
    uuid_generate_v4(),
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'video',
    'https://storage.ayan.nunmai.local/recordings/s2b3c4d5-e6f7-8901-2bcd-ef3456789012/video.mp4',
    2700, -- 45 minutes  
    118000000
),
(
    uuid_generate_v4(),
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    'screen', 
    'https://storage.ayan.nunmai.local/recordings/s2b3c4d5-e6f7-8901-2bcd-ef3456789012/screen.mp4',
    2700,
    95000000
);

-- =============================================================================
-- SEED SCORE HISTORY
-- =============================================================================

INSERT INTO score_history (
    session_id,
    score,
    breakdown,
    timestamp
) VALUES 
-- Student 006 - Gradual decline in score
(
    's1a2b3c4-d5e6-f789-0abc-def123456789',
    95.0,
    '{"face_detection": 95, "browser_compliance": 100, "audio_compliance": 90, "motion_stability": 95}'::JSONB,
    '2026-04-10 14:05:00+00'
),
(
    's1a2b3c4-d5e6-f789-0abc-def123456789', 
    92.5,
    '{"face_detection": 90, "browser_compliance": 100, "audio_compliance": 85, "motion_stability": 95}'::JSONB,
    '2026-04-10 14:20:00+00'
),
(
    's1a2b3c4-d5e6-f789-0abc-def123456789',
    87.5,
    '{"face_detection": 85, "browser_compliance": 95, "audio_compliance": 80, "motion_stability": 90}'::JSONB, 
    '2026-04-10 14:52:00+00'
),
-- Student 007 - More violations, lower score
(
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    90.0,
    '{"face_detection": 90, "browser_compliance": 95, "audio_compliance": 85, "motion_stability": 90}'::JSONB,
    '2026-04-10 14:03:00+00'
),
(
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    82.3,
    '{"face_detection": 80, "browser_compliance": 75, "audio_compliance": 85, "motion_stability": 88}'::JSONB,
    '2026-04-10 14:15:30+00'
),
(
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    76.1, 
    '{"face_detection": 70, "browser_compliance": 75, "audio_compliance": 80, "motion_stability": 85}'::JSONB,
    '2026-04-10 14:28:45+00'
),
(
    's2b3c4d5-e6f7-8901-2bcd-ef3456789012',
    72.3,
    '{"face_detection": 65, "browser_compliance": 70, "audio_compliance": 75, "motion_stability": 80}'::JSONB',
    '2026-04-10 14:48:00+00'  
);

-- Display summary of seeded data
SELECT 
    'Seed data created successfully!' as status,
    json_build_object(
        'organisations', (SELECT count(*) FROM organisations WHERE id != '00000000-0000-0000-0000-000000000000'),
        'exams', (SELECT count(*) FROM exams),
        'batches', (SELECT count(*) FROM batches), 
        'deliveries', (SELECT count(*) FROM deliveries),
        'sessions', (SELECT count(*) FROM sessions),
        'violations', (SELECT count(*) FROM violations),
        'recordings', (SELECT count(*) FROM recordings),
        'score_entries', (SELECT count(*) FROM score_history)
    ) as summary;