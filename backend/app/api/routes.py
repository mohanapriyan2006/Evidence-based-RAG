from fastapi import APIRouter, HTTPException, status
from app.models.schemas import QuestionRequest, AskResponse
from app.rag.ingest import parse_all_clauses
from app.rag.answer import GroqError, generate_answer
from app.rag.retrieve import retrieve
from app.rag.verify import verify


CLAUSES = parse_all_clauses()

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/sources/{clause_id}")
def get_source(clause_id: str):
    cid = clause_id if clause_id.startswith("§") else f"§{clause_id}"
    clause = next((c for c in CLAUSES if c.id == cid or c.id.startswith(f"{cid} ")), None)
    if not clause:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clause not found")
    return clause


@router.post("/ask", response_model=AskResponse)
def ask(request: QuestionRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty")
    try:
        retrieved = retrieve(question, CLAUSES, claim_date=request.claim_date)
        verified = verify(question, retrieved, claim_date=request.claim_date)
        result = generate_answer(question, verified, CLAUSES, claim_date=request.claim_date)
    except GroqError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Backend processing failed") from exc
    return AskResponse(
        status=result["status"],
        answer=result["answer"],
        sources=result["sources"],
        claim_date=result.get("claim_date"),
    )


