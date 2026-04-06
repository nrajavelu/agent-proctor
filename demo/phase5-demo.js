#!/usr/bin/env node
/**
 * Phase 5 Multi-Tenant Service Demo
 * 
 * This demo script showcases the complete Phase 5 functionality:
 * - Organization management
 * - White-label branding
 * - SSO configuration 
 * - API key management
 * - Proctoring session integration
 */

import { AgenticProctor } from '../packages/sdk/src/index.js';

const DEMO_CONFIG = {
  apiUrl: 'http://localhost:4000',      // Main proctoring API
  livekitUrl: 'ws://localhost:7880',    // LiveKit media server
  tenantUrl: 'http://localhost:3000',   // Phase 5 tenant service
  apiKey: 'demo-api-key',               // Generated API key
  debug: true
};

async function runPhase5Demo() {
  console.log('🚀 Phase 5 Multi-Tenant AI Proctoring Platform Demo\n');

  try {
    // Initialize SDK
    console.log('1️⃣ Initializing Agentic Proctor SDK...');
    const proctor = new AgenticProctor(DEMO_CONFIG);
    console.log('✅ SDK initialized with tenant service support\n');

    // Step 1: Organization Management
    console.log('2️⃣ Creating Demo Organization...');
    const orgResult = await proctor.createOrganization({
      slug: `demo-university-${Date.now()}`,
      name: 'Demo University',
      primaryContactName: 'Dr. Jane Smith',
      primaryContactEmail: 'jane.smith@demouniv.edu',
      settings: {
        allowRegistration: true,
        defaultRole: 'instructor',
        sessionRetention: 365,
        examTypes: ['midterm', 'final', 'quiz'],
        features: ['ai_monitoring', 'screen_sharing', 'identity_verification']
      }
    });

    if (!orgResult.success) {
      throw new Error(`Failed to create organization: ${orgResult.error}`);
    }
    
    const org = orgResult.data;
    console.log(`✅ Organization created: ${org.name} (ID: ${org.id})`);
    console.log(`   Slug: ${org.slug}`);
    console.log(`   Contact: ${org.primaryContactName} <${org.primaryContactEmail}>`);
    console.log(`   Status: ${org.status}\n`);

    // Step 2: White-Label Branding Configuration
    console.log('3️⃣ Configuring White-Label Branding...');
    const brandingResult = await proctor.configureBranding({
      orgId: org.id,
      theme: {
        name: 'university-blue',
        primary: '#1e40af',      // University blue
        secondary: '#64748b',    // Slate gray
        accent: '#0ea5e9',       // Sky blue
        background: '#ffffff',   // White
        surface: '#f8fafc',      // Light slate
        text: '#1e293b',         // Dark slate
        textSecondary: '#64748b' // Medium slate
      },
      assets: {
        // Would normally upload actual files
        logoUrl: 'https://demouniv.edu/assets/logo.png',
        faviconUrl: 'https://demouniv.edu/assets/favicon.ico',
        loginBackgroundUrl: 'https://demouniv.edu/assets/campus-bg.jpg'
      },
      customCss: `
        .proctoring-header { 
          background: linear-gradient(135deg, #1e40af, #0ea5e9);
          color: white;
        }
        .exam-info-panel {
          border-left: 4px solid #1e40af;
        }
        .violation-alert {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }
      `,
      isActive: true
    });

    if (!brandingResult.success) {
      throw new Error(`Failed to configure branding: ${brandingResult.error}`);
    }

    console.log('✅ White-label branding configured');
    console.log(`   Theme: ${brandingResult.data.theme.name}`);
    console.log(`   Primary Color: ${brandingResult.data.theme.primary}`);
    console.log(`   Custom CSS: ${brandingResult.data.customCss ? 'Applied' : 'None'}`);
    console.log(`   Status: ${brandingResult.data.isActive ? 'Active' : 'Inactive'}\n`);

    // Step 3: SSO Configuration
    console.log('4️⃣ Setting up Single Sign-On...');
    const ssoResult = await proctor.configureSso({
      orgId: org.id,
      providerName: 'University Active Directory',
      providerType: 'OIDC',
      issuerUrl: 'https://login.demouniv.edu/adfs',
      clientId: 'proctoring-system-client',
      clientSecret: 'secure-client-secret',
      additionalScopes: ['email', 'profile', 'groups', 'department'],
      attributeMapping: {
        email: 'email',
        name: 'displayName',
        role: 'groups',
        department: 'department',
        studentId: 'employeeId'
      },
      isActive: true
    });

    if (!ssoResult.success) {
      throw new Error(`Failed to configure SSO: ${ssoResult.error}`);
    }

    console.log('✅ SSO configuration complete');
    console.log(`   Provider: ${ssoResult.data.providerName}`);
    console.log(`   Type: ${ssoResult.data.providerType}`);
    console.log(`   Status: ${ssoResult.data.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   Attribute Mapping: ${Object.keys(ssoResult.data.attributeMapping).length} fields\n`);

    // Step 4: API Key Management
    console.log('5️⃣ Generating Organization API Key...');
    const apiKeyResult = await proctor.createApiKey({
      name: 'Demo University Integration',
      scopes: [
        'read:organizations',
        'read:sessions',
        'write:sessions', 
        'read:analytics',
        'write:branding',
        'read:sso'
      ],
      rateLimit: {
        requestsPerMinute: 500,
        requestsPerHour: 5000,
        requestsPerDay: 50000
      },
      allowedIPs: [
        '192.168.1.0/24',    // Campus network
        '10.0.0.0/16'        // VPN range
      ],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });

    if (!apiKeyResult.success) {
      throw new Error(`Failed to create API key: ${apiKeyResult.error}`);
    }

    const apiKey = apiKeyResult.data;
    console.log('✅ API key generated successfully');
    console.log(`   Name: ${apiKey.name}`);
    console.log(`   Key: ${apiKey.key.substring(0, 12)}...${apiKey.key.substring(apiKey.key.length - 4)}`);
    console.log(`   Scopes: ${apiKey.scopes.length} permissions`);
    console.log(`   Rate Limit: ${apiKey.rateLimit.requestsPerDay.toLocaleString()}/day`);
    console.log(`   Expires: ${apiKey.expiresAt.toLocaleDateString()}\n`);

    // Step 5: Proctoring Session Integration
    console.log('6️⃣ Starting AI Proctoring Session...');
    
    // Simulate exam data
    const examSession = {
      candidateId: 'student_12345',
      examId: 'midterm_cs101_fall2024',
      candidateInfo: {
        name: 'Alex Johnson',
        email: 'alex.johnson@student.demouniv.edu',
        studentId: 'STU-2024-0123',
        department: 'Computer Science'
      },
      examInfo: {
        title: 'CS 101 Midterm Examination',
        duration: 120, // minutes
        instructor: 'Dr. Jane Smith',
        course: 'Introduction to Computer Science'
      }
    };

    const sessionId = await proctor.startSession({
      candidateId: examSession.candidateId,
      examId: examSession.examId,
      token: `exam_token_${Date.now()}`
    });

    console.log('✅ AI Proctoring Session Started');
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Candidate: ${examSession.candidateInfo.name} (${examSession.candidateInfo.studentId})`);
    console.log(`   Exam: ${examSession.examInfo.title}`);
    console.log(`   Duration: ${examSession.examInfo.duration} minutes`);
    console.log(`   Organization: ${org.name}\n`);

    // Simulate session activity
    console.log('7️⃣ Simulating Session Activity...');
    console.log('   🤖 AI agents deployed and monitoring...');
    console.log('   📹 Video analysis: Face detection active');
    console.log('   🔊 Audio monitoring: Background noise analysis');
    console.log('   💻 Screen sharing: Full desktop capture');
    console.log('   👀 Eye tracking: Gaze pattern analysis');
    console.log('   🧠 Behavior AI: Anomaly detection running');

    // Simulate detection events
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\n   📊 Session Events:');
    console.log('   ⚠️  Warning: Multiple face detected (confidence: 85%)');
    console.log('   ✅ Resolved: Single face confirmed');
    console.log('   ⚠️  Alert: Audio spike detected (background conversation)');
    console.log('   ✅ Normal: Audio levels returned to baseline');
    console.log('   ℹ️  Info: Tab focus lost for 3 seconds');
    console.log('   ✅ Normal: Focus returned to exam window');

    // Get session status
    const sessionStatus = proctor.getSessionStatus();
    console.log('\n   📈 Session Status:');
    console.log(`   Active: ${sessionStatus.active ? '✅ Yes' : '❌ No'}`);
    console.log(`   Session ID: ${sessionStatus.sessionId}`);
    console.log(`   Monitoring: Full AI surveillance active`);
    console.log(`   Organization: ${org.name} (White-label branded)`);

    // Step 6: Demonstrate Enterprise Features
    console.log('\n8️⃣ Enterprise Features Active:');
    console.log('   🏢 Multi-Tenant Isolation: Complete data separation');
    console.log('   🎨 White-Label Branding: Custom theme and assets applied');
    console.log('   🔐 SSO Integration: University Active Directory connected');
    console.log('   🔑 API Management: Secure key-based access with rate limiting');
    console.log('   📊 Analytics: Real-time session monitoring');
    console.log('   🛡️  Security: Role-based access control and audit logging');
    console.log('   ☁️  Scalability: Stateless microservice architecture');
    console.log('   🔄 Integration: SDK for seamless LMS integration\n');

    // Stop session
    console.log('9️⃣ Ending Proctoring Session...');
    await proctor.stopSession();
    
    const finalStatus = proctor.getSessionStatus();
    console.log('✅ Session completed successfully');
    console.log(`   Final Status: ${finalStatus.active ? 'Active' : 'Ended'}`);
    console.log(`   Session Data: Stored with organization isolation\n`);

    // Demo Summary
    console.log('🎉 Phase 5 Demo Complete!\n');
    console.log('📋 What was demonstrated:');
    console.log('   ✅ Multi-tenant organization management');
    console.log('   ✅ White-label branding system (themes, assets, CSS)');
    console.log('   ✅ Enterprise SSO integration (OIDC/SAML)');
    console.log('   ✅ API key management with rate limiting');
    console.log('   ✅ Complete AI proctoring session flow');
    console.log('   ✅ Enterprise security and isolation');
    console.log('   ✅ SDK integration for easy development\n');

    console.log('🚀 Phase 5 Enterprise Features Ready for Production!');
    console.log('   • Complete provider anonymity through white-labeling');
    console.log('   • Enterprise identity federation');
    console.log('   • Scalable multi-tenant architecture');
    console.log('   • Comprehensive API and SDK support');
    console.log('   • Production-ready security and monitoring\n');

    console.log('📖 Next Steps:');
    console.log('   1. Deploy to Kubernetes cluster');
    console.log('   2. Configure production databases and Redis');
    console.log('   3. Set up monitoring and alerting');
    console.log('   4. Create customer onboarding workflows');
    console.log('   5. Integrate with existing LMS systems\n');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure tenant service is running: pnpm dev');
    console.log('   2. Check database connection and Redis');
    console.log('   3. Verify environment variables in .env');
    console.log('   4. Review service logs for detailed errors');
    process.exit(1);
  }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase5Demo().catch(console.error);
}

export { runPhase5Demo };