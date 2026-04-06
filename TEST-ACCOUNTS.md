# 🧪 Proctoring Platform Test Guide

## 📝 **Test Accounts Overview**

Your proctoring platform now has **real sessions with actual violation detection** across multiple organizations. 

---

## 🔑 **Admin Test Accounts** 

### **Super Admin (All Organizations)**
- **URL**: `http://localhost:3002/admin/login`
- **Email**: `superadmin@ayan.ai`
- **Password**: `admin123`
- **Organization**: `🌟 Ayan.ai System Administration (System Admin)`
- **Access**: Can see ALL tenants and sessions across the entire platform

### **CS Department Admin (University)**
- **URL**: `http://localhost:3002/admin/login`
- **Email**: `admin@cs.university.edu`
- **Password**: `demo123`
- **Organization**: `Computer Science Department - University`
- **Access**: Can see only CS Department sessions

### **Engineering College Admin**
- **URL**: `http://localhost:3002/admin/login` 
- **Email**: `proctor@eng.college.edu`
- **Password**: `demo123`
- **Organization**: `Engineering College Assessment Center`
- **Access**: Can see only Engineering College sessions

### **Business School Admin**
- **URL**: `http://localhost:3002/admin/login`
- **Email**: `examiner@business.school.edu`
- **Password**: `demo123`
- **Organization**: `Business School Testing Services`
- **Access**: Can see only Business School sessions

---

## 👨‍🎓 **Test Candidate Accounts**

### **CS Department Students**
- `student001@cs.university.edu` - **Currently Active** (Low risk, clean session)
- `student002@cs.university.edu` - **Currently Active** (HIGH RISK with violations!)
- `student003@cs.university.edu` - Active/Completed (Medium risk)

### **Engineering College Students** 
- `student101@eng.college.edu` - **Currently Active** (Clean session)
- `student102@eng.college.edu` - **Currently Active** (CRITICAL RISK - Multiple violations!)

### **Business School Students**
- `student201@business.school.edu` - Completed (High score)
- `student202@business.school.edu` - **Currently Active** (CRITICAL RISK - Severe violations!)

---

## 🚨 **What Violations You'll See**

### **Real-Time Detected Violations:**
- 🗣️ **background_noise** - Audio detected during exam
- 👥 **multiple_people** - More than one person in camera view
- 🎤 **multiple_voices** - Multiple speakers detected
- 🫴 **camera_blocked** - Camera feed blocked/covered
- 👋 **face_not_visible** - Student moved away from camera
- 📱 **tab_focus_lost** - Student switched browser tabs
- ⬅️ **fullscreen_exit** - Student exited fullscreen mode

### **High-Risk Students to Check:**

#### **student002 (CS Dept) - HIGH RISK**
- Multiple people detected
- Multiple voices heard
- Face not visible periods
- Credibility: 65-80%

#### **student102 (Engineering) - CRITICAL RISK**
- Camera blocked
- Multiple people
- Background noise
- Tab switching
- Credibility: 55-80%

#### **student202 (Business) - CRITICAL RISK**
- Face not visible
- Camera blocked
- Multiple people + voices
- Tab/fullscreen violations
- Credibility: 35-65% (Very Low!)

---

## 🧪 **How to Test**

### **1. Login as Admin**
1. Go to `http://localhost:3002/admin/login`
2. Use any of the admin credentials above
3. You'll see the admin dashboard with real sessions

### **2. Check Live Sessions**
- **Super Admin**: See all sessions across all organizations
- **Org Admin**: See only your organization's sessions
- Sessions update every 5 seconds with real-time data

### **3. Observe Violations**
- Look for red/orange risk indicators
- Check violation counts in session tables
- Click on sessions to see detailed violation logs

### **4. Real-Time Updates**
- Session statuses change (active → completed)
- New violations appear randomly
- Credibility scores fluctuate
- Risk levels change based on violation patterns

---

## 📊 **Expected Data**

