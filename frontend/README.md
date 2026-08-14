# Sogno Enterprise — Frontend
 
> The React SaaS interface for the Sogno Enterprise RAG assistant.
 
This is the client application employees use to ask questions against the company knowledge base. It handles the conversation UI, response interactions, and application-level data (auth, conversation history, unanswered-question tracking) — the RAG pipeline itself lives in the separate [backend demo][https://sogno-entreprise.onrender.com/docs](https://sogno-entreprise.onrender.com/docs).
 
Live: [https://sogno-entreprise.vercel.app](https://sogno-entreprise.vercel.app)

---
## What Are The Key Features
 
**A chat interface** that sends employee questions to the backend's `POST /ask` endpoint and renders the grounded response. Beyond the basic Q&A loop, two things are worth calling out:
 
**Unanswered questions are tracked** When the backend can't answer from the available documents, the frontend doesn't just show an error — it logs the question as a knowledge gap in Supabase for later review. That turns "the AI didn't know" into a signal for what's missing from the document set, instead of a dead end.
 
**Application data and AI processing are kept separate.** Supabase handles auth, conversation history, and question-gap tracking. The FastAPI backend handles retrieval and generation exclusively. Neither AI provider credentials nor retrieval logic ever touch the frontend or Supabase — the browser only ever talks to the RAG API's public `/ask` endpoint.

---
## Application Architecture

The frontend acts as the presentation and interaction layer of the Sogno Enterprise platform.

```text
                         ┌─────────────────────┐
                         │        User         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    React Frontend   │
                         │  Dashboard          │
                         │  Chat Interface     │
                         │  Sidebar            │
                         │  Conversations     │
                         │  Message Actions    │
                         └──────────┬──────────┘
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
              ┌─────────────────┐       ┌─────────────────┐
              │    Supabase     │       │   FastAPI API   │
              │                 │       │                 │
              │ Auth / Data     │       │    POST /ask    │
              │ Question Gaps   │       │                 │
              └─────────────────┘       └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │   RAG Backend   │
                                        │                 │
                                        │ Retrieval       │
                                        │ Qdrant          │
                                        │ LLM Generation  │
                                        └─────────────────┘
```

The frontend does not run the RAG pipeline itself.
Instead, it communicates with the dedicated backend through the API.

---
 
# Tech stack
 
| Layer | Choice |
|---|---|
| Framework | React + TypeScript |
| Build tool | Vite |
| Routing | React Router |
| Icons | Lucide React |
| App data / auth | Supabase |
| AI backend | [Sogno Enterprise RAG API](https://sogno-entreprise.onrender.com/docs) (FastAPI) |
| Deployment | Vercel |
 
---
 
## Project structure
 
```
src/
├── components/
├── pages/
├── assets/
├── App.tsx
└── main.tsx
```
 
---
## Author
 
**Samia Djafi** — Computer Science Engineering Student, Artificial Intelligence
 
RAG · LLMs · React · TypeScript · FastAPI
