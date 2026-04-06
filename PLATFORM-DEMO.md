# 🎬 Proctoring Platform Demo Guide

## 🚀 **Quick Start Demo (5 minutes)**

This guide walks you through demonstrating the complete proctoring platform in 5 minutes.

---

## 📋 **Pre-Demo Checklist**

Before starting the demo, ensure these services are running:

```bash
# Check all services are running
curl -s http://localhost:3001 > /dev/null && echo "✅ Candidate Quiz App (Port 3001)"
curl -s http://localhost:3002 > /dev/null && echo "✅ Admin Dashboard (Port 3002)"  
curl -s http://localhost:4001/health > /dev/null && echo "✅ Control Plane (Port 4001)"
curl -s http://localhost:4002/health > /dev/null && echo "✅ Tenant Service (Port 4002)"
```

---

## 🎯 **Demo Script (5 Minutes)**

### **Step 1: Show Admin Dashboard [1 minute]**

1. **Open Admin Dashboard**: `http://localhost:3002/admin/login`
2. **Login as Super Admin**:
   - Email: `superadmin@ayan.ai`
   - Password: `admin123`
3. **Highlight Key Features**:
   - Live monitoring of all organizations
   - Real-time violation alerts
   - Multi-tenant data isolation
   - Dynamic risk scoring

*"This is the super admin view showing live proctoring sessions across all our client organizations. Notice the real-time violation detection and risk scoring."*

### **Step 2: Demonstrate Multi-Tenancy [1 minute]**

1. **Logout and login as CS Department Admin**:
   - Email: `admin@cs.university.edu`  
   - Password: `demo123`
2. **Show Tenant Isolation**:
   - Only CS Department sessions visible
   - Violations specific to their students
   - Organization-specific branding/data

*"Each organization admin only sees their own students and data. This ensures complete privacy and compliance between clients."*

### **Step 3: Start New Candidate Session [2 minutes]**

1. **Open Candidate App**: `http://localhost:3001` (new tab)
2. **Choose Test Scenario**:
   - Click "High-Risk Session" quick button
   - Shows: `student003@cs.university.edu` / `EXAM2024`
   - Click "Start Proctored Exam"
3. **Go Through Setup**:
   - Camera permission prompt
   - Microphone permission
   - Identity verification
   - Pre-exam instructions

*"This is what students see. The AI proctoring validates identity, checks equipment, and ensures exam integrity before the test begins."*

### **Step 4: Show Real-Time Monitoring [1 minute]**

1. **Switch back to Admin Dashboard**
2. **Watch New Session Appear**:
   - New active session shows up immediately  
   - Risk indicators start appearing
   - Violation timeline updates in real-time
3. **Point Out Violations**:
   - Camera blocked alerts
   - Multiple people detected
   - Audio anomalies
   - Behavioral flags

*"Watch how the AI detects violations in real-time. The admin can see exactly what happened and when, with specific timestamps and confidence scores."*

---

## 🎨 **Demo Talking Points**

### **Technical Innovation**
- "Our AI agents deploy per-session for scalability"
- "Computer vision detects face recognition, multiple people"  
- "Audio AI identifies background noise, multiple voices"
- "Behavioral AI tracks focus patterns, navigation"

### **Business Value**
- "Fully self-contained - no external API dependencies"
- "Multi-tenant architecture scales to hundreds of organizations"
- "Real-time alerts prevent cheating as it happens"
- "Comprehensive audit trail for compliance"

### **Competitive Advantage**
- "Open source core with commercial enterprise features"
- "Pluggable AI modules - swap in custom models"
- "Kubernetes-native for cloud or on-premise deployment"
- "SDK allows integration into existing exam platforms"

---

## 🔧 **Advanced Demo Features**

### **AI Customization**
- Show different violation thresholds per organization
- Demonstrate custom AI model integration
- Configure organization-specific rules

### **Analytics Deep Dive**
- Cross-tenant violation trends (super admin)
- Risk distribution analytics
- System performance monitoring
- Candidate behavior patterns

### **Integration Showcase**  
- LiveKit media streaming integration
- Kafka event processing pipeline
- PostgreSQL + TimescaleDB data architecture
- MinIO recording storage system

---

## 🎪 **Demo Variations**

### **5-Minute Version** (Executive Demo)
- Super admin view → Multi-tenancy → Candidate flow → Real-time violations

### **15-Minute Version** (Technical Demo)
- Above + Advanced features + AI customization + Analytics

### **30-Minute Version** (Deep Dive)
- Complete platform walkthrough + Architecture + Integration + Q&A

---

## 🗣️ **Sample Demo Dialogue**

**Opening**: "Let me show you our agentic AI proctoring platform. What makes this unique is that AI agents deploy per exam session and provide real-time violation detection."

**Admin Dashboard**: "The super admin can monitor all client organizations, while each organization only sees their own data. Notice how violations appear in real-time with confidence scores."

**Candidate Side**: "Students get a smooth experience with automated setup and AI-powered identity verification. The proctoring is invisible to them but comprehensive for admins."

**Real-Time Features**: "Watch this - violations appear instantly. The AI detected multiple people in the video feed, background audio, and suspicious navigation. All timestamped and auditable."

**Closing**: "This platform scales to handle thousands of concurrent exams while maintaining enterprise-grade security and compliance. Want to see the technical architecture?"

---

## 📊 **Demo Success Metrics**

After each demo, the platform showcases:
- ✅ Multi-tenant isolation working properly
- ✅ Real-time violation detection operating  
- ✅ Candidate experience streamlined
- ✅ Admin monitoring comprehensive
- ✅ System scalability demonstrated

---

**🎬 You're now ready to give impressive demos that showcase the full power of the agentic AI proctoring platform!**