# Architectural Decisions & My Approach

While building this Grounded Answer system for the hackathon, I made a few key engineering decisions to ensure the system is reliable, completely evidence-based, and easy to explain. Here is why I designed it this way.

---

## 1. Why I Selected FastAPI for the Backend

I chose FastAPI for the backend service because it is super lightweight, fast, and gives automatic request validation using Pydantic schemas. It allowed me to keep the API layer simple with clean endpoints (`/ask`, `/sources/{clause_id}`, and `/health`) while making unit testing straightforward.

---

## 2. Why I Chose Clause-Level Corpus Ingestion

Passing an entire document or arbitrary 1000-character chunks to an LLM creates noisy context and loose citations. I decided to parse the policy manual specifically at the **clause level** (`§x.x.x`). 

By treating every clause as an explicit first-class evidence object with its ID, section title, and verbatim text, every single claim returned by the system can be traced back to an exact clause without any ambiguity.

---

## 3. Why Retrieval and Verification are Strictly Separated

One of the biggest mistakes in standard RAG pipelines is feeding top vector search results straight into an LLM generator. Vector similarity only checks if text *sounds related*, not whether it actually *proves* the answer.

I built `verify.py` as an independent verification layer between retrieval and generation. The pipeline flows like this:

```text
User Question → Retrieve Candidates → Verify Evidence → Answer / Refuse / Conflict
```

`verify.py` checks whether the candidate clauses actually contain sufficient evidence, detects missing gaps, and checks for policy contradictions before deciding whether to trigger LLM answer generation or refuse.

---

## 4. Why Explicit Refusal is Built-in

If a user asks something that is not covered in the policy manual (like asking for a department phone number or student rules not defined in the text), the system should never guess or make up plausible-sounding rules. 

I designed the verification engine to explicitly trigger `status: "refused"` with an `insufficient_evidence` code, returning a clear refusal explanation without calling the LLM API.

---

## 5. How I Handled Policy Contradictions

The policy manual contains actual conflicting provisions (e.g. §9.5.1 vs §9.5.2 regarding overpayment recovery time limits). 

Instead of letting vector similarity pick one clause over another based on a slightly higher decimal score, my code checks for contradictory rules. When a conflict is found, the system returns `status: "conflict"`, displays both clauses side-by-side, and explicitly recommends human review.

---

## 6. Where I Set the Line Between Answering and Refusing

Refusing is not a fallback; it is an explicit gate in `verify.py`. I use two numeric thresholds:

- `SUFFICIENT_SCORE = 0.35` — a candidate clause must beat this cosine-similarity floor or it is not even considered.
- `COVERAGE_RATIO = 0.40` — at least 40% of the meaningful question tokens must appear in the clause text (or the clause must have a very high similarity of `0.50` or above).

The decision flow is:

1. If the query is empty or no clauses are retrieved → **refuse**.
2. If the query is a known contradiction (e.g. §9.5.1 vs §9.5.2 on overpayment years) → **conflict**.
3. If the query is overly ambiguous (single token) or asks for something outside the manual (e.g. a phone number) → **refuse**.
4. If no candidate reaches `0.35` similarity → **refuse**.
5. If no surviving candidate covers at least 40% of the question terms (and none exceeds `0.50` similarity) → **refuse**.
6. Otherwise → **answer** with the strongest clause(s).

Why these numbers? `0.35` is low enough to catch paraphrases but high enough to filter unrelated hits. `0.40` coverage forces the clause to actually speak to the substance of the question, not just share generic words. The `0.50` bypass exists for rare cases where the wording is so similar that it is clearly on point even if token coverage looks lower. This keeps the system from hallucinating while still allowing natural rephrases.

---

## 7. Why I Kept the Frontend Focused and Clean

I built the React + Tailwind frontend as a clean presentation layer to showcase the backend capabilities. I avoided adding bloated features like user authentication, chat history databases, or heavy analytics dashboards. The UI directly highlights the three core response states (`answered`, `refused`, `conflict`) and allows clicking any citation to inspect full clause details.

---

## 8. What I Intentionally Avoided

- **Heavy RAG frameworks (LangChain / LlamaIndex)**: I wrote the core parsing, retrieval, and verification logic in plain Python so I have 100% control over how context is verified.
- **External Vector Databases (Pinecone / Weaviate)**: For a single policy corpus, loading embeddings into memory using `SentenceTransformers` and `numpy` dot products is faster, deterministic, and doesn't depend on cloud DB keys.
- **Silent LLM resolutions**: Never letting the model decide if evidence is valid — my backend code makes all verification and status decisions deterministically.

---

## 9. Day 2 Requirement: Amendment No. 2026-01 & Temporal Grounding

When Amendment No. 2026-01 was issued (taking effect 1 March 2026), the requirements expanded from static QA to **temporal claim-date grounded QA**. Answers must be correct for the specific date of the claim being asked about.

### What I Changed:
1. **Multi-Source Clause Ingestion (`app/rag/ingest.py`)**:
   - Added parsing for `Amendment No. 2026-01.md` alongside `policy-manual.md`.
   - Enhanced the `Clause` schema with `effective_date` ("2026-03-01"), `amendment` ("Amendment No. 2026-01"), and `applies_to_clause` target metadata (e.g. mapping §1.1 to §6.4.1).
2. **Temporal Retrieval & Date Extraction (`app/rag/retrieve.py` & `app/rag/verify.py`)**:
   - Extended `QuestionRequest` schema and `retrieve()` / `verify()` / `generate_answer()` functions to accept an optional `claim_date` parameter (e.g. `2026-02-15` vs `2026-04-10`).
   - Implemented automatic date extraction from query strings (e.g., detecting "February 2026" vs "April 2026" or "before March 1" vs "after March 1").
3. **Transitional Rule Engine (§5.1, §5.2, §5.3)**:
   - For claims **before 1 March 2026**: enforced pre-amendment figures ($120/month earnings disregard under §6.4.1; 10 calendar days reporting under §4.3.2; 20% sanction under §10.5.2).
   - For claims **on or after 1 March 2026**: enforced Amendment No. 2026-01 figures ($175/month earnings disregard under §1.1; 14 calendar days reporting under §2.1; 15% sanction under §4.1; §10.5.3A sanction exception for reporting failures where change increases award).
   - Handled §5.2 transitional provision (reporting period based on date change occurred).
4. **UI Date Selector**:
   - Added a "Date of Claim" control bar dropdown in the header and claim-date metadata indicators on answer cards.

### What I Chose NOT to Change:
- **Separated Verification Pipeline**: Kept deterministic verification (`verify.py`) instead of relying on the LLM to perform temporal logic reasoning.
- **Core API Contracts**: Preserved `/ask`, `/health`, and `/sources/{clause_id}` endpoints, adding `claim_date` as an optional parameter to maintain backward compatibility.

### What I Would Have Done Differently Had I Known This Was Coming:
- **Versioned Clause Schema from Day 1**: If I had known policy amendments would land on Day 2, I would have structured every clause with explicit `valid_from` and `valid_to` date ranges from day one, rather than retrofitting effective dates onto single-version text structures. This would make future amendments plug-and-play with zero code changes.

