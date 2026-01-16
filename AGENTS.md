Hermes v0 - Current State (SvelteKit + Tailwind + Supabase)

# NEW FEATURES

## Proactive Checkins

- Model outputs action arrays per type (create/update/stage/notify/mood), which are merged into a single action list server-side.
- Every user message gets a normal response (default action).
- Checkins are the only proactive channel: a checkin both notifies and delivers a prompt.
- Checkins should feel like goal reminders, not fire alarms; they happen even without issues.
- Checkins should reference recent context when possible (e.g., “How did the sales call go?”).
- If the other user’s mood >= 0.6, a checkin can be shown sooner; otherwise queue it.
- Checkins always arrive as a notification first; the user opens it to start the prompt.

## Issue Mediation Flow

- Clarification stage always asks the user whether Hermes should gently surface the issue to the other cofounder.
- If the user declines, stay in clarification and offer reflection/self-improvement prompts.
- Hermes must always comply with the user’s request on whether to surface the issue.
- Stage gating: never advance stages unless criteria are satisfied; log every stage change.

## Message Types

- `response`: normal Hermes reply, left-aligned like a chat response.
- `checkin`: centered prompt style; used for rituals and proactive surfacing.

Goal

- Build a lightweight Hermes MVP for cofounder conflict journaling.
- Supabase auth + storage (no RLS for now), black/white shadcn-like styling.
- Two users only: Andrew and Nico (emails hardcoded for name mapping).
- **Core goal: act in the best interest of the cofounders’ relationship and the company’s productivity.**
- need to triage situations with good questions.
- should behave like it has really high eq (what r we really building)
- build a ritual for journaling somehow. should have good prompts to start the conversation.
- ai should feel proactive and it should feel like they actually care abt your wellbeing and the company and checks in

Next big problems

- how the fuck do we get the ai to bring up the problem to the other user?

Current App State

- Routes:
  - `/` login with email/password only.
  - `/chat` main chat UI, centered layout (~70% width).
  - `/dev` table view for profiles, issues, logs.
- UI:
  - Header row pinned top (Hermes left, issue pill centered, user dropdown right).
  - Issue pill: tiny glow dot + title, fly-in animation from above.
  - Each user sees their own highest-priority issue (no cross-user leakage).
  - Messages: Hermes left, user right, no names/timestamps, user bubble shrinks to content.
  - Composer pinned bottom (pill-shaped input with circular send button inside).
  - Chat scrolls behind header/composer with top/bottom fade.
  - Checkins render as centered prompt messages.
- Data:
  - Supabase tables: `profiles`, `issues`, `chat_sessions`, `chat_messages`, `logs`, `checkins`.
  - `issues.context` stores evolving summary text.
- `chat_messages.message_type` supports `response` or `checkin`.
- `logs.actions` stores the action list per response.
- `profiles.mood_score` and `profiles.mood_confidence` can be updated by agent actions.
  - Single session per user; messages stored per session.
  - Issue creation uses OpenAI via `/api/assistant`.

- Notifications:
  - Daily check-in toast (once per user per day).
  - Proactive toast when other cofounder sends a new message (polling).
- Admin:
  - Reset history action via user dropdown, calls `/api/reset` to clear messages/issues/logs/sessions and reset mood fields.
- Testing:
  - `testing-messages.md` contains Andrew-to-Hermes starter complaints.
  - `tests.md` contains expected action/log outputs for stage gating + checkins.

Recent Changes

- Rebuilt app to Supabase (removed local JSON system).
- Tightened issue title prompt with concrete examples, global issue context, and update semantics.
- Added reset API + dropdown control.
- Added notifications (check-in + other-user updates).
- Added action list handling with checkin delivery and strict JSON schema responses.
- Added OpenAI error logging for non-200 responses.
- Added mood update action handling.
- Added other-profile context for notify_other UUIDs and checkin insert error logging.

Future Features

- Mood scoring + confidence gating.
- Issue detection pipeline + staged resolution.
- Soft surfacing, escalation, scheduling.
- Realtime updates (websocket/Supabase Realtime).
- Auth hardening + RLS.
- Calendar integrations.
- Customize your experience (tone setting).
- Tone shifts based on user personality + current mood.
- Mobile support.
- Tone settings can be user-configurable (per your “write that down” note).
- Make it really startup focused.
- Not just 1 chat thread. maybe daily threads even? that would be pretty good
- See progress in all aspects of ur life based on the journaling conversations
