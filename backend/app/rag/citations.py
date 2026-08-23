from __future__ import annotations

from pydantic import BaseModel

from app.rag.retrieve import ScoredClause


class Citation(BaseModel):
    id: str
    part: str
    section: str
    text: str


def build_citations(evidence: list[ScoredClause]) -> list[Citation]:
    return [
        Citation(
            id=clause.id,
            part=clause.part,
            section=clause.section,
            text=clause.text,
        )
        for clause in evidence
    ]
