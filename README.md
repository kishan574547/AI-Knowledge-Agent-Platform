# AI Knowledge Agent Platform (RAG Document Intelligence)

A secure, multi-tenant enterprise RAG (Retrieval-Augmented Generation) document intelligence platform powered by FastAPI, PostgreSQL (pgvector), Supabase Storage & Auth, and Google Gemini.

---

## 🌟 Key Features

- **Multi-Tenant Document Processing**: Isolated storage and pgvector retrieval scoped strictly per user/tenant.
- **Secure File Ingestion**: Validates file types (`.pdf`, `.docx`, `.txt`, `.md`), magic bytes, and sizes with asynchronous background vectorization.
- **Fast Chunking & Vector Search**: Automatic text chunking, local SentenceTransformer embedding (`all-MiniLM-L6-v2`), and cosine similarity search in PostgreSQL via `pgvector`.
- **Grounded AI Generation**: Google Gemini (`gemini-3.5-flash`) generation with anti-prompt injection barriers and verified document source citations.
- **Modern React & TypeScript UI**: Responsive dark theme dashboard with real-time processing status badges, interactive conversation history, and document scope selection.
- **Custom SMTP & OTP Authentication**: Supabase Auth with custom Gmail SMTP for 2-step OTP registration and 3-step password resets.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with `pgvector` (Supabase)
- **ORM & Migrations**: SQLAlchemy 2.0 + Alembic
- **Storage**: Supabase Private Storage
- **LLM**: Google Gemini (`google-genai` SDK)
- **Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`)

### Frontend
- **Framework**: React 18 with TypeScript + Vite
- **Styling**: TailwindCSS & Lucide React icons
- **State Management & Routing**: React Router v6, custom conversation hooks
- **API Client**: Axios with automatic Supabase JWT bearer injection

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Copy and configure environment variables
cp .env.example .env

# Start Vite development server
npm run dev
```

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes (auth, documents, rag, users)
│   │   ├── core/         # Config, security, exceptions
│   │   ├── database/     # SQLAlchemy engine & session
│   │   ├── models/       # ORM models (Document, Chunk, Conversation, Message)
│   │   ├── rag/          # Embeddings, chunking, retrieval & Gemini client
│   │   ├── repositories/ # Database repository layer
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── services/     # Business logic & background workers
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components (ChatPanel, DocumentCard, UploadModal)
│   │   ├── hooks/        # Custom React hooks (useConversations)
│   │   ├── pages/        # LoginPage, RegisterPage, ForgotPasswordPage, DashboardPage
│   │   ├── services/     # API integration services (auth, document, rag)
│   │   └── types/        # TypeScript interfaces
└── supabase_setup.sql    # Database schema, pgvector setup & RLS policies
```

---

## 📄 License
MIT License
