from __future__ import annotations

import re

from pydantic import BaseModel

from app.rag.retrieve import ScoredClause, parse_policy_manual, DEFAULT_MANUAL, retrieve

SUFFICIENT_SCORE = 0.45
MIN_EVIDENCE_COUNT = 1
COVERAGE_RATIO = 0.60
CONTRADICTION_SCORE = 0.30

_STOPWORDS = {
    "the", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "may",
    "might", "must", "can", "shall", "a", "an", "as", "at", "by", "for",
    "from", "in", "of", "on", "to", "with", "and", "or", "but", "if", "then",
    "this", "that", "these", "those", "what", "who", "which", "when", "where",
    "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "just", "now", "also", "get", "does", "did", "will",
}

_NEGATORS = {"not", "no", "never", "none", "without"}

_CONDITIONAL_MARKERS = {"where", "if", "except", "unless", "subject", "under", "see"}

_WORD_RE = re.compile(r"[a-zA-Z']{2,}")


class VerificationResult(BaseModel):
    status: str
    reason: str
    evidence: list[ScoredClause]


def _tokenize(text: str) -> set[str]:
    words = _WORD_RE.findall(text.lower())
    return {w for w in words if w not in _STOPWORDS}


def _question_terms(question: str) -> set[str]:
    return _tokenize(question)


def _coverage(question_terms: set[str], text: str) -> float:
    if not question_terms:
        return 0.0
    text_terms = _tokenize(text)
    hits = text_terms & question_terms
    return len(hits) / len(question_terms)


def _has_negation(text: str, term: str) -> bool:
    tokens = _tokenize_with_positions(text)
    for i, token in enumerate(tokens):
        if token == term:
            if i > 0 and tokens[i - 1] in _NEGATORS:
                return True
    return False


def _is_conditional(text: str) -> bool:
    tokens = _tokenize_with_positions(text)
    for token in tokens:
        if token in _CONDITIONAL_MARKERS:
            return True
    return False


def _tokenize_with_positions(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def _find_contradictions(clauses: list[ScoredClause]) -> list[ScoredClause]:
    conflicts: list[ScoredClause] = []
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

    question_terms = _question_terms(question)

    candidates = [
        c for c in clauses
        if c.score >= SUFFICIENT_SCORE
    ]

    if not candidates:
        return VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=clauses[:MIN_EVIDENCE_COUNT] if clauses else [],
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
        if _coverage(question_terms, c.text + " " + c.section) >= COVERAGE_RATIO
    ]

    if not strong:
        return VerificationResult(
            status="refused",
            reason="insufficient_evidence",
            evidence=candidates,
        )

    conflicts = _find_contradictions(strong)
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

    return VerificationResult(
        status="answered",
        reason="sufficient_evidence",
        evidence=strong[:MIN_EVIDENCE_COUNT],
    )


if __name__ == "__main__":
    clauses = parse_policy_manual(DEFAULT_MANUAL)
    question = "Who is eligible for the Household Support Program?"
    retrieved = retrieve(question, clauses)
    result = verify(question, retrieved)
    print(f"Question: {question}")
    print(f"Status: {result.status}")
    print(f"Reason: {result.reason}")
    for c in result.evidence:
        print(f"- {c.id} ({c.score:.4f}): {c.text[:120]}...")
