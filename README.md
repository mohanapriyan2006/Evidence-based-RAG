# Grounded Answer — Evidence-Based RAG System

An evidence-grounded policy Q&A assistant built for the Grounded Answer problem statement. Every answer traces back to exact policy clauses, explicitly handles policy contradictions, and refuses when evidence is insufficient.

## Architecture

```text
Question → Retriever → Relevant Clauses → Evidence Verification → Answer / Refusal / Conflict → Citations
```

- **Backend**: Python, FastAPI, Pydantic, SentenceTransformers (`all-MiniLM-L6-v2`)
- **Frontend**: React, TypeScript, Tailwind CSS
- **Policy Data**: Policy Manual (`grounded-answer/data/policy-manual.md`)

## Quick Start

### 1. Backend Setup

```bash
cd grounded-answer/backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The API runs at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd grounded-answer/frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Evaluation Benchmark

Run the 10-question evaluation benchmark:

```bash
cd grounded-answer/backend
python -m evaluation.run
```

View evaluation results in `grounded-answer/backend/evaluation/results.md`.

## Unit Tests

Run unit tests across all RAG modules:

```bash
cd grounded-answer/backend
python -m unittest discover -s test
```
