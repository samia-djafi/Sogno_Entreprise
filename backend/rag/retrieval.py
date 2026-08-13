import os
from pathlib import Path

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer


# ==================================================
# ENVIRONMENT
# ==================================================

load_dotenv()


# ==================================================
# CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent

QDRANT_PATH = BASE_DIR / "qdrant_storage"

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

COLLECTION_NAME = "sogno_knowledge_base"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"

TOP_K = 5


# ==================================================
# LOAD EMBEDDING MODEL
# ==================================================

print("Loading embedding model...")

model = SentenceTransformer(EMBEDDING_MODEL)

print("Embedding model loaded.")


# ==================================================
# CONNECT TO QDRANT
# ==================================================

if QDRANT_URL:

    # Production: Qdrant Cloud
    print("Connecting to Qdrant Cloud...")

    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
    )

else:

    # Local development: local Qdrant storage
    print("Using local Qdrant storage...")

    client = QdrantClient(
        path=str(QDRANT_PATH)
    )


# ==================================================
# FORMAT QDRANT RESULTS
# ==================================================

def _format_results(results):
    """
    Convert Qdrant search results into the
    standardized format used by the RAG pipeline.
    """

    retrieved_chunks = []

    for result in results.points:

        payload = result.payload

        retrieved_chunks.append(
            {
                "chunk_id": payload.get("chunk_id"),
                "text": payload.get("text"),
                "metadata": payload.get("metadata"),
                "score": result.score,
            }
        )

    return retrieved_chunks


# ==================================================
# RETRIEVAL FUNCTION
# ==================================================

def retrieve(
    question,
    user_role=None,
    top_k=TOP_K
):
    """
    Retrieve the most relevant knowledge-base chunks
    for a user question.

    Access is filtered according to the user's role.
    """

    # ----------------------------------------------
    # 1. Convert question into embedding
    # ----------------------------------------------

    query_vector = model.encode(
        question
    ).tolist()


    # ----------------------------------------------
    # 2. Build access filter
    # ----------------------------------------------

    query_filter = None

    if user_role:

        query_filter = Filter(
            must=[
                FieldCondition(
                    key="metadata.access_roles",
                    match=MatchValue(
                        value=user_role
                    )
                )
            ]
        )


    # ----------------------------------------------
    # 3. Search Qdrant
    # ----------------------------------------------

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k,
        with_payload=True
    )


    # ----------------------------------------------
    # 4. Format results
    # ----------------------------------------------

    return _format_results(results)


# ==================================================
# MANUAL RETRIEVAL TEST
# ==================================================

if __name__ == "__main__":

    print("\n=== SOGNO ENTERPRISE ===")
    print("RETRIEVAL TEST")


    # ----------------------------------------------
    # Get user question
    # ----------------------------------------------

    question = input(
        "\nAsk a question: "
    )


    # ----------------------------------------------
    # Get user role
    # ----------------------------------------------

    role = input(
        "User role (employee/manager): "
    ).strip().lower()


    # ----------------------------------------------
    # Retrieve relevant chunks
    # ----------------------------------------------

    results = retrieve(
        question,
        user_role=role
    )


    # ----------------------------------------------
    # Display results
    # ----------------------------------------------

    print("\n================================")
    print("RETRIEVED CHUNKS")
    print("================================")


    for i, result in enumerate(
        results,
        start=1
    ):

        metadata = result["metadata"]


        print(
            f"\n--- Result {i} ---"
        )


        print(
            "Score:",
            result["score"]
        )


        print(
            "Document:",
            metadata.get(
                "document_name"
            )
        )


        print(
            "Page:",
            metadata.get(
                "page"
            )
        )


        print(
            "Text:",
            result["text"]
        )