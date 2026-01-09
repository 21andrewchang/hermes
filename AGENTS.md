## Agentic Inbox Plan (Text Chat + Tool Calls)

### Overview
- Goal: Turn the current Inbox (CRUD spreadsheet clone) into an agentic workflow where users paste an email/text into chat, the AI understands building/unit, proposes an action, and creates an Issue automatically.
- Constraints: Keep `OPENAI_API_KEY` server‑side. Use SvelteKit runes, Supabase for data, and minimal UI disruption to current Inbox.

### Desired UX
- User pastes an email/SMS transcript into the chat and types “This is from unit 401 Mariposa”.
- Assistant reads the text, extracts building/unit, description, infers status/action, and:
  - Creates the Issue in Supabase (no empty rows), and
  - Replies with a natural language summary + explicit action suggestion.
- The Inbox list updates immediately with the newly created, fully populated row.

### Architecture
- Client: Chat panel posts messages to a server endpoint.
- Server: SvelteKit API endpoint orchestrates OpenAI tool calls. All model calls run server‑side.
- Data: Issues live in Supabase `issues`. Add chat session/message tables for history and tool audit.

### Data Model (Supabase)
- Tables
  - `chat_sessions` (id uuid pk default gen_random_uuid(), title text, created_at timestamptz default now())
  - `chat_messages` (
    - id uuid pk default gen_random_uuid(),
    - session_id uuid references chat_sessions(id) on delete cascade,
    - role text check (role in ('user','assistant','tool')),
    - content text not null default '',
    - tool_name text null,
    - tool_args jsonb null,
    - created_at timestamptz default now()
  )
  - (Optional) `chat_runs` to log model, cost, timings

### OpenAI Integration
- Library: `openai` (server‑only). Model: `gpt-4o-mini` (text) or `gpt-4o-mini-text`.
- Tool calling: Define JSON‑schema tools the model can call; server executes, then returns updated messages back to the model if needed.
- Core tool: `create_issue` with params { building, unit, description, action?, status='Pending', reported_at? }.
- Support tools (as needed): `update_issue(id, fields)`, `search_units(building)`, `get_buildings()`.

### API Endpoints (SvelteKit)
- `POST /api/chat` (server)
  - Body: { sessionId?, text, context: { building?, unit? } }
  - Steps:
    1) Persist user message in `chat_messages`.
    2) Build OpenAI messages with a system prompt and the user text.
    3) Provide tool definitions; call model.
    4) If model returns a tool call, execute it (e.g., write to `issues`).
    5) Persist tool result as a `tool` message. Optionally re‑call the model to produce a final assistant message.
    6) Return assistant message and any created issue record to the client.

### System Prompt (Sketch)
- “You are a property ops assistant. Extract building, unit, description, and suggest an action from pasted emails/texts. Prefer calling tools when you can create or update an issue; ask clarifying questions if required fields are missing. Never invent data.”

### Tools (Function Specs)
- `create_issue`
  - description: Create a new issue in the inbox.
  - input: {
    - building: string,
    - unit: string,
    - description: string,
    - action?: string,
    - status?: 'Pending' | 'In Progress' | 'Complete',
    - reported_at?: string (ISO)
  }
  - returns: the created issue row from Supabase.
- (Optional) `update_issue`, `search_units`, `get_buildings` to help the model resolve ambiguity.

- Compose chat message: plain text; POST to `/api/chat`.
- Display assistant replies with inline “Created Issue #ID” + suggested action text.
- When an issue is created via tool, optimistically insert into current `entries` (or re‑fetch server data), mapping to the existing `TableEntry` shape.
- Guardrails (existing): only complete issues upsert; single draft at a time.

### Incremental Implementation Plan
1) Tables
   - Create `chat_sessions`, `chat_messages` tables.
2) Chat API (non‑streaming)
   - `POST /api/chat` that calls OpenAI with tools, handles one tool call (create_issue), and returns final assistant text + created issue (if any).
3) Client wiring
   - Use existing chat input; send message to `/api/chat`; update Inbox on response.
4) Validation & UX
   - If model lacks required fields, assistant asks a clarifying question rather than creating an empty issue.
5) Streaming (optional)
   - Upgrade `/api/chat` to SSE for token streaming; progressive UI updates.

### Supabase SQL (COMPLETED BY USER)
```sql
create table if not exists public.chat_sessions (
	id uuid primary key default gen_random_uuid(),
	title text,
	created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.chat_sessions(id) on delete cascade,
	role text not null check (role in ('user','assistant','tool')),
	content text not null default '',
	tool_name text,
	tool_args jsonb,
	created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on public.chat_messages(session_id, created_at);
```

### Server Stubs (Files to Add)
- `src/routes/api/chat/+server.ts`: orchestrates OpenAI tool calls (create_issue), persists chat history, returns assistant message + issue.
- `src/lib/server/openai.ts`: OpenAI client with `OPENAI_API_KEY` (server‑only env).
- `src/lib/ai/tools.ts`: Type‑safe tool registry (create_issue, update_issue…).

### Security & Limits
- Never expose `OPENAI_API_KEY` to the browser; all calls from server routes.
- Consider rate limiting `/api/chat` per session/IP.

- Paste email/SMS text into chat; server receives the text.
- Assistant extracts building/unit/description from the pasted text or user hint.
- Assistant calls `create_issue`; Supabase `issues` row is created; Inbox updates immediately.
- Assistant replies with a human summary and a suggested action.
- If required fields are missing, assistant asks a clarifying question instead of creating an empty issue.

### Stretch Goals
- OCR fallback for low‑quality images.
- Multi‑turn tool use: ask for missing unit/building, then create.
- Streaming assistant responses.
- RAG over building/unit knowledge (tenant rosters, vendor playbooks).
