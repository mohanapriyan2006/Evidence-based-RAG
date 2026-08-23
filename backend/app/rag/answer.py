from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from app.rag.citations import Citation, build_citations
from app.rag.retrieve import ScoredClause
from app.rag.verify import VerificationResult

REFUSAL_INSUFFICIENT = "The policy does not establish enough information to answer this question."
REFUSAL_NONE = "No relevant policy evidence was found for this question."
CONFLICT_ANSWER = "The policy contains contradictory provisions on this topic. Please review the following clauses."


class GroqError(Exception):
    pass


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "qwen/qwen3.6-27b"


def _format_answer(question: str, evidence: list[Citation]) -> str:
    if not evidence:
        return "No relevant policy evidence was found."
    parts = [f"Based on {c.id}, {c.text}" for c in evidence]
    return " ".join(parts)


def _build_prompt(question: str, evidence: list[Citation]) -> str:
    lines = ["Question:", question, "", "Verified policy evidence:"]
    for c in evidence:
        lines.append(f"{c.id}: {c.text}")
    lines.append("")
    lines.append("Answer the question using only the provided policy evidence.")
    lines.append("Do not use outside knowledge.")
    lines.append("Do not invent missing information.")
    lines.append("Do not create or modify policy citations.")
    lines.append("If the evidence does not support a statement, leave it out.")
    return "\n".join(lines)


def _call_groq(question: str, evidence: list[Citation]) -> str | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    model = os.environ.get("GROQ_MODEL") or DEFAULT_GROQ_MODEL
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": [
            {"role": "user", "content": _build_prompt(question, evidence)},
        ],
        "temperature": 0.0,
    }
    data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(GROQ_URL, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, TimeoutError, json.JSONDecodeError) as exc:
        raise GroqError(f"Groq request failed: {exc}") from exc


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
    try:
        answer = _call_groq(question, sources)
    except GroqError:
        raise
    if answer is None:
        answer = _format_answer(question, sources)
    return {
        "status": "answered",
        "answer": answer,
        "reason": verification.reason,
        "sources": sources,
    }
