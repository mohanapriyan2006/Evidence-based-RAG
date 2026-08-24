from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

from app.rag.citations import Citation, build_citations
from app.rag.retrieve import ScoredClause
from app.rag.verify import VerificationResult

REFUSAL_INSUFFICIENT = "The policy does not establish enough information to answer this question."
REFUSAL_NONE = "No relevant policy evidence was found for this question."
CONFLICT_ANSWER = "The policy contains contradictory provisions on this topic. Please review the following clauses."

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"


class GroqError(Exception):
    pass


def _clean_think_tags(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"<think>.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"</?think/?>", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    return cleaned if cleaned else None


def _format_answer(question: str, evidence: list[Citation]) -> str:
    if not evidence:
        return "No relevant policy evidence was found."
    parts = [f"Based on {c.id}, {c.text}" for c in evidence]
    return " ".join(parts)


def _build_prompt(question: str, evidence: list[Citation], claim_date: str | None = None) -> str:
    lines = ["Question:", question]
    if claim_date:
        lines.append(f"Claim Date: {claim_date}")
    lines.extend(["", "Verified policy evidence:"])
    for c in evidence:
        lines.append(f"{c.id}: {c.text}")
    lines.append("")
    lines.append("Answer the question using only the provided policy evidence.")
    lines.append("Ensure the answer is correct for the date of the claim being asked about (accounting for Amendment No. 2026-01 effective 1 March 2026).")
    lines.append("Do not use outside knowledge.")
    lines.append("Do not invent missing information.")
    lines.append("Do not create or modify policy citations.")
    lines.append("If the evidence does not support a statement, leave it out.")
    return "\n".join(lines)


def _call_groq(question: str, evidence: list[Citation], claim_date: str | None = None) -> str | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    model = os.environ.get("GROQ_MODEL") or DEFAULT_GROQ_MODEL
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "grounded-answer/1.0",
    }
    body = {
        "model": model,
        "messages": [
            {"role": "user", "content": _build_prompt(question, evidence, claim_date)},
        ],
        "temperature": 0.2,
        "max_completion_tokens": 1024,
        "top_p": 1,
        "stream": False,
        "stop": None,
    }
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(GROQ_URL, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            raw_content = result["choices"][0]["message"]["content"]
            return _clean_think_tags(raw_content)
    except Exception:
        return None


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
    claim_date: str | None = None,
) -> dict:
    if verification.status == "refused":
        res = _build_refusal(verification, all_clauses)
        res["claim_date"] = claim_date
        return res

    if verification.status == "conflict":
        ids = ", ".join(c.id for c in verification.evidence)
        return {
            "status": "conflict",
            "answer": f"{CONFLICT_ANSWER} Human review is required to resolve the conflict between {ids}.",
            "reason": verification.reason,
            "sources": build_citations(verification.evidence),
            "claim_date": claim_date,
        }

    sources = build_citations(verification.evidence)
    answer = None
    try:
        answer = _call_groq(question, sources, claim_date)
    except Exception:
        answer = None

    if answer:
        answer = _clean_think_tags(answer)

    if not answer:
        answer = _format_answer(question, sources)

    return {
        "status": "answered",
        "answer": answer,
        "reason": verification.reason,
        "sources": sources,
        "claim_date": claim_date,
    }

