# AI Chatbot Application

A real-time AI chatbot web app built on the MERN stack, powered by Google's Gemini API and streamed live over Socket.io. Users can hold multiple conversations with the AI across different modes (General, Coding, Productivity, Learning), with full conversation history, editing, search, and customizable AI behavior.

## Live Demo

- Frontend: https://jackoonai.netlify.app
- Backend API: https://jackai-9e7r.onrender.com

## Features

- **Authentication** — JWT-based register/login/logout, protected routes
- **Real-time AI chat** — messages stream in live, token by token, via Socket.io (no page refresh, no waiting for a full response before seeing anything)
- **Multiple AI modes** — General, Coding, Productivity, and Learning, each with its own system prompt/personality
- **Edit & regenerate** — editing one of your own messages deletes everything that came after it and regenerates the AI's response from that point, the same way ChatGPT and Claude handle edits
- **Conversation management** — create, rename, delete, search, and auto-generated titles based on your first message
- **Customizable AI behavior** — adjust temperature, max response length, and a custom system prompt per account, from a dedicated Settings page
- **Dark/light mode** — persisted per-account, not just in the browser
- **Responsive design** — collapsible sidebar drawer on mobile, full sidebar on desktop
- **Rate-limit handling** — detects Gemini's free-tier rate limits vs. daily quota exhaustion and shows the user an accurate, non-misleading message (with a live countdown when the limit is genuinely short-lived)

## Tech Stack

**Backend**
- Node.js, Express
- MongoDB + Mongoose
- Socket.io (real-time messaging)
- Google Gemini API (`@google/genai`)
- JWT authentication, bcrypt password hashing

**Frontend**
- React 19 + Vite
- React Router
- Tailwind CSS v4
- Socket.io-client
- Axios

## Architecture Notes

- REST endpoints handle conversation/message CRUD, auth, and settings.
- Real-time AI responses are handled entirely over Socket.io — a client emits `send_message` or `edit_message`, and the server streams back `ai_response_start` → `ai_response_chunk` (repeated) → `ai_response_end`.
- Conversations are created lazily: nothing is written to the database until a user actually sends a first message, which keeps the sidebar free of abandoned empty conversations.
- The Gemini model in use is checked periodically — Google has retired several model versions in quick succession; if you see a 404 mentioning a model name, that's almost always a one-line model-string update in `backend/services/geminiService.js`, not a logic bug.

## Getting Started

### Prerequisites
- Node.js and npm
- A MongoDB Atlas account (free tier)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

### Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, and GEMINI_API_KEY in .env
npm run dev
```

### Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# .env defaults already point at localhost:5000 - only change this if your
# backend runs somewhere else
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Environment Variables

**Backend (`backend/.env`)**
```
MONGODB_URI=
PORT=5000
JWT_SECRET=
GEMINI_API_KEY=
NODE_ENV=development
CLIENT_URL=          # leave blank locally; set to your deployed frontend URL in production
```

**Frontend (`frontend/.env`)**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, returns a JWT |
| POST | `/api/auth/logout` | Log out (protected) |
| GET | `/api/auth/me` | Current user info (protected) |
| GET / POST | `/api/conversations` | List / create conversations |
| GET / PUT / DELETE | `/api/conversations/:id` | Get, rename, or delete a conversation |
| GET | `/api/conversations/search?query=` | Search conversations |
| GET / POST | `/api/conversations/:id/messages` | List / send messages in a conversation |
| PUT / DELETE | `/api/messages/:id` | Edit or delete a single message |
| GET / PUT | `/api/settings` | Get or update AI behavior settings |

**Socket.io events**

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `join_conversation` | `conversationId` |
| Client → Server | `send_message` | `{ conversationId, content }` |
| Client → Server | `edit_message` | `{ messageId, content }` |
| Client → Server | `leave_conversation` | `conversationId` |
| Server → Client | `message_received` | the saved message |
| Server → Client | `message_edited` | the edited message |
| Server → Client | `ai_response_start` | — |
| Server → Client | `ai_response_chunk` | `{ content }` |
| Server → Client | `ai_response_end` | the final saved AI message |
| Server → Client | `error` | `{ message, retryAfterSeconds?, detail }` |

## Deployment

- **Backend** → Render (or Railway), Web Service pointed at `backend/`, `npm install` build command, `npm start` start command
- **Frontend** → Netlify (or Vercel), pointed at `frontend/`, `npm run build` build command, `dist` publish directory
- After both are live, set `CLIENT_URL` on the backend host to the frontend's exact URL, and `VITE_API_URL`/`VITE_SOCKET_URL` on the frontend host to the backend's exact URL, then redeploy both.

## What I Learned

Building this project meant going deeper into a few things I hadn't worked with before:

- **WebSocket real-time communication** — structuring Socket.io events for a streaming chat experience, including managing rooms per conversation and handling reconnect/auth over sockets
- **Generative AI API integration** — working directly with a fast-moving external API (including handling model deprecations and free-tier rate limiting/quota gracefully instead of just surfacing a raw error)
- **Real-time UI state** — keeping React state in sync with a stream of incoming events rather than a single request/response cycle
- **Production-readiness details** — CORS configuration, environment-based config, and the kind of small UX bugs (stale cached settings, misleading error messages) that only show up once you actually use an app the way a real user would

## Future Enhancements

- Export a conversation as PDF
- Shareable read-only conversation links
- Thumbs up/down message ratings
- Voice input/output
