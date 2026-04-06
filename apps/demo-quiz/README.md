# Demo Quiz Application

A comprehensive demonstration application showcasing Ayan.ai proctoring system integration capabilities.

## Overview

This Next.js application simulates a real-world assessment platform that integrates with the Ayan.ai proctoring system. It demonstrates:

- Complete quiz functionality with 10 financial literacy questions
- Timer-based assessment (15 minutes)
- Real-time communication with proctoring system
- Iframe compatibility for Tier 3 integration
- White-label tenant branding support
- Results calculation and submission

## Features

### 🎯 Quiz Functionality
- **10 Financial Literacy Questions**: Covering compound interest, credit scores, investments, budgeting, and insurance
- **15-minute timer** with visual warnings at 25% (warning) and 10% (critical) remaining
- **Question navigation**: Progress tracking, overview grid, back/next functionality
- **Results calculation**: 70% passing score with detailed feedback
- **Mobile responsive**: Works on desktop, tablet, and mobile devices

### 🔗 Proctoring Integration
The quiz communicates with the parent proctoring system via postMessage API:

```typescript
// Events sent to proctor system
QUIZ_STARTED → { examId, candidateId, startTime }
ANSWER_SELECTED → { questionId, questionNumber, selectedOption, timestamp }
QUIZ_COMPLETED → { answers, score, passed, timeSpent, endTime }
QUIZ_INTERRUPTED → { currentQuestion, answeredQuestions, reason }
```

### 🎨 White-Label Branding
- Iframe-compatible design
- Tenant branding support (when integrated with main system)
- No hardcoded provider references
- Custom styling support

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
The quiz will be available at http://localhost:3001

### 3. Production Build
```bash
npm run build
npm start
```

## Demo Data Setup

### Generate Sample Data
```bash
# Generate demo data following Ayan.ai entity structure
npm run seed:demo

# Or run the full setup script
npm run setup:demo
```

This creates:
- **Organisation**: Computer Science Department
- **Exam**: Financial Literacy Challenge 2026
- **Batches**: Fall 2026 and Spring 2027 CS Cohorts
- **Deliveries**: Scheduled assessment sessions
- **Sessions**: Ready-to-use proctoring sessions

### Apply to Database
```bash
# Apply generated SQL to PostgreSQL
psql -d ayan_db -f seed-data/demo-quiz-seed.sql
```

## Integration with Ayan.ai Proctoring

### Tier 3 Integration (iframe)
1. Start the demo quiz app: `npm run dev`
2. Configure exam in Ayan.ai with `exam_app_url: "http://localhost:3001"`
3. Create proctoring session using generated session IDs
4. Candidate verification → quiz loads in iframe → monitoring begins

### Entity Structure Demonstration
```
Computer Science Department (Organisation)
└── Financial Literacy Challenge 2026 (Exam)
    ├── Fall 2026 CS Cohort (Batch)
    └── Spring 2027 CS Cohort (Batch)
        └── Scheduled Deliveries
            ├── Tomorrow (3 candidates)
            ├── +3 Days (2 candidates)
            └── +7 Days (3 candidates)
                └── Ready Sessions for Proctoring
```

## TAO CE Integration Proof

This demo application proves seamless TAO CE 2025 integration by:

- ✅ **Same Entity Structure**: Exam → Batch → Delivery → Session hierarchy
- ✅ **External ID Mapping**: All entities include `external_id` fields
- ✅ **JWT Authentication**: Candidate context from external systems
- ✅ **Session Lifecycle**: Compatible with TAO delivery execution
- ✅ **Results Format**: Standard format for gradebook sync
- ✅ **Iframe Compatibility**: Works with TAO's assessment framework

## File Structure

```
apps/demo-quiz/
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind styles
│   │   ├── layout.tsx           # App layout
│   │   └── page.tsx             # Main quiz page
│   ├── components/
│   │   └── QuizInterface.tsx    # Main quiz component
│   └── lib/
│       ├── quiz-data.ts         # 10 question dataset
│       └── utils.ts             # Utility functions
├── scripts/
│   ├── seed-demo-data.ts        # Data generation script
│   └── setup-demo.sh            # Quick setup script
└── package.json
```

## Configuration

### Exam Configuration (for proctoring system)
```json
{
  "exam_app_url": "http://localhost:3001",
  "iframe_sandbox": "allow-scripts allow-same-origin allow-forms",
  "completion_signal": "postMessage",
  "addons_config": {
    "face_verify": true,
    "id_verify": true,
    "env_scan": true,
    "screen_record": true,
    "browser_lock": true
  }
}
```

### Tenant Branding (example)
```json
{
  "organization_name": "Computer Science Department - University",
  "support_email": "exams@cs.university.edu",
  "primary_color": "#1e40af",
  "secondary_color": "#f59e0b"
}
```

## Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run seed:demo` - Generate demo data
- `npm run setup:demo` - Complete setup with instructions
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **PostMessage API** - Parent iframe communication

## Integration Testing

1. **Standalone Testing**: Run quiz independently to verify functionality
2. **Iframe Testing**: Embed in test page to verify postMessage communication
3. **Proctoring Testing**: Full integration with Ayan.ai system
4. **Entity Testing**: Verify database relationships match expected structure

## Support

For questions about this demo quiz application or Ayan.ai integration:
- Check the main Ayan.ai documentation in `/MASTER-PLAN.md`
- Review the entity structure in the seeding script
- Test integration events in browser console

This demo application showcases the complete integration capability and serves as proof of concept for TAO CE and other assessment platform compatibility.