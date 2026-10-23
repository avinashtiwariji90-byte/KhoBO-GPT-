# ORA GPT - Enterprise AI SaaS Platform ⚡

**ORA GPT** is a complete, production-ready, full-stack AI SaaS platform featuring conversational intelligence, deep document RAG search (PDF, DOCX, CSV, TXT), autonomous AI lead generation, and business/admin management dashboards.

---

## 🌟 Key Features

1. **Modern Original AI Chatbot Interface**
   - Token-by-token real-time streaming effect
   - Multi-turn conversational memory
   - Message editing & instant response regeneration
   - Copy response & syntax-highlighted code blocks
   - Conversation history sidebar with Search, Pin/Unpin, Rename, and Delete
   - Direct file attachments inside the chat

2. **Document Understanding & RAG Pipeline**
   - Supports **PDF, DOCX, TXT, CSV, JSON, MD, and Images**
   - Automated text extraction, chunking, and semantic vector indexing
   - Chat with uploaded documents using contextual citations

3. **Autonomous AI Lead Assistant**
   - Automatic entity extraction (Client Name, Phone/Email, Requirement, Budget, Location)
   - Real-time lead capture from conversation directly into the Business CRM

4. **Business & CRM Dashboard**
   - Real-time lead metrics (Total Leads, New, Contacted, Qualified, Converted, Conversion Rate)
   - Filter leads by status and search keywords
   - Status pipeline updating (`New`, `Contacted`, `Qualified`, `Converted`, `Closed`)
   - Export leads data as CSV
   - Business company profile & webhook settings

5. **Subscription & Quota System**
   - **FREE Plan**: 30 messages/month, 3 files
   - **BUSINESS Plan**: 500 messages/month, 50 files, Lead Assistant, CRM Hub
   - **PRO Plan**: 5,000 messages/month, 200 files (25MB each), SLA, Advanced Analytics
   - Integrated mock payment sandbox for instant plan testing

6. **Admin Dashboard**
   - Global system metrics & estimated revenue analytics
   - User account moderation (Suspend / Unsuspend, change roles and plans)
   - Business tenant registry
   - Privacy-safe conversation metadata monitoring (private chat bodies are strictly protected)
   - System audit logging

7. **Security & Production Architecture**
   - Asynchronous Python FastAPI backend
   - SQLAlchemy models with SQLite/PostgreSQL/MySQL support
   - JWT authentication + bcrypt password hashing
   - Role-Based Access Control (`user`, `business`, `admin`)
   - Server-side environment variables (Zero client-exposed API keys)

---

## 🚀 Quick Start

### Option 1: One-Click Launch (Windows)
Double-click:
```
c:\xampp\htdocs\ora-gpt\START_ORA_GPT.bat
```

### Option 2: Manual Start

#### Backend:
```bash
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend:
```bash
cd frontend
npm run dev
```

Visit:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔐 Pre-Seeded Test Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@oragpt.ai` | `Admin@123` | System Control Panel, User Suspension, Audit Logs |
| **Business** | `business@oragpt.ai` | `Business@123` | Business Hub, Leads CRM, CSV Export |
| **User** | `user@oragpt.ai` | `User@123` | AI Chat, File Uploads, Document Q&A |

*(Quick-login buttons are also provided directly on the Login page for 1-click testing!)*
