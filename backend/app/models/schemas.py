from pydantic import BaseModel

from app.rag.citations import Citation


class QuestionRequest(BaseModel):
    question: str
    claim_date: str | None = None


class AskResponse(BaseModel):
    status: str
    answer: str
    sources: list[Citation]
    claim_date: str | None = None

