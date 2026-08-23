from __future__ import annotations

from app.rag.citations import Citation, build_citations
from app.rag.verify import VerificationResult

REFUSAL_ANSWER = "I cannot answer this question because the policy does not establish the requested information."
CONFLICT_ANSWER = "The policy contains contradictory provisions on this topic. Please review the following clauses."


def _format_answer(question: str, evidence: list[Citation]) -> str:
    if not evidence:
        return "No relevant policy evidence was found."
    parts = [f"Based on {c.id}, {c.text}" for c in evidence]
    return " ".join(parts)


def generate_answer(question: str, verification: VerificationResult) -> dict:
    if verification.status == "refused":
        return {
            "status": "refused",
            "answer": REFUSAL_ANSWER,
            "reason": verification.reason,
            "sources": build_citations(verification.evidence),
        }

    if verification.status == "conflict":
        return {
            "status": "conflict",
            "answer": CONFLICT_ANSWER,
            "reason": verification.reason,
            "sources": build_citations(verification.evidence),
        }

    sources = build_citations(verification.evidence)
    answer = _format_answer(question, sources)
    return {
        "status": "answered",
        "answer": answer,
        "reason": verification.reason,
        "sources": sources,
    }