### **Super Admin Dashboard**
- **Total Sessions**: ~8-10 sessions across all orgs
- **Active Sessions**: 6-8 concurrent sessions  
- **Risk Alerts**: 3-5 high/critical risk students
- **Organizations**: 3 tenant organizations + super admin

### **Tenant Admin Dashboards**
- **CS Department**: 3 students, 1 with violations
- **Engineering**: 2 students, 1 with critical violations
- **Business School**: 2 students, 1 with severe violations

---

## 🎯 **Testing Scenarios**

### **Scenario 1: Super Admin Monitoring**
1. Login as `superadmin@ayan.ai`
2. Go to Analytics → See cross-tenant violation trends
3. Go to Tenant Management → See all customer usage
4. Check Dashboard → Monitor platform health

### **Scenario 2: Org Admin Session Management**
1. Login as `admin@cs.university.edu`
2. See only CS Department sessions
3. Monitor `student002` with violations
4. Watch real-time updates every 5 seconds

### **Scenario 3: Violation Investigation**
1. Login as `proctor@eng.college.edu`
2. Find `student102` with critical violations
3. Observe multiple violation types
4. See low credibility score (55-80%)

---

## 🔄 **Live Features**

- ✅ **Real-time updates** every 2-5 seconds
- ✅ **Dynamic violation generation** 
- ✅ **Changing session statuses**
- ✅ **Fluctuating credibility scores**
- ✅ **Live system metrics** (CPU, memory, etc.)
- ✅ **Multi-tenant isolation**
- ✅ **Cross-platform analytics** (super admin only)

---

## 📱 **Candidate Quiz Application** 

### **Demo Quiz URL**
**URL**: `http://localhost:3001`

### **Quick Test Login Options**
The candidate login page provides quick-select buttons for testing different violation scenarios:

#### **1. Clean Session (Low Risk)**
- **Candidate ID**: `student001@cs.university.edu`
- **Access Code**: `EXAM2024`
- **Organization**: CS University
- **Expected**: No violations, clean session

#### **2. Minor Violations (Medium Risk)**
- **Candidate ID**: `student002@cs.university.edu` 
- **Access Code**: `EXAM2024`
- **Organization**: CS University
- **Expected**: Background noise, brief focus loss

#### **3. High-Risk Session (Critical)**
- **Candidate ID**: `student003@cs.university.edu`
- **Access Code**: `EXAM2024`
- **Organization**: CS University
- **Expected**: Multiple violations, camera issues

#### **4. Multiple People Detected**
- **Candidate ID**: `student101@eng.college.edu`
- **Access Code**: `MIDTERM2024`
- **Organization**: Engineering College
- **Expected**: Multiple people, multiple voices

#### **5. Audio Violations**
- **Candidate ID**: `student102@eng.college.edu`
- **Access Code**: `MIDTERM2024`
- **Organization**: Engineering College  
- **Expected**: Background noise, multiple voices

#### **6. Focus & Navigation Issues**
- **Candidate ID**: `student201@business.school.edu`
- **Access Code**: `FINAL2024`
- **Organization**: Business School
- **Expected**: Tab focus lost, fullscreen exit

### **Manual Entry**
You can also manually enter:
- **Candidate ID**: Any email address
- **Access Codes**: `EXAM2024`, `MIDTERM2024`, `FINAL2024`

### **Candidate Testing Workflow**
1. Visit `http://localhost:3001`
2. Click a quick-select button or manual entry
3. Complete pre-exam setup (camera/microphone permissions)
4. Start the proctored exam
5. Check admin dashboards to see violations being detected in real-time

### **Integration with Admin Dashboards**
- Candidate sessions appear instantly in corresponding admin dashboards
- Violations are detected and reported in real-time
- Risk scores update dynamically based on candidate behavior
- Session data flows to the appropriate organization admin account

---

**🎉 Your platform is now ready for comprehensive testing with realistic violation scenarios!**