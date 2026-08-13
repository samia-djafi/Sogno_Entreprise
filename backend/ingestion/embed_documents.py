import json
from pathlib import Path

from sentence_transformers import SentenceTransformer


# ==================================================
# 1. PATHS
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "data" / "chunks.json"

OUTPUT_FILE = BASE_DIR / "data" / "embedded_chunks.json"


# ==================================================
# 2. LOAD EMBEDDING MODEL
# ==================================================

print("=== SOGNO ENTERPRISE ===")
print("EMBEDDING")

print("\nLoading embedding model...")

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

print("Embedding model loaded.")


# ==================================================
# 3. LOAD CHUNKS
# ==================================================

print("\nLoading:", INPUT_FILE)


if not INPUT_FILE.exists():

    print("ERROR: chunks.json not found.")

    print("Run chunk_documents.py first.")

    exit()


with open(
    INPUT_FILE,
    "r",
    encoding="utf-8"
) as file:

    chunks = json.load(file)


print("Chunks loaded:", len(chunks))


# ==================================================
# 4. EXTRACT TEXT
# ==================================================

texts = [
    chunk["text"]
    for chunk in chunks
]


# ==================================================
# 5. CREATE EMBEDDINGS
# ==================================================

print("\nCreating embeddings...")

embeddings = model.encode(
    texts,
    show_progress_bar=True
)


# ==================================================
# 6. ATTACH EMBEDDINGS TO CHUNKS
# ==================================================

embedded_chunks = []


for chunk, embedding in zip(
    chunks,
    embeddings
):

    embedded_chunk = {

        "chunk_id":
            chunk["chunk_id"],

        "text":
            chunk["text"],

        "metadata":
            chunk["metadata"],

        "embedding":
            embedding.tolist()
    }


    embedded_chunks.append(
        embedded_chunk
    )


# ==================================================
# 7. SAVE
# ==================================================

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        embedded_chunks,
        file,
        ensure_ascii=False,
        indent=4
    )


# ==================================================
# 8. RESULTS
# ==================================================

print("\n========================================")
print("EMBEDDING COMPLETE")
print("========================================")

print(
    "Chunks:",
    len(embedded_chunks)
)

print(
    "Embedding dimensions:",
    len(embedded_chunks[0]["embedding"])
)

print("\nSaved to:")

print(OUTPUT_FILE)


# ==================================================
# 9. SHOW FIRST EMBEDDING
# ==================================================

if embedded_chunks:

    first = embedded_chunks[0]

    print("\n========================================")
    print("FIRST EMBEDDING")
    print("========================================")

    print("Chunk ID:")
    print(first["chunk_id"])

    print("\nText:")
    print(first["text"])

    print("\nVector dimensions:")
    print(len(first["embedding"]))

    print("\nFirst 10 vector values:")
    print(first["embedding"][:10])