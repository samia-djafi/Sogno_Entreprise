from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag.retrieval import retrieve
from rag.augmentation import build_augmented_prompt
from rag.generation import generate_answer

# ==================================================
# APP SETUP
# ==================================================

app = FastAPI(
    title="Sogno Enterprise AI Assistant API"
)

# Allow the React frontend to call this API.
# Replace "*" with your actual frontend URL in production
# (e.g. "http://localhost:3000" or "https://your-saas-domain.com").
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# REQUEST / RESPONSE MODELS
# ==================================================

class AskRequest(BaseModel):
    question: str
    role: str  # "employee" or "manager"


class AskResponse(BaseModel):
    answer: str
    sources: list
    answered: bool


# ==================================================
# ENDPOINT
# ==================================================

@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):

    retrieved_chunks = retrieve(
        request.question,
        user_role=request.role.strip().lower()
    )

    if not retrieved_chunks:
        return AskResponse(
            answer="I could not find this information in the available company documents.",
            sources=[],
            answered=False
        )

    augmented_prompt = build_augmented_prompt(
        request.question,
        retrieved_chunks,
        user_role=request.role.strip().lower()
    )

    answer = generate_answer(augmented_prompt)

    sources = [
        {
            "document": chunk["metadata"].get("document_name"),
            "page": chunk["metadata"].get("page"),
            "section": chunk["metadata"].get("section")
        }
        for chunk in retrieved_chunks
    ]
    answered = (
    "I could not find this information in the available company documents."
    not in answer
)

    return AskResponse(
    answer=answer,
    sources=sources,
    answered=answered
)


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
def health():
    return {"status": "ok"}