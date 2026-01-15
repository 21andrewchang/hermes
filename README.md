# Hermes v0 (local demo)

Single-machine SvelteKit prototype using local JSON files as storage.

## Setup

```sh
npm install
npm run dev
```

## Data files

Local JSON storage lives in `data/`:

- `data/profiles.json`
- `data/chat_andrew.json`
- `data/chat_nico.json`
- `data/conversation_topics.json`

## API endpoints

- `GET /api/profiles`
- `GET /api/chat/andrew`
- `GET /api/chat/nico`
- `POST /api/chat/:user` (body: `{ "content": "..." }`)
- `GET /api/conversation-topics`
- `POST /api/conversation-topics`

## UI

- One page with a settings button group to switch POV.
- Side-by-side mode shows both chats for testing.
