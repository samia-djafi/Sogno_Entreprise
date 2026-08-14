# Sogno Enterprise — RAG Backend

> Production-oriented Retrieval-Augmented Generation (RAG) backend for an enterprise knowledge assistant.

Sogno Enterprise is an AI-powered internal knowledge assistant designed to answer employee questions using a controlled collection of company documents.

The backend implements a complete **Retrieval-Augmented Generation pipeline**, from document ingestion and preprocessing to semantic retrieval, role-based access filtering, prompt augmentation, LLM generation, and a FastAPI interface consumed by the SaaS frontend.

The system is designed around an important principle:

> **The LLM should answer from the company's knowledge base rather than rely solely on its pretrained knowledge.**

---

# Architecture Overview

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