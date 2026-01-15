Hermes v0 - Implementation Plan (SvelteKit + Tailwind, One-Page App)

Goal
- Build a one-page SvelteKit webapp with Tailwind CSS that supports a single-machine demo.
- No auth, no external DB, no sync. Local JSON files act as the "db".
- Two users only: Andrew and Nico.
- A settings field to select between each single-user POV or side-by-side view.

Stage 1: Single-Client Demo (Local JSON, No Auth)
1) UX and layout
   - One-page layout with chat UI and a minimal header saying founder's name and Chat (Andrew Chat).
   - Settings buttons: select between each single-user POV or side-by-side view.
   - Responsive layout: desktop only right now.

2) Local JSON storage (file-backed)
   - Use a server-side API route to read/write JSON files in a local `data/` folder.
   - JSON files:
     - `data/chat_andrew.json` (Andrew's chat log)
     - `data/chat_nico.json` (Nico's chat log)
     - `data/profiles.json` (Andrew + Nico profiles)
     - `data/conversation_topics.json` (shared issue list; includes `created_by_user_id`)

3) Data structure (align to current plan)
   - Profiles (profiles.json):
     - id: stable identifier (string)
     - name: display name
     - role: "a" or "b"
   - Chat logs (chat_andrew.json, chat_nico.json):
     - id: message id (string)
     - sender_id: profile id
     - sender_type: "user" or "ai"
     - content: message text
     - timestamp: ISO string
   - Conversation topics (conversation_topics.json):
     - id: topic id (string)
     - created_by_user_id: profile id of the founder who raised it
     - title: short label (auto)
     - stage: detected | clarified | self_improvement | surfaced_soft | escalated_detail | scheduled | resolved
     - blame: numeric split score (how much of this from 0-100 is this the user's fault? 100 = this is 100% the user's fault not the opposing party)
     - split_confidence_internal: confidence for the split score
     - severity: low | med | high
     - evidence_json: sentence tags (fact/interpretation/assumption/emotion/request)
     - latest_summary: neutral summary
     - blocked_by_mood: boolean
     - blocked_reason: sender_low | receiver_low | low_confidence
     - next_checkin_at: ISO string or null
     - last_surfaced_at: ISO string or null
     - created_at: ISO string
     - updated_at: ISO string

4) Chat UI behavior
   - In-memory state mirrors the JSON store.
   - Message bubbles:
     - User: stone-200 background, right aligned, 70% width
     - Hermes: 100% width, no background, left aligned
   - Composer with Enter-to-send (Shift+Enter for newline).

5) OpenAI agent call (server-side)
   - Create a server endpoint (e.g., `/api/assistant`) invoked after a user sends a message.
   - Payload includes:
     - The new user message
     - Full chat logs for BOTH users
   - Agent tasks:
     - Estimate each person's mood and update mood scores
     - Update conversation_topics and any other fields we can infer
     - Leave fields unchanged when not confident
   - Response:
     - A single Hermes reply that acknowledges the current situation and context
     - A digest of server-side updates applied to JSON (what changed and why)
   - Safety:
     - The agent can read both founders' logs to understand context
     - The agent must NOT reveal or paraphrase the other founder's private messages
     - Responses must stay within the sender's own context
     - Sharing is completely off in v0, even if the sender explicitly requests it
     - Other logs are used only for internal updates and assistant context
   - Data writes happen in server-side functions (no internal HTTP calls).

6) Notifications (web-only MVP)
   - On page load, show a lightweight on-screen toast in the top right showing a “check-in” prompt.
   - Time-based logic using local storage (e.g., once per day).

Stage 2: Shared Server Demo
- Title only: "Single shared backend (JSON -> SQLite/Postgres), multi-device sync."

Stage 3: Realtime
- Title only: "Realtime updates (websocket/Supabase Realtime)"

Future features
- Mood scoring + confidence-based gating.
- Issue detection/clarification pipeline.
- Soft surfacing, escalation, scheduling.
- Realtime live updates.
- Auth + access control.
- Calendar integrations.
- mobile.
