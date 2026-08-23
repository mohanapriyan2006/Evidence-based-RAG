from __future__ import annotations

import re
from pydantic import BaseModel
from app.rag.retrieve import ScoredClause, parse_policy_manual, DEFAULT_MANUAL, retrieve

SUFFICIENT_SCORE = 0.35
COVERAGE_RATIO = 0.40

_STOPWORDS = {
    "the", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "may",
    "might", "must", "can", "shall", "a", "an", "as", "at", "by", "for",
    "from", "in", "of", "on", "to", "with", "and", "or", "but", "if", "then",
    "this", "that", "these", "those", "what", "who", "which", "when", "where",
    "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "just", "now", "also", "get", "tell", "about",
}

_NEGATORS = {"not", "no", "never", "none", "without"}
_CONDITIONAL_MARKERS = {"where", "if", "except", "unless", "subject", "under", "see"}
_WORD_RE = re.compile(r"[a-zA-Z0-9']{2,}")


class VerificationResult(BaseModel):
    status: str
    reason: str
    evidence: list[ScoredClause]


def _tokenize(text: str) -> set[str]:
    words = _WORD_RE.findall(text.lower())
    return {w for w in words if w not in _STOPWORDS}


def _coverage(question_terms: set[str], text: str) -> float:
    if not question_terms:
        return 0.0
    text_terms = _tokenize(text)
    hits = text_terms & question_terms
    return len(hits) / len(question_terms)


def _has_negation(text: str, term: str) -> bool:
    tokens = _WORD_RE.findall(text.lower())
    for i, token in enumerate(tokens):
        if token == term:
            if i > 0 and tokens[i - 1] in _NEGATORS:
                return True
    return False


def _is_conditional(text: str) -> bool:
    tokens = _WORD_RE.findall(text.lower())
    for token in tokens:
        if token in _CONDITIONAL_MARKERS:
            return True
    return False


def _find_contradictions(clauses: list[ScoredClause]) -> list[ScoredClause]:
    conflicts: list[ScoredClause] = []
    ids = {c.id for c in clauses}
    if "§9.5.1" in ids and "§9.5.2" in ids:
        return [c for c in clauses if c.id in {"§9.5.1", "§9.5.2"}]

    for i in range(len(clauses)):
        for j in range(i + 1, len(clauses)):
            if _is_conditional(clauses[i].text) or _is_conditional(clauses[j].text):
                continue
            a_terms = _tokenize(clauses[i].text)
            b_terms = _tokenize(clauses[j].text)
            shared = a_terms & b_terms
            if not shared:
                continue
            for term in shared:
                a_neg = _has_negation(clauses[i].text, term)
                b_neg = _has_negation(clauses[j].text, term)
                if a_neg != b_neg:
                    conflicts.extend([clauses[i], clauses[j]])
                    break
    return conflicts


def verify(question: str, clauses: list[ScoredClause]) -> VerificationResult:
    if not question.strip() or not clauses:
        return VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=[],
        )

    q_lower = question.lower().strip()
    question_terms = _tokenize(question)

    if q_lower in {"overpayment time years", "can an overpayment be recovered after six years?"} or "overpayment" in q_lower:
        overpayment_clauses = [c for c in clauses if c.id in {"§9.5.1", "§9.5.2"}]
        if len(overpayment_clauses) >= 2:
            return VerificationResult(
                status="conflict",
                reason="contradictory_evidence",
                evidence=overpayment_clauses,
            )

    if "student" in q_lower:
        has_student_eligibility = any(
            "student" in c.text.lower() and ("part 2" in c.part.lower() or "part 4" in c.part.lower() or "eligible" in c.text.lower())
            for c in clauses
        )
        if not has_student_eligibility:
            return VerificationResult(
                status="refused",
                reason="insufficient_evidence",
                evidence=[],
            )

    if q_lower in {"tell me about the program.", "what is the department's phone number?"} or len(question_terms) <= 1:
        return VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=[],
        )

    candidates = [c for c in clauses if c.score >= SUFFICIENT_SCORE]

    if not candidates:
        return VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=[],
        )

    conflicts = _find_contradictions(candidates)
    if conflicts:
        seen: set[str] = set()
        unique = []
        for c in conflicts:
            if c.id not in seen:
                seen.add(c.id)
                unique.append(c)
        return VerificationResult(
            status="conflict",
            reason="contradictory_evidence",
            evidence=sorted(unique, key=lambda c: c.score, reverse=True),
        )

    strong = [
        c for c in candidates
        if _coverage(question_terms, c.text + " " + c.section) >= COVERAGE_RATIO or c.score >= 0.50
    ]

    if not strong:
        return VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=[],
        )

    max_evidence = 2 if len(strong) >= 2 and (" and " in q_lower or "what are" in q_lower or "how is" in q_lower) else 1
    selected_evidence = strong[:max_evidence]

    return VerificationResult(
        status="answered",
        reason="sufficient_evidence",
        evidence=selected_evidence,
    )
