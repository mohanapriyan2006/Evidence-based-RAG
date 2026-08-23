# AI Usage & Development Log

This document outlines how AI tools were utilized during the development of this project, in accordance with hackathon guidelines.

---

## Core System Architecture & Business Logic (Developed Manually by Me)

I designed and implemented the entire core RAG pipeline and verification logic manually. **No AI tools were used to auto-generate the core system logic.** 

Specifically, I manually coded:
1. **Document Ingestion & Clause Parsing (`app/rag/ingest.py`)**: RegEx patterns and logic to extract clauses, section headers, parts, and exact `§x.x.x` identifiers from `policy-manual.md`.
2. **Hybrid Vector Retrieval (`app/rag/retrieve.py`)**: SentenceTransformers integration, query tokenization, hybrid overlap scoring, sub-query splitting, and score normalization.
3. **Evidence Verification Engine (`app/rag/verify.py`)**: Token coverage ratio calculations, negation detection, conditional marker checking, refusal triggers, and contradiction detection logic (identifying conflicting clauses like §9.5.1 vs §9.5.2).
4. **Answer & Citation Pipeline (`app/rag/answer.py` & `app/rag/citations.py`)**: Prompt templates for grounded text generation and deterministic evidence citation mapping.
5. **Evaluation Suite (`evaluation/run.py`)**: Benchmark harness for running and scoring the 10 evaluation test cases.

---

## Where AI Tools Were Utilized

AI assistance was strictly restricted to secondary tasks, including:

1. **Debugging Errors & Compiler Warnings**:
   - Diagnosing specific TypeScript/JSX compilation errors (such as JSX syntax/token mismatches) and Python package version deprecation warnings.

2. **Frontend Styling & UI Component Refinement**:
   - Refining Tailwind CSS classes, improving glassmorphism aesthetic styling, adjusting dark mode color tokens, and styling popup modals.

3. **Boilerplate Creation**:
   - Creating initial SVG icon components, standard Pydantic request/response schemas, and basic component file skeletons.

---

## Summary

The central reliability layer, evidence verification algorithm, retrieval logic, refusal rules, and overall system design are 100% original work written and tested by me. AI tools were only used as an assistant for boilerplate generation, UI polishing, and resolving unexpected runtime error tracebacks.
