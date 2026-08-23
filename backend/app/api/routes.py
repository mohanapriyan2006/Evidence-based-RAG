from fastapi import APIRouter, HTTPException, status
from app.models.schemas import QuestionRequest, AskResponse
from app.rag.ingest import DEFAULT_MANUAL, parse_policy_manual
from app.rag.answer import GroqError, generate_answer
from app.rag.retrieve import retrieve
from app.rag.verify import verify


CLAUSES = parse_policy_manual(DEFAULT_MANUAL)

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/ask", response_model=AskResponse)
def ask(request: QuestionRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty")
    try:
        retrieved = retrieve(question, CLAUSES)
        verified = verify(question, retrieved)
        result = generate_answer(question, verified, CLAUSES)
    except GroqError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Backend processing failed") from exc
    return AskResponse(
        status=result["status"],
        answer=result["answer"],
        sources=result["sources"],
    )
