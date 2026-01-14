# Hermes - Property Operations Platform

## Overview
Hermes is an agentic property operations copilot with two main modules:
1. **Inbox** - AI-powered issue creation from pasted emails/SMS via chat
2. **Payables** - Invoice upload with automatic data extraction and issue matching

Stack: SvelteKit, Supabase, OpenAI (GPT-4o-mini), Google Document AI

---

## Module 1: Inbox (Issue Creation)

### UX Flow
1. User pastes email/SMS into chat (e.g., "This is from unit 401 Mariposa")
2. AI extracts building, unit, description from the text
3. AI calls `create_issue` tool to create issue in Supabase
4. Inbox list updates immediately with the new issue
5. AI replies with a summary and suggested action

### Architecture
- **Client**: Chat panel posts messages to server endpoint
- **Server**: SvelteKit API endpoint orchestrates OpenAI tool calls (all model calls server-side)
- **Data**: Issues in Supabase `issues` table, chat history in `chat_sessions`/`chat_messages`

### Key Files
- `src/routes/api/chat/+server.ts` - Chat endpoint with OpenAI tool calling
- `src/lib/server/openai.ts` - OpenAI client (server-only, uses `OPENAI_API_KEY`)

### System Prompt
The AI is instructed to:
- Extract building, unit, description from pasted emails/texts
- Call `create_issue` tool when it has enough info
- Ask clarifying questions if required fields are missing
- Default action to "Message Esther" (on-site assistant) unless issue is severe

### Tool: `create_issue`
```typescript
{
  building: string,      // e.g., "Mariposa", "Willoughby"
  unit: string,          // e.g., "401", "5"
  description: string,   // One-line problem summary
  action?: string,       // "Message Esther" or "Message vendor"
  status?: IssueStatus,  // Defaults to "Needs Approval"
  reported_at?: string   // ISO timestamp
}
```

### Issue Status Flow
`Needs Approval` → `Review` → `Pending` → `In Progress` → `Complete`

### Database Tables
```sql
-- Issues table
issues (id, reported_at, building, unit, description, action, status, is_draft)

-- Chat tables
chat_sessions (id, title, created_at)
chat_messages (id, session_id, role, content, tool_name, tool_args, created_at)
```

---

## Module 2: Payables (Invoice Processing)

### UX Flow
1. User clicks "Upload Invoice" in Payables tab
2. User selects PDF file
3. PDF uploaded to Supabase Storage (`invoices` bucket)
4. Invoice record created with `processing_status: 'processing'`
5. Background processing:
   - Google Document AI extracts entities
   - Address parser extracts building/unit from `receiver_address`
   - OpenAI fills missing fields as fallback
   - Invoice matched to existing issues by building + unit
6. Invoice appears in Payables table with extracted data

### Key Files
- `src/routes/api/invoices/+server.ts` - Invoice upload, Document AI processing, status updates
- `src/lib/server/addressParser.ts` - Parses receiver_address to extract building/unit
- `src/lib/types/invoices.ts` - Invoice type definitions

### Processing Pipeline
```
PDF Upload → Supabase Storage → Document AI → Address Parsing → OpenAI Fallback → Issue Matching → Save to DB
```

### Document AI Entity Extraction
- **Line items**: `line_item` entities with `line_item/description` properties (joined with semicolons)
- **Address**: `receiver_address` - Parsed to extract street address and unit number
- **Amount**: `total_amount`, `invoice_total`, `amount`

### Address Parsing (`src/lib/server/addressParser.ts`)
Uses `@zerodep/address-parse` library with regex fallback for unit extraction.

**Handles formats:**
- `unit 501`, `Unit #501`, `apt 5`, `Apt. 5`
- `suite 100`, `Ste 100`, `#5`
- Newline-separated: `"1038 S Mariposa Ave\nunit 501"`

**Returns:**
```typescript
{
  streetAddress: string | null,  // "1038 S MARIPOSA AVE"
  unit: string | null,           // "501"
  city: string | null,
  state: string | null,
  zip: string | null
}
```

### Issue Matching Logic
1. Extract building & unit from invoice
2. Query ALL issues (including Complete - work done but vendor unpaid)
3. Filter by building AND unit (case-insensitive)
4. If exactly 1 match → link invoice to that issue
5. If multiple matches → use OpenAI to compare descriptions
6. If no matches → leave `issue_id` as null (standalone payable)

### Invoice Status Flow
`Pending` → `Approved` → `Paid`

Note: Invoice status is **decoupled** from issue status. An issue can be Complete while its invoice is still Pending.

### API Endpoints
- `GET /api/invoices` - Fetch all invoices
- `POST /api/invoices` - Upload PDF, create record, trigger processing
- `PATCH /api/invoices` - Update invoice status

### Database Table
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  building TEXT,
  unit TEXT,
  description TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'Pending',
  processing_status TEXT DEFAULT 'pending',
  error_message TEXT
);
```

---

## Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=

# Supabase
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=

# Google Cloud (Document AI)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_LOCATION=us  # or 'eu'
```

## Authentication
- **OpenAI**: API key in environment variable
- **Document AI**: Application Default Credentials
  - Run `gcloud auth application-default login` to authenticate locally
  - No service account key files needed
- **Supabase**: Anon key for client operations

---

## UI Structure
- **Inbox Tab**: Issues table + chat panel for AI-powered issue creation
- **Payables Tab**: Invoices table + upload modal for PDF processing

### Security
- `OPENAI_API_KEY` never exposed to browser (server-only)
- All AI/Document processing runs server-side
- Consider rate limiting `/api/chat` and `/api/invoices` per session/IP
