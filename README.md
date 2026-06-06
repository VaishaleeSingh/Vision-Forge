# VisionForge

Full-stack AI/ML platform — multi-agent GenAI orchestration, RAG document Q&A, computer vision tooling, and **real sklearn training** on business datasets. Next.js app with MongoDB persistence and measurable ML metrics.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Agents** | Research, Content, Analysis, and ML Planning pipelines with SSE streaming |
| **ML Training Lab** | Six business models (tabular + NLP) trained via Python sklearn |
| **Knowledge Base** | PDF upload → chunk → embed → RAG chat + precision@5 evaluation |
| **Text / Image Studio** | Streaming text generation and fal.ai image generation |
| **Resume Screener** | JD vs resume structured evaluation |
| **Library** | Searchable history of generations |
| **Auth** | Email/password via NextAuth |

---

## Agent flow

All agents run through `POST /api/agents/run` and stream step updates over **Server-Sent Events**. Each step calls Gemini 2.0 Flash (Groq Llama optional); on completion the full run is saved to MongoDB as an `AgentRun`.

```
User task → API route → Step 1 → Step 2 → … → Final output
                ↓              ↓         ↓
            SSE events    LLM call   prior step context
                ↓
         AgentRun saved (steps[], finalOutput, tokensUsed)
```

### Agent types

| Type | Steps | Purpose |
|------|-------|---------|
| **research** (default) | Researcher → Writer → Critic | Research outline → article → editorial review |
| **content** | Researcher → Writer → Critic → Final Refinement | Publication-ready marketing copy |
| **analysis** | Data Extraction → Insight → Recommendations | Consulting-style analysis report |
| **model-training** | 9-step ML pipeline (see below) | AI planning only — separate from real Python training |

### ML Planning pipeline (9 steps)

Defined in `src/features/agents/server/workflows.ts`. Each step receives prior pipeline context (plus optional CSV dataset profile from upload).

1. ML Orchestrator Agent  
2. Data Preprocessing Agent  
3. Model Selection Agent  
4. Model Training Agent  
5. Model Evaluation Agent  
6. Hyperparameter Optimization Agent  
7. NLP Fine-tuning Agent  
8. Computer Vision Training Agent  
9. Final ML Report Agent  

The violet **AI Planning** panel in Agents runs this pipeline. The dark **ML Training Lab** runs **real** sklearn training via `POST /api/ml/train` — metrics are not LLM-generated.

### ML Training Lab flow (executable)

```
Select model preset → Upload CSV → Train
        ↓
POST /api/ml/train → python-runner → train_tabular.py | train_text_classifier.py
        ↓
MlTrainingRun (metrics, artifactPath, businessSummary)
```

| Model | Type | Sample CSV (`public/ml-samples/`) |
|-------|------|-----------------------------------|
| Customer Churn Predictor | Tabular | `customer_churn_predictor.csv` |
| Industrial CO Emission Risk | NLP | `industrial_co_emission_risk.csv` |
| Loan Default Risk | Tabular | `loan_default_risk_predictor.csv` |
| Transaction Fraud Detector | Tabular | `transaction_fraud_detector.csv` |
| Manufacturing QA Defect Severity | NLP | `manufacturing_qa_defect_severity.csv` |
| Phishing Email Classifier | NLP | `phishing_email_classifier.csv` |

Dummy CSVs are for manual upload only (not auto-loaded). Regenerate with `npm run ml:samples`.

---

## Storage

### MongoDB collections

| Collection | Model | What is stored |
|------------|-------|----------------|
| `users` | `User` | Auth credentials, profile |
| `agentruns` | `AgentRun` | Agent type, task, per-step content/status, final output, token count |
| `mltrainingruns` | `MlTrainingRun` | Preset ID, metrics (accuracy, F1, etc.), artifact path, business summary |
| `knowledgedocuments` | `KnowledgeDocument` | PDF metadata, extracted text (≤4MB), chunk count, RAG eval results |
| `documentchunks` | `DocumentChunk` | Chunk text + embedding vector (Gemini 768-d or BGE 384-d) |
| `generations` | `Generation` | Text/image studio outputs, prompts, favorites |

Knowledge PDFs are **not** stored on disk — text is extracted in memory, chunked, embedded, and persisted in MongoDB.

### File system (local, gitignored)

| Path | Contents |
|------|----------|
| `data/ml-models/{userId}/{runId}/model.joblib` | Trained sklearn artifacts from ML Lab |

Training CSVs are held in browser memory during a session; they are not written to the server filesystem.

### Key API routes

| Route | Role |
|-------|------|
| `POST /api/agents/run` | Agent pipelines (SSE) |
| `POST /api/ml/train` | Real sklearn training |
| `POST /api/knowledge/upload` | PDF → chunk → embed |
| `POST /api/knowledge/chat` | RAG Q&A |
| `POST /api/knowledge/documents/[id]/eval` | RAG precision@5 evaluation |
| `POST /api/generate/text` | Text Studio streaming |
| `POST /api/resume-screener` | Resume vs JD scoring |

---

## Architecture

```
Next.js UI (Agents · Knowledge · Studio · Library)
        │ API Routes
lib/ai.ts · lib/rag.ts · lib/embeddings.ts · lib/ml/*
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
    MongoDB      Python sklearn   Gemini / Groq / HF / fal
```

| Path | Purpose |
|------|---------|
| `src/app/(dashboard)/` | Feature UIs |
| `src/app/api/` | REST + SSE endpoints |
| `src/features/agents/` | Workflows, CSV analysis |
| `src/features/ml/` | Model presets, validation |
| `src/lib/ml/` | Python runner |
| `scripts/` | Training scripts + sample generator |
| `public/ml-samples/` | Dummy CSVs for upload testing |

---

## Tech stack

Next.js 16 · React · Tailwind · Framer Motion · MongoDB/Mongoose · NextAuth v5 · Python 3.10+ (pandas, scikit-learn) · Gemini · Groq · Hugging Face BGE · fal.ai

---

## Getting started

```bash
git clone https://github.com/VaishaleeSingh/Vision-Forge.git
cd Vision-Forge
npm install
cp .env.example .env   # copy env template, then add your API keys and MongoDB URI
pip install -r requirements-ml.txt
npm run ml:samples     # optional dummy CSVs
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional env: `HUGGINGFACE_API_KEY` (RAG), `FAL_API_KEY` (images), `PYTHON_PATH=python` (Windows: `py`).

---

## Deploy

### Full flow (recommended) — Railway or Render

Includes **ML Training Lab** (Python sklearn). Uses the repo `Dockerfile` (Node + Python).

1. Connect [VaishaleeSingh/Vision-Forge](https://github.com/VaishaleeSingh/Vision-Forge) on [Railway](https://railway.app) or [Render](https://render.com).
2. Deploy with **Docker** (auto-detects `Dockerfile`).
3. Add environment variables from `.env.example` (same as local).
4. Set `NEXTAUTH_URL` to your live URL (e.g. `https://your-app.up.railway.app`).
5. MongoDB Atlas → Network Access → allow `0.0.0.0/0`.

### GenAI only — Netlify

Uses `netlify.toml`. Works for agents, RAG, studio, auth. **ML Train button will not work** (no Python on Netlify).

1. [Netlify](https://app.netlify.com) → Import from Git → this repo.
2. Add env vars; set `NEXTAUTH_URL` to your `*.netlify.app` URL after first deploy.
3. Redeploy after updating `NEXTAUTH_URL`.

---

## License

Private portfolio project. See repository owner for usage terms.
