from types import SimpleNamespace

from rag.retrieval import _format_results


def test_format_results():
    fake_results = SimpleNamespace(
        points=[
            SimpleNamespace(
                payload={
                    "chunk_id": "chunk-001",
                    "text": "Employees receive 25 days of annual leave.",
                    "metadata": {
                        "document_name": "Leave_Time_Off_Policy.pdf",
                        "page": 3,
                        "section": "Annual Leave",
                    },
                },
                score=0.92,
            )
        ]
    )

    results = _format_results(fake_results)

    assert len(results) == 1
    assert results[0]["chunk_id"] == "chunk-001"
    assert results[0]["text"] == "Employees receive 25 days of annual leave."
    assert results[0]["score"] == 0.92
    assert results[0]["metadata"]["page"] == 3