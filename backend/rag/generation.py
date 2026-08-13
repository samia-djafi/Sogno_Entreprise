from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ==================================================
# GROQ CLIENT
# ==================================================

client = Groq()


# ==================================================
# GENERATE ANSWER
# ==================================================

def generate_answer(
    augmented_prompt,
    model="llama-3.3-70b-versatile"
):

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": augmented_prompt
            }
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip()


# ==================================================
# TEST GENERATION
# ==================================================

if __name__ == "__main__":

    print("================================")
    print("SOGNO ENTERPRISE")
    print("GENERATION TEST")
    print("================================")

    # ----------------------------------------------
    # 1. Get augmented prompt
    # ----------------------------------------------

    augmented_prompt = input(
        "\nEnter the augmented prompt:\n\n"
    )

    # ----------------------------------------------
    # 2. Generate answer
    # ----------------------------------------------

    print("\nGenerating answer...")

    answer = generate_answer(
        augmented_prompt
    )

    # ----------------------------------------------
    # 3. Display answer
    # ----------------------------------------------

    print("\n================================")
    print("GENERATED ANSWER")
    print("================================")

    print(answer)

    print("\n================================")
    print("END OF GENERATION")
    print("================================")