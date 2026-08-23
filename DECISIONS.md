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

## 6. Why I Kept the Frontend Focused and Clean

I built the React + Tailwind frontend as a clean presentation layer to showcase the backend capabilities. I avoided adding bloated features like user authentication, chat history databases, or heavy analytics dashboards. The UI directly highlights the three core response states (`answered`, `refused`, `conflict`) and allows clicking any citation to inspect full clause details.

---

## 7. What I Intentionally Avoided

- **Heavy RAG frameworks (LangChain / LlamaIndex)**: I wrote the core parsing, retrieval, and verification logic in plain Python so I have 100% control over how context is verified.
- **External Vector Databases (Pinecone / Weaviate)**: For a single policy corpus, loading embeddings into memory using `SentenceTransformers` and `numpy` dot products is faster, deterministic, and doesn't depend on cloud DB keys.
- **Silent LLM resolutions**: Never letting the model decide if evidence is valid — my backend code makes all verification and status decisions deterministically.
