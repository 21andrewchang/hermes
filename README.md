# Hermes MVP (Supabase)

Minimal SvelteKit prototype for Hermes using Supabase auth + storage.

## Setup

```sh
npm install
npm run dev
```

Add environment variables to `.env`:

```sh
OPENAI_API_KEY=your-key
PUBLIC_SUPABASE_URL=your-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Routes

- `/` login (email + password only)
- `/chat` main chat UI
- `/dev` logs + profiles + issues snapshot

## Supabase tables

Use the SQL in the latest setup notes to create:

- `profiles`
- `issues`
- `chat_sessions`
- `chat_messages`
- `logs`
