from rag.retrieval import retrieve


# ==================================================
# BUILD CONTEXT
# ==================================================

def build_context(retrieved_chunks):

    context_parts = []

    for i, chunk in enumerate(
        retrieved_chunks,
        start=1
    ):

        metadata = chunk.get("metadata") or {}

        document_name = metadata.get(
            "document_name",
            "Unknown document"
        )

        page = metadata.get(
            "page",
            "Unknown page"
        )

        department = metadata.get(
            "department",
            "Unknown department"
        )

        section = metadata.get(
            "section",
            "Unknown section"
        )

        text = chunk.get(
            "text",
            ""
        )

        source = f"""
[Source {i}]

Document: {document_name}
Page: {page}
Department: {department}
Section: {section}

Content:
{text}
"""

        context_parts.append(
            source.strip()
        )

    return "\n\n".join(context_parts)


# ==================================================
# BUILD AUGMENTED PROMPT
# ==================================================

def build_augmented_prompt(
    question,
    retrieved_chunks,
    user_role=None
):

    context = build_context(
        retrieved_chunks
    )

    prompt = f"""
You are Sogno Enterprise's
internal knowledge assistant.

The user asking this question
has the role: {user_role}

Use ONLY the company context
provided below to answer the
user's question.

Do not invent information.

Format your answer in Markdown:
- Use **bold** for key terms and numbers
- Use bullet points for lists of rules, steps, or conditions
- If there is an important exception, restriction, or warning,
  put it in its own short paragraph starting with "> " (blockquote)
  so it stands out from the rest
- Keep it concise and scannable, not a wall of text

If the answer cannot be found
in the provided context, say:

"I could not find this information
in the available company documents."

==============================
COMPANY CONTEXT
==============================

{context}

==============================
USER QUESTION
==============================

{question}

==============================
END OF CONTEXT
==============================
"""
    return prompt.strip()


# ==================================================
# TEST AUGMENTATION
# ==================================================

if __name__ == "__main__":

    print("================================")
    print("SOGNO ENTERPRISE")
    print("AUGMENTATION TEST")
    print("================================")

    # ----------------------------------------------
    # 1. Ask user for question
    # ----------------------------------------------

    question = input(
        "\nAsk a question: "
    )

    # ----------------------------------------------
    # 2. Ask for role
    # ----------------------------------------------

    role = input(
        "User role (employee/manager): "
    ).strip().lower()

    # ----------------------------------------------
    # 3. RETRIEVAL
    # ----------------------------------------------

    print(
        "\nRetrieving relevant documents..."
    )

    retrieved_chunks = retrieve(
        question,
        user_role=role
    )

    # ----------------------------------------------
    # 4. Check retrieval
    # ----------------------------------------------

    if not retrieved_chunks:

        print(
            "\nNo relevant documents found."
        )

        exit()

    # ----------------------------------------------
    # 5. AUGMENTATION
    # ----------------------------------------------

    augmented_prompt = build_augmented_prompt(
    question,
    retrieved_chunks,
    user_role=role
)
    

    # ----------------------------------------------
    # 6. DISPLAY RESULT
    # ----------------------------------------------

    print("\n")
    print("================================")
    print("AUGMENTED PROMPT")
    print("================================")

    print(augmented_prompt)

    print("\n================================")
    print("END OF AUGMENTATION")
    print("================================")