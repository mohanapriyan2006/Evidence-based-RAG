from pydantic import BaseModel

from app.rag.citations import Citation


class QuestionRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    status: str
    answer: str
    sources: list[Citation]
