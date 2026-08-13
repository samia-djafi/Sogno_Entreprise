from types import SimpleNamespace

import rag.generation as generation

def test_generate_answer(monkeypatch):
    fake_response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content="Employees receive 25 days of annual leave."
                )
            )
        ]
    )

    class FakeCompletions:
        def create(self, **kwargs):
            assert kwargs["temperature"] == 0
            assert kwargs["messages"][0]["role"] == "user"

            return fake_response

    class FakeChat:
        completions = FakeCompletions()

    fake_client = SimpleNamespace(
        chat=FakeChat()
    )

    monkeypatch.setattr(
        generation,
        "client",
        fake_client,
    )

    answer = generation.generate_answer(
        "How many annual leave days do employees receive?"
    )

    assert answer == "Employees receive 25 days of annual leave."