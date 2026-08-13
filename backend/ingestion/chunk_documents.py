import json
from pathlib import Path


# ==================================================
# 1. PATHS
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "data" / "cleaned_documents.json"

OUTPUT_FILE = BASE_DIR / "data" / "chunks.json"


# ==================================================
# 2. CHUNK SETTINGS
# ==================================================

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150


# ==================================================
# 3. LOAD CLEANED DOCUMENTS
# ==================================================

print("=== SOGNO ENTERPRISE ===")
print("CHUNKING")

print("\nLoading:", INPUT_FILE)


if not INPUT_FILE.exists():

    print("ERROR: cleaned_documents.json not found.")

    print("Run prepare_documents.py first.")

    exit()


with open(
    INPUT_FILE,
    "r",
    encoding="utf-8"
) as file:

    documents = json.load(file)


print("Documents/pages loaded:", len(documents))


# ==================================================
# 4. CHUNK FUNCTION
# ==================================================

def create_chunks(text, chunk_size=800, overlap=150):

    words = text.split()

    chunks = []

    start = 0

    while start < len(words):

        end = start + chunk_size

        chunk_words = words[start:end]

        chunk_text = " ".join(chunk_words)

        if chunk_text.strip():

            chunks.append(chunk_text.strip())

        # Move forward while keeping overlap
        start += chunk_size - overlap

    return chunks


# ==================================================
# 5. CREATE CHUNKS
# ==================================================

all_chunks = []


for document in documents:

    text = document["text"]

    metadata = document["metadata"]

    # Create chunks from page text
    chunks = create_chunks(
        text,
        CHUNK_SIZE,
        CHUNK_OVERLAP
    )


    for index, chunk_text in enumerate(
        chunks,
        start=1
    ):

        document_id = metadata["document_id"]

        page = metadata["page"]


        # Unique chunk ID
        chunk_id = (
            f"{document_id}"
            f"_p{page}"
            f"_c{index}"
        )


        # Create chunk
        chunk = {

            "chunk_id": chunk_id,

            "text": chunk_text,

            "metadata": {

                "document_id":
                    metadata["document_id"],

                "document_name":
                    metadata["document_name"],

                "department":
                    metadata["department"],

                "page":
                    metadata["page"],

                "section":
                    metadata["section"],

                "version":
                    metadata["version"],

                "status":
                    metadata["status"],

                "access_roles":
                    metadata["access_roles"],

                "uploaded_at":
                    metadata["uploaded_at"],

                "chunk_index":
                    index,

                "total_chunks":
                    len(chunks)
            }
        }


        all_chunks.append(chunk)


# ==================================================
# 6. SAVE CHUNKS
# ==================================================

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        all_chunks,
        file,
        ensure_ascii=False,
        indent=4
    )


# ==================================================
# 7. RESULTS
# ==================================================

print("\n========================================")
print("CHUNKING COMPLETE")
print("========================================")

print(
    "Original pages:",
    len(documents)
)

print(
    "Total chunks:",
    len(all_chunks)
)

print("\nSaved to:")

print(OUTPUT_FILE)


# ==================================================
# 8. SHOW FIRST CHUNK
# ==================================================

if all_chunks:

    print("\n========================================")
    print("FIRST CHUNK")
    print("========================================")

    print(
        json.dumps(
            all_chunks[0],
            ensure_ascii=False,
            indent=4
        )
    )