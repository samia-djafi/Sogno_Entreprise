# Sogno Enterprise
 
> Enterprise AI knowledge assistant powered by Retrieval-Augmented Generation.

Sogno Enterprise is a full-stack application that lets employees ask questions about internal company knowledge in natural language, with answers grounded in a controlled document set. Access is role-aware end to end.
 
This repository is the system-level overview. The implementation lives in two separate repos:
 
- [Backend - RAG pipeline & API]([backend](https://github.com/samia-djafi/Sogno_Entreprise/tree/e258e26e40331db14525ff35ad6670f74ddd588e/backend))
- [Frontend - React client]([https://github.com/username/frontend-repo-name](https://github.com/samia-djafi/Sogno_Entreprise/tree/e258e26e40331db14525ff35ad6670f74ddd588e/frontend))
- Live: [https://sogno-entreprise.vercel.app](https://sogno-entreprise.vercel.app)

  ---

## The Problem

Organizations accumulate large amounts of internal knowledge across documents, policies, procedures, and operational guidelines.

Employees often know that the information exists, but finding the right document — and the right section inside it — can be slow and frustrating.

Traditional keyword search also struggles when the employee's question does not use the same terminology as the original document.

At the same time, simply connecting an LLM to company documents introduces another problem:

> **How do you make sure the AI answers from the organization's knowledge while respecting what each user is allowed to access?**

Sogno Enterprise was designed around this problem.

---

## The Solution

Sogno Enterprise combines:

```text
Enterprise Knowledge
        +
Semantic Retrieval
        +
Role-Based Access
        +
LLM Generation
        =
Grounded Enterprise AI Assistant
```
---
# Key Features

## RAG-Powered AI Assistant

- Natural-language questions about company knowledge
- Answers grounded in the organization's internal documents
- Role-aware retrieval

## Role-Based Knowledge Base

- Company documents organized around user access levels
- Employees see documents available to their role
- Managers have broader knowledge-management access
- AI retrieval respects role and metadata restrictions

## Employee Experience

Employees can:

- Ask questions through the AI assistant
- Browse authorized company documents
- Create and manage conversations
- Copy AI responses
- Bookmark responses
- Regenerate responses
- Rate satisfaction with AI responses

##  Manager Experience

Managers have everything available to employees, plus:

- Upload company documents
- Add new knowledge to the company knowledge base
- Manage company documents
- Review unanswered questions
- Monitor knowledge gaps
- Access a dedicated AI Analytics Dashboard
- Monitor user satisfaction
- Monitor AI response times
- Monitor usage and interaction activity

## AI Analytics Dashboard

Managers can monitor how the AI assistant performs through metrics such as:

- Satisfaction ratings
- AI response time
- Question / interaction volume
- Unanswered questions
- Knowledge gaps

## Knowledge Gap Management

A knowledge gap is created in two situations: when the AI cannot find sufficient information to answer the employee's question, or when the employee receives an answer but marks it as **Dislike**.

```text
Employee Question
       ↓
   RAG Retrieval
       ↓
  Answer Found?
   ┌──────┴──────┐
  NO            YES
   ↓              ↓
Knowledge Gap   AI Answer
                  ↓
            Employee Feedback
                  ↓
             Like / Dislike
              ┌────┴────┐
            LIKE      DISLIKE
              ↓          ↓
          No Gap     Knowledge Gap
```
 Final Logic
- **Answer Not Found → Knowledge Gap**
- **Answer Found + Dislike → Knowledge Gap**
- **Answer Found + Like → No Knowledge Gap**

---
# 🏗️ System Architecture

Sogno Enterprise is composed of several independent components.

```text
                              ┌──────────────────┐
                              │       USER       │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  React Frontend  │
                              │      Vercel      │
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                         ▼                           ▼
                ┌─────────────────┐         ┌─────────────────┐
                │    Supabase     │         │    FastAPI      │
                │                 │         │      API        │
                │ Authentication  │         │     Render      │
                │ Application Data│         └────────┬────────┘
                │ Knowledge Gaps  │                  │
                └─────────────────┘                  ▼
                                           ┌─────────────────┐
                                           │   RAG Pipeline  │
                                           │                 │
                                           │ Ingestion       │
                                           │ Chunking        │
                                           │ Embeddings      │
                                           │ Retrieval       │
                                           │ Access Filtering│
                                           │ Prompt Augment. │
                                           │ LLM Generation  │
                                           └────────┬────────┘
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │     Qdrant      │
                                           │ Vector Database │
                                           └─────────────────┘
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │ Groq / Llama    │
                                           │    3.3 70B      │
                                           └─────────────────┘
```

---

## Complete Request Flow

A typical request travels through the entire platform:

```text
┌───────────────┐
│     User      │
└───────┬───────┘
        │
        ▼
┌───────────────────┐
│   React Frontend  │
└───────┬───────────┘
        │
        │ POST /ask
        ▼
┌───────────────────┐
│     FastAPI       │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Question Embedding│
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Qdrant Retrieval  │
│ + Role Filtering  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Prompt Augmentation│
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Llama 3.3 70B     │
│ via Groq          │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│    AI Response    │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│   React Frontend  │
└───────────────────┘
```

---

##  🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend Tooling | Vite |
| Routing | React Router |
| Icons | Lucide React |
| Backend API | FastAPI |
| Language | Python |
| Embeddings | Sentence Transformers |
| Embedding Model | `all-MiniLM-L6-v2` |
| Vector Database | Qdrant |
| LLM | Llama 3.3 70B |
| LLM Provider | Groq |
| Application Backend | Supabase |
| Frontend Deployment | Vercel |
| API Deployment | Render |

---

## Project Rep 
```text
Sogno Enterprise
       │
       ├── RAG Backend
       │     ├── FastAPI
       │     ├── RAG Pipeline
       │     └── Qdrant
       │
       ├── Frontend
       │     ├── React
       │     ├── SaaS UI
       │     └── Supabase
       │
       └── Full Application
             └── Frontend + Backend
```
---
## Production Architecture

Sogno Enterprise is deployed as a distributed application.

```text
                    INTERNET
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
          VERCEL             RENDER
              │                 │
              ▼                 ▼
        React Frontend      FastAPI API
              │                 │
              └────────┬────────┘
                       │
                       ▼
                AI / RAG Layer
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
          Qdrant              Groq
        Vector Search       Llama 3.3 70B
```

Supabase provides the application-level data and authentication services alongside the deployed application.

---
## What This Project Demonstrates

Sogno Enterprise brings together several areas of software and AI engineering in one production-oriented application:

**Generative AI**: LLM integration, prompt construction, and grounded generation.

**Retrieval-Augmented Generation** : Document ingestion, embeddings, vector search, retrieval, and contextual generation.

**Backend Engineering** :Python, FastAPI, REST APIs, authentication-aware processing, and service separation.

**Frontend Engineering**: React, routing, reusable components, state-driven UI, API integration, and SaaS UX.

**Data & Infrastructure** : Qdrant vector search, Supabase application services, Vercel, and Render.

**System Design**:A distributed architecture connecting a client application, application services, AI APIs, retrieval infrastructure, and LLM inference.

---

##  Sogno Enterprise

A production-deployed enterprise AI assistant built around one idea:

> **Make organizational knowledge easier to access, while keeping AI responses grounded in the knowledge the organization actually controls.**

---
##  Author

**Samia Djafi**

Computer Science Engineering Student - Artificial Intelligence

**AI Engineering · Generative AI · RAG Systems · LLM Applications · Full-Stack Development**

---

