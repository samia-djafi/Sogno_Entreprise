from fastapi.testclient import TestClient

import api


client = TestClient(api.app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ask_returns_answer(monkeypatch):
    fake_chunks = [
        {
            "chunk_id": "chunk-001",
            "text": "Employees receive 25 days of annual leave.",
            "metadata": {
                "document_name": "Leave_Time_Off_Policy.pdf",
                "page": 3,
                "section": "Annual Leave",
            },
            "score": 0.91,
        }
    ]

    monkeypatch.setattr(
        api,
        "retrieve",
        lambda question, user_role: fake_chunks,
    )

    monkeypatch.setattr(
        api,
        "build_augmented_prompt",
        lambda question, chunks, user_role: "fake prompt",
    )

    monkeypatch.setattr(
        api,
        "generate_answer",
        lambda prompt: "Employees receive 25 days of annual leave.",
    )

    response = client.post(
        "/ask",
        json={
            "question": "How many days of annual leave do employees receive?",
            "role": "employee",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["answered"] is True
    assert "25 days" in data["answer"]
    assert len(data["sources"]) == 1
    assert data["sources"][0]["document"] == "Leave_Time_Off_Policy.pdf"


def test_ask_returns_unanswered_when_no_documents(monkeypatch):
    monkeypatch.setattr(
        api,
        "retrieve",
        lambda question, user_role: [],
    )

    response = client.post(
        "/ask",
        json={
            "question": "What is our Mars office policy?",
            "role": "employee",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["answered"] is False
    assert data["sources"] == []
    assert "could not find" in data["answer"].lower()


def test_ask_requires_question_and_role():
    response = client.post(
        "/ask",
        json={}
    )

    assert response.status_code == 422