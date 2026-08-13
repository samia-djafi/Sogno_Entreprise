print("PREPARE_DOCUMENTS.PY IS RUNNING")
print("STEP 2")

import json
import re
from pathlib import Path

print("IMPORTS WORKED")


# ==================================================
# 1. PATHS
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "data" / "extracted_pages.json"

OUTPUT_FILE = BASE_DIR / "data" / "cleaned_documents.json"


# ==================================================
# 2. LOAD EXTRACTED DATA
# ==================================================

print("=== SOGNO ENTERPRISE ===")

print("Loading:", INPUT_FILE)


if not INPUT_FILE.exists():

    print("ERROR: extracted_pages.json not found.")

    print("Run extract_pdf.py first.")

    exit()


with open(
    INPUT_FILE,
    "r",
    encoding="utf-8"
) as file:

    pages = json.load(file)


print("Pages loaded:", len(pages))


# ==================================================
# 3. TEXT CLEANING
# ==================================================

def clean_text(text):
    """
    Clean extracted PDF text.

    - Normalize line endings
    - Remove unnecessary spaces
    - Remove empty lines
    - Preserve meaningful paragraphs
    """

    # Normalize line endings
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Clean every line
    lines = []

    for line in text.split("\n"):

        line = line.strip()

        if line:
            lines.append(line)

    # Rebuild text
    text = "\n".join(lines)

    # Replace multiple spaces/tabs with one space
    text = re.sub(r"[ \t]+", " ", text)

    # Avoid excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ==================================================
# 4. PREPARE DOCUMENTS
# ==================================================

cleaned_documents = []


for page in pages:

    # ----------------------------------------------
    # Original information
    # ----------------------------------------------

    original_text = page.get("text", "")

    document_name = page.get(
        "document_name",
        ""
    )

    department = page.get(
        "department",
        ""
    )

    page_number = page.get(
        "page",
        None
    )


    # ----------------------------------------------
    # Clean text
    # ----------------------------------------------

    cleaned_text = clean_text(original_text)


    # Skip empty pages
    if not cleaned_text:
        continue


    # ----------------------------------------------
    # Create document ID
    # ----------------------------------------------

    # Example:
    # Remote_Work_Policy.pdf
    #
    # becomes:
    # Remote_Work_Policy

    document_id = Path(
        document_name
    ).stem


    # ----------------------------------------------
    # Create final structure
    # ----------------------------------------------

    document = {

        "text": cleaned_text,

        "metadata": {

            "document_id": document_id,

            "document_name": document_name,

            "department": department.upper(),

            "page": page_number,

            "section": None,

            "version": None,

            "status": None,

            "access_roles": [],

            "uploaded_at": None
        }
    }


    cleaned_documents.append(document)


# ==================================================
# 5. SAVE JSON
# ==================================================

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        cleaned_documents,
        file,
        ensure_ascii=False,
        indent=4
    )


# ==================================================
# 6. RESULTS
# ==================================================

print("\n========================================")

print("PREPARATION COMPLETE")

print("========================================")

print(
    "Original pages:",
    len(pages)
)

print(
    "Cleaned documents:",
    len(cleaned_documents)
)

print("\nSaved to:")

print(OUTPUT_FILE)


# ==================================================
# 7. DISPLAY FIRST RESULT
# ==================================================

if cleaned_documents:

    print("\n========================================")

    print("FIRST DOCUMENT")

    print("========================================")

    print(
        json.dumps(
            cleaned_documents[0],
            ensure_ascii=False,
            indent=4
        )
    )