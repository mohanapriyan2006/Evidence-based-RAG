# Grounded Answer — Evidence-Based Policy QA System

Welcome to **Grounded Answer**! This is an evidence-grounded policy Q&A system built for the Grounded Answer challenge. 

Instead of sending raw user questions blindly to an LLM, this system parses official policy documentation into structured clause evidence (`§x.x.x`), runs hybrid vector search, verifies evidence sufficiency, explicitly detects policy contradictions, and generates grounded answers with exact source citations.

---

## 🏗️ Architecture Flow

```text
User Question
     │
     ▼
Clause Ingestion (policy-manual.md)
     │
     ▼
Hybrid Vector Retrieval (retrieve.py)
     │
     ▼
Evidence Verification Gatekeeper (verify.py)
     │
  ┌──┴──────────────┬────────────────┐
  ▼                 ▼                ▼
ANSWERED         REFUSED          CONFLICT
  │                 │                │
  ▼                 ▼                ▼
Groq LLM        No LLM Call     No LLM Call
Synthesis     (Gap/No Evidence) (Both Clauses Shown)
  │                 │                │
  └─────────┬───────┴────────────────┘
            ▼
     Exact § Citations
```

---

## ⚙️ Prerequisites & Dependencies

### Backend Dependencies
- Python 3.10+
- `fastapi` & `uvicorn` (REST API backend)
- `pydantic` (Data models & schemas)
- `sentence-transformers` & `numpy` (Dense semantic embeddings using `all-MiniLM-L6-v2`)
- `python-dotenv` & `requests` (Environment config & Groq API client)
- `pytest` (Test suite)

### Frontend Dependencies
- Node.js 18+ & `npm`
- React 18 & TypeScript
- Vite & Tailwind CSS

---

## 🚀 Step-by-Step Setup Guide

### 1. Backend Setup & Virtual Environment (`venv`)

Open your terminal in the backend directory:

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration (Backend & Frontend)

Copy the provided `.env.example` files to `.env` in both directories and fill in your real values.

#### Backend `.env`

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
GROQ_API_KEY=gsk_your_actual_api_key_here
GROQ_MODEL=qwen/qwen3.6-27b
FRONTEND_ORIGIN=*
```

1. Go to [console.groq.com](https://console.groq.com) and create or sign in to your account.
2. Navigate to **API Keys** in the dashboard and click **Create API Key**.
3. Copy your API key string (e.g. `gsk_...`) into `GROQ_API_KEY`.

> **Note**: If `GROQ_API_KEY` is not provided, the backend automatically falls back to deterministic grounded formatting, returning exact policy evidence without breaking!

#### Frontend `.env`

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

---

## 🏃 How to Run the Project

### Option A: Run Interactive Terminal CLI Demo
You can test the core backend pipeline directly in your terminal without starting React:

```bash
cd backend
venv\Scripts\activate
python -m app.cli
```

### Option B: Run Full Stack (FastAPI Server + React Frontend)

**1. Start FastAPI Backend Server:**
```bash
cd backend
venv\Scripts\activate
python -m app.main
```
*The backend API will run at `http://localhost:8000`.*

**2. Start React Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*The web UI will open at `http://localhost:5173`.*

---

## 🧪 Running Tests & Evaluation Suite

### Run 10-Question Benchmark Evaluation
```bash
cd backend
venv\Scripts\activate
python -m evaluation.run
```
*Results are saved directly to `backend/evaluation/results.md`.*

### Run All Unit Tests
```bash
cd backend
venv\Scripts\activate
python -m pytest
```

---

## 🔧 How to Change AI API Endpoint and Model

If you want to switch to a different Groq model or use a custom OpenAI-compatible API endpoint (e.g., local Ollama server, vLLM, or alternative cloud endpoint), you can configure it easily in `backend/.env` or in `backend/app/rag/answer.py`:

### Environment Variables (`backend/.env`)
```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-120b
GROQ_URL=https://api.groq.com/openai/v1/chat/completions
```

To change model programmatically in `backend/app/rag/answer.py`:
```python
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_URL = os.getenv("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions")
```

---

## 📊 Groq Model Comparison & Model Ranking

Below is the model limits table for available Groq models:

| Model ID | Requests / Min (RPM) | Requests / Day (RPD) | Tokens / Min (TPM) | Tokens / Day (TPD) | Audio Min / Min | Audio Min / Day |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `openai/gpt-oss-120b` | 30 | 1K | 8K | 200K | - | - |
| `groq/compound` | 30 | 250 | 70K | - | - | - |
| `groq/compound-mini` | 30 | 250 | 70K | - | - | - |
| `qwen/qwen3.6-27b` | 30 | 1K | 8K | 200K | - | - |
| `openai/gpt-oss-20b` | 30 | 1K | 8K | 200K | - | - |


---

## 📌 API Endpoints Summary

- `GET /health`: Health check endpoint (`{"status": "ok"}`).
- `POST /ask`: Primary question answering endpoint (`{"question": "..."}`). Returns `status` (`answered`, `refused`, `conflict`), `answer`, and verified `sources`.
- `GET /sources/{clause_id}`: Direct clause lookup endpoint (e.g. `/sources/§2.1.1`), returning full clause details.
