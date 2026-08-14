# Sogno Enterprise — RAG Backend

> A retrieval-augmented generation backend that lets employees query an internal knowledge base in natural language, without the answers wandering off into the model's pretrained guesses. [https://sogno-entreprise.onrender.com/docs](https://sogno-entreprise.onrender.com/docs)



Sogno Enterprise is an AI-powered internal knowledge assistant designed to answer employee questions using a controlled collection of company documents.

The backend implements a complete **Retrieval-Augmented Generation pipeline**, from document ingestion and preprocessing to semantic retrieval, role-based access filtering, prompt augmentation, LLM generation, and a FastAPI interface consumed by the SaaS frontend.

The system is designed around an important principle:

> **The LLM should answer from the company's knowledge base rather than rely solely on its pretrained knowledge.**

---

## The problem this solves

Internal knowledge bases have two failure modes once you put an LLM in front of them:

1. **The model answers from memory instead of your documents.** It sounds right, cites nothing, and is occasionally confidently wrong about your own company's policies.
2. **The retrieval layer doesn't respect who's asking.** A naive implementation embeds everything into one collection and lets similarity search decide what's "relevant" — with no concept of who's allowed to see it. Filtering results *after* retrieval is a common workaround, but by then the sensitive chunk has already been pulled into the context window and handed to the LLM. Whether the LLM "chooses" not to repeat it isn't a control you can rely on.

Sogno Enterprise addresses both: answers are grounded in retrieved context (not open-ended generation), and role/metadata filtering (employee / manager) happens as part of the Qdrant query itself, so restricted content never enters the prompt in the first place.

---

## Architecture Overview

The system follows this pipeline:

```text
                    ┌──────────────────────┐
                    │   Company Documents  │
                    │       PDF Files      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Document Ingestion │
                    │                      │
                    │  PDF Extraction      │
                    │  Cleaning             │
                    │  Normalization        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Chunking          │
                    │                      │
                    │  Documents → Chunks   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Embeddings        │
                    │                      │
                    │ all-MiniLM-L6-v2      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Qdrant           │
                    │   Vector Database      │
                    │                       │
                    │ Semantic Search        │
                    │ Metadata Filtering     │
                    └──────────┬────────────┘
                               │
                         User Question
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Retrieval        │
                    │                      │
                    │ Question → Embedding  │
                    │ Semantic Search       │
                    │ Role Filtering        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Prompt Augmentation  │
                    │                      │
                    │ Question + Context    │
                    │ + Access Constraints  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │       Groq LLM        │
                    │   Llama 3.3 70B       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI API        │
                    │                      │
                    │ POST /ask             │
                    │ GET  /health          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   SaaS React UI       │
                    │                      │
                    │ AI Enterprise         │
                    │ Assistant             │
                    └──────────────────────┘
```

---

## Tech stack

| Layer | Choice |
|---|---|
| API | FastAPI |
| Embeddings | `all-MiniLM-L6-v2` (Sentence Transformers) |
| Vector store | Qdrant |
| LLM | Llama 3.3 70B via Groq |
| Frontend | React |
| Deployment | Render (API) / Vercel (frontend) |

---

## Project structure

```
backend/
├── api/
├── rag/
│   ├── ingestion/
│   ├── retrieval.py
│   ├── augmentation.py
│   └── generation.py
├── main.py
├── requirements.txt
└── .env.example
```

---

## Production

- API only (no frontend): [https://sogno-entreprise.onrender.com/docs](https://sogno-entreprise.onrender.com/docs)
- Full app (with the SaaS frontend):[https://sogno-entreprise.vercel.app](https://sogno-entreprise.vercel.app)

---

## Author

**Samia Djafi** — Computer Science Engineering Student, Artificial Intelligence

RAG · LLMs · Vector Search · FastAPI · Python · React
