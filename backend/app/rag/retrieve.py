from __future__ import annotations

import numpy as np
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from app.rag.ingest import Clause, DEFAULT_MANUAL, parse_policy_manual

MODEL_NAME = "all-MiniLM-L6-v2"
TOP_K = 10
MIN_SCORE = 0.25

_model: SentenceTransformer | None = None


class ScoredClause(BaseModel):
    id: str
    part: str
    section: str
    text: str
    score: float


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def _clause_text(clause: Clause) -> str:
    return f"{clause.part} {clause.section} {clause.text}"


def _embed(texts: list[str]) -> np.ndarray:
    model = _get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return embeddings


def _cosine_similarity(query_vec: np.ndarray, clause_vec: np.ndarray) -> float:
    return float(np.dot(query_vec, clause_vec))


def retrieve(
    question: str,
    clauses: list[Clause],
    top_k: int = TOP_K,
) -> list[ScoredClause]:
    if not question.strip() or not clauses:
        return []

    clause_texts = [_clause_text(c) for c in clauses]
    clause_vecs = _embed(clause_texts)
    query_vec = _embed([question])[0]

    scored: list[ScoredClause] = []
    for i, clause in enumerate(clauses):
        score = _cosine_similarity(query_vec, clause_vecs[i])
        if score >= MIN_SCORE:
            scored.append(
                ScoredClause(
                    id=clause.id,
                    part=clause.part,
                    section=clause.section,
                    text=clause.text,
                    score=score,
                )
            )

    scored.sort(key=lambda c: c.score, reverse=True)
    return scored[:top_k]


if __name__ == "__main__":
    clauses = parse_policy_manual(DEFAULT_MANUAL)
    question = "Who is eligible for the Household Support Program?"
    results = retrieve(question, clauses)
    print(f"Question: {question}\n")
    print(f"Results ({len(results)}):\n")
    for i, r in enumerate(results, 1):
        preview = r.text[:200]
        if len(r.text) > 200:
            preview = f"{preview}..."
        print(f"{i}. {r.id} (score: {r.score:.4f})\n{preview}\n")