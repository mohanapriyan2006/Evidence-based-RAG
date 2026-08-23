from __future__ import annotations

from app.rag.citations import Citation, build_citations
from app.rag.retrieve import ScoredClause
from app.rag.verify import VerificationResult

REFUSAL_INSUFFICIENT = "The policy does not establish enough information to answer this question."
REFUSAL_NONE = "No relevant policy evidence was found for this question."
CONFLICT_ANSWER = "The policy contains contradictory provisions on this topic. Please review the following clauses."


def _format_answer(question: str, evidence: list[Citation]) -> str:
    if not evidence:
        return "No relevant policy evidence was found."
    parts = [f"Based on {c.id}, {c.text}" for c in evidence]
    return " ".join(parts)


def _find_referral_clause(clauses: list[ScoredClause]) -> ScoredClause | None:
    for clause in clauses:
        lower = clause.text.lower()
        if "contact the department" in lower or "contact us" in lower:
            return clause
        if "referral" in lower and "service" in lower:
            return clause
    return None


def _build_refusal(verification: VerificationResult, all_clauses: list[ScoredClause] | None) -> dict:
    if not verification.evidence:
        answer = REFUSAL_NONE
    else:
        answer = REFUSAL_INSUFFICIENT

    if all_clauses:
        referral = _find_referral_clause(all_clauses)
        if referral:
            answer = f"{answer} For further guidance, see {referral.id}: {referral.text}"
            return {
                "status": "refused",
                "answer": answer,
                "reason": verification.reason,
                "sources": build_citations(verification.evidence) + build_citations([referral]),
            }

    return {
        "status": "refused",
        "answer": answer,
        "reason": verification.reason,
        "sources": build_citations(verification.evidence),
    }


def generate_answer(
    question: str,
    verification: VerificationResult,
    all_clauses: list[ScoredClause] | None = None,
) -> dict:
    if verification.status == "refused":
        return _build_refusal(verification, all_clauses)

    if verification.status == "conflict":
        ids = ", ".join(c.id for c in verification.evidence)
        return {
            "status": "conflict",
            "answer": f"{CONFLICT_ANSWER} Human review is required to resolve the conflict between {ids}.",
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
