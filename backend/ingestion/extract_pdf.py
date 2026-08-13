import pymupdf
import json
from pathlib import Path


# ==================================================
# 1. PATHS
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

KNOWLEDGE_BASE = BASE_DIR / "Sogno_Knowledge_Base"

DATA_DIR = BASE_DIR / "data"

OUTPUT_FILE = DATA_DIR / "extracted_pages.json"


print("=== SOGNO ENTERPRISE ===")

print("Knowledge Base:", KNOWLEDGE_BASE)


# ==================================================
# 2. CHECK KNOWLEDGE BASE
# ==================================================

if not KNOWLEDGE_BASE.exists():

    print("Knowledge Base NOT FOUND")
    exit()

print("Knowledge Base FOUND")


# ==================================================
# 3. CREATE DATA FOLDER
# ==================================================

DATA_DIR.mkdir(exist_ok=True)

print("Data folder ready:", DATA_DIR)


# ==================================================
# 4. FIND ALL PDFs
# ==================================================

pdf_files = list(KNOWLEDGE_BASE.rglob("*.pdf"))

print(f"PDFs found: {len(pdf_files)}")


# ==================================================
# 5. EXTRACT TEXT PAGE BY PAGE
# ==================================================

all_pages = []


for pdf_path in pdf_files:

    print("\n========================================")
    print("Processing:", pdf_path.name)
    print("Department:", pdf_path.parent.name)
    print("========================================")

    # Open PDF
    pdf = pymupdf.open(pdf_path)

    # Process each page
    for page_number, page in enumerate(pdf, start=1):

        # Extract text
        text = page.get_text("text").strip()

        # Create page object
        page_data = {
            "document_name": pdf_path.name,
            "department": pdf_path.parent.name,
            "page": page_number,
            "text": text
        }

        # Add to list
        all_pages.append(page_data)

        print(
            f"Page {page_number}: "
            f"{len(text)} characters extracted"
        )

    # Close PDF
    pdf.close()


# ==================================================
# 6. SAVE AS JSON
# ==================================================

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        all_pages,
        file,
        ensure_ascii=False,
        indent=4
    )


# ==================================================
# 7. FINAL RESULT
# ==================================================

print("\n========================================")
print("EXTRACTION COMPLETE")
print("========================================")

print("PDFs processed:", len(pdf_files))

print("Pages extracted:", len(all_pages))

print("JSON saved to:")

print(OUTPUT_FILE)