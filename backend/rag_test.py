from rag.retrieval import retrieve
from rag.augmentation import build_augmented_prompt
from rag.generation import generate_answer


# ==================================================
# SOGNO ENTERPRISE - RAG ASSISTANT
# ==================================================

def main():

    print("================================")
    print("SOGNO ENTERPRISE")
    print("AI KNOWLEDGE ASSISTANT")
    print("================================")

    # ----------------------------------------------
    # 1. USER QUESTION
    # ----------------------------------------------

    question = input(
        "\nAsk a question: "
    )

    # ----------------------------------------------
    # 2. USER ROLE
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

    if not retrieved_chunks:

        print(
            "\nNo relevant documents found."
        )

        return

    # ----------------------------------------------
    # 4. AUGMENTATION
    # ----------------------------------------------

    augmented_prompt = build_augmented_prompt(
        question,
        retrieved_chunks,
        user_role=role
    )

    # ----------------------------------------------
    # 5. GENERATION
    # ----------------------------------------------

    print(
        "Generating answer..."
    )

    answer = generate_answer(
        augmented_prompt
    )

    # ----------------------------------------------
    # 6. FINAL ANSWER
    # ----------------------------------------------

    print("\n================================")
    print("ANSWER")
    print("================================")

    print(answer)

    print("\n================================")
    print("END")
    print("================================")


# ==================================================
# RUN
# ==================================================

if __name__ == "__main__":
    main()