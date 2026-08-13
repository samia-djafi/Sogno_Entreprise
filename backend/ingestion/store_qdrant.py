import json
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct
)


# ==================================================
# 1. PATHS
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = (
    BASE_DIR
    / "data"
    / "embedded_chunks.json"
)


# ==================================================
# 2. QDRANT CONFIGURATION
# ==================================================

QDRANT_PATH = (
    BASE_DIR
    / "qdrant_storage"
)

COLLECTION_NAME = "sogno_knowledge_base"

VECTOR_SIZE = 384


# ==================================================
# 3. LOAD EMBEDDED CHUNKS
# ==================================================

print("=== SOGNO ENTERPRISE ===")
print("QDRANT INGESTION")

print("\nLoading:", INPUT_FILE)


if not INPUT_FILE.exists():

    print(
        "ERROR: embedded_chunks.json "
        "not found."
    )

    print(
        "Run embed_documents.py first."
    )

    exit()


with open(
    INPUT_FILE,
    "r",
    encoding="utf-8"
) as file:

    chunks = json.load(file)


print(
    "Embedded chunks loaded:",
    len(chunks)
)


# ==================================================
# 4. CONNECT TO LOCAL QDRANT
# ==================================================

print("\nStarting local Qdrant...")

client = QdrantClient(
    path=str(QDRANT_PATH)
)

print("Qdrant connected.")


# ==================================================
# 5. CREATE COLLECTION
# ==================================================

existing_collections = [
    collection.name
    for collection in
    client.get_collections().collections
]


if COLLECTION_NAME in existing_collections:

    print(
        f"\nCollection "
        f"'{COLLECTION_NAME}' "
        f"already exists."
    )

else:

    client.create_collection(

        collection_name=COLLECTION_NAME,

        vectors_config=VectorParams(

            size=VECTOR_SIZE,

            distance=Distance.COSINE
        )
    )

    print(
        f"\nCollection "
        f"'{COLLECTION_NAME}' created."
    )


# ==================================================
# 6. PREPARE POINTS
# ==================================================

points = []


for index, chunk in enumerate(chunks):

    point = PointStruct(

        id=index,

        vector=chunk["embedding"],

        payload={

            "chunk_id":
                chunk["chunk_id"],

            "text":
                chunk["text"],

            "metadata":
                chunk["metadata"]
        }
    )

    points.append(point)


# ==================================================
# 7. INSERT INTO QDRANT
# ==================================================

print("\nUploading vectors to Qdrant...")

client.upsert(

    collection_name=COLLECTION_NAME,

    points=points
)


# ==================================================
# 8. VERIFY
# ==================================================

collection_info = client.get_collection(
    COLLECTION_NAME
)


print("\n========================================")
print("QDRANT INGESTION COMPLETE")
print("========================================")

print(
    "Collection:",
    COLLECTION_NAME
)

print(
    "Vectors stored:",
    collection_info.points_count
)

print(
    "Storage:",
    QDRANT_PATH
)