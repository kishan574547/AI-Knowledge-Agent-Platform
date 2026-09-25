import io
import uuid
import pytest
from app.rag.extractors import (
    PDFExtractor,
    DocxExtractor,
    TextExtractor,
    MarkdownExtractor,
    get_extractor,
)
from app.rag.chunking import TextChunker, clean_text
from app.rag.chunking.text_chunker import DocumentChunkItem
from app.rag.extractors.base import ExtractedDocument, PageContent
from app.rag.embeddings import LocalEmbeddingService
from app.rag.retrieval import VectorRetriever
from app.rag.generation import gemini_client, SYSTEM_INSTRUCTION
from app.rag.pipeline.qa import RAGQAPipeline, RAGQueryRequest
from app.models.document import Document
from app.repositories.document_repo import DocumentRepository
from app.repositories.conversation_repo import ConversationRepository
from app.core.errors import FileValidationException, ResourceNotFoundException
from app.tests.conftest import USER_A_ID, USER_B_ID


# ==========================================
# 1. EXTRACTOR TESTS
# ==========================================

def test_text_extractor_valid():
    extractor = TextExtractor()
    doc = extractor.extract(b"Hello world\nThis is a test document.", "test.txt")
    assert "Hello world" in doc.text
    assert doc.pages[0].page is None


def test_markdown_extractor_valid():
    extractor = MarkdownExtractor()
    content = b"# Heading 1\n\nThis is **bold** text in markdown."
    doc = extractor.extract(content, "readme.md")
    assert "# Heading 1" in doc.text
    assert "**bold**" in doc.text


def test_extractor_empty_file_rejected():
    with pytest.raises(FileValidationException):
        TextExtractor().extract(b"", "empty.txt")
    with pytest.raises(FileValidationException):
        PDFExtractor().extract(b"", "empty.pdf")
    with pytest.raises(FileValidationException):
        DocxExtractor().extract(b"", "empty.docx")


def test_extractor_corrupted_file_rejected():
    with pytest.raises(FileValidationException):
        PDFExtractor().extract(b"Not a valid pdf binary content", "corrupt.pdf")
    with pytest.raises(FileValidationException):
        DocxExtractor().extract(b"Not a valid docx zip container", "corrupt.docx")


def test_get_extractor_factory():
    assert isinstance(get_extractor("report.pdf"), PDFExtractor)
    assert isinstance(get_extractor("doc.docx"), DocxExtractor)
    assert isinstance(get_extractor("notes.txt"), TextExtractor)
    assert isinstance(get_extractor("guide.md"), MarkdownExtractor)
    with pytest.raises(FileValidationException):
        get_extractor("virus.exe")


# ==========================================
# 2. CHUNKING & CLEANING TESTS
# ==========================================

def test_clean_text_normalizes_whitespace():
    raw = "Line 1   with    spaces.\r\n\r\n\r\n\r\nLine 2 with \x00 null bytes."
    cleaned = clean_text(raw)
    assert "Line 1 with spaces." in cleaned
    assert "\x00" not in cleaned
    assert "\r" not in cleaned
    assert "\n\n\n" not in cleaned


def test_text_chunker_deterministic_and_overlap():
    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    sample_text = (
        "Paragraph one contains first information. "
        "Paragraph two adds further details about the subject. "
        "Paragraph three concludes the document structure with final notes."
    )
    chunks = chunker.split_text(sample_text)
    assert len(chunks) >= 2
    for chunk in chunks:
        assert len(chunk) > 0
        assert len(chunk) <= 150  # Boundary respect buffer


def test_chunk_document_preserves_pages():
    chunker = TextChunker(chunk_size=200, chunk_overlap=20)
    extracted = ExtractedDocument(
        text="Page 1 text.\n\nPage 2 text.",
        pages=[
            PageContent(page=1, text="This is page 1 content with important facts."),
            PageContent(page=2, text="This is page 2 content with secondary findings."),
        ],
    )
    chunks = chunker.chunk_document(extracted, filename="paged.pdf")
    assert len(chunks) == 2
    assert chunks[0].page == 1
    assert chunks[0].chunk_index == 0
    assert chunks[1].page == 2
    assert chunks[1].chunk_index == 1


# ==========================================
# 3. LOCAL EMBEDDING TESTS
# ==========================================

def test_local_embedding_service_dimensions(monkeypatch):
    service = LocalEmbeddingService.get_instance()

    # Mock sentence_transformers if running in lightweight environment
    class MockSentenceTransformer:
        def encode(self, texts, **kwargs):
            if isinstance(texts, str):
                return [0.05] * 384
            return [[0.05] * 384 for _ in texts]

    service._model = MockSentenceTransformer()

    # Query embedding
    q_vec = service.embed_query("What is the quarterly revenue?")
    assert len(q_vec) == 384

    # Document batch embeddings
    doc_vecs = service.embed_documents(["First chunk", "Second chunk"])
    assert len(doc_vecs) == 2
    assert len(doc_vecs[0]) == 384
    assert len(doc_vecs[1]) == 384


def test_embedding_validation_rejects_invalid_dim():
    service = LocalEmbeddingService.get_instance()
    with pytest.raises(ValueError):
        service.validate_embedding([0.1] * 128)  # wrong dimension


# ==========================================
# 4. VECTOR RETRIEVAL & MULTI-TENANT ISOLATION
# ==========================================

def test_vector_retrieval_isolated_by_owner(db_session):
    user_a_uuid = uuid.UUID(USER_A_ID)
    user_b_uuid = uuid.UUID(USER_B_ID)

    doc_repo = DocumentRepository(db_session)
    doc_a = doc_repo.create(
        owner_id=user_a_uuid,
        filename="financials.pdf",
        storage_path=f"{user_a_uuid}/test/fin.pdf",
        file_type="application/pdf",
        file_size=500,
    )
    doc_b = doc_repo.create(
        owner_id=user_b_uuid,
        filename="medical_record.pdf",
        storage_path=f"{user_b_uuid}/test/med.pdf",
        file_type="application/pdf",
        file_size=500,
    )

    # Insert mock chunks
    chunk_a = doc_repo.create_chunk(
        document_id=doc_a.id,
        owner_id=user_a_uuid,
        chunk_index=0,
        content="User A revenue was 5 million dollars.",
        embedding=[0.1] * 384,
        chunk_metadata={"filename": "financials.pdf", "page": 1},
    )
    chunk_b = doc_repo.create_chunk(
        document_id=doc_b.id,
        owner_id=user_b_uuid,
        chunk_index=0,
        content="User B confidential diagnosis note.",
        embedding=[0.1] * 384,
        chunk_metadata={"filename": "medical_record.pdf", "page": 1},
    )

    retriever = VectorRetriever(db_session)
    query_vec = [0.1] * 384

    # User A queries: must only get User A chunk
    results_a = retriever.search_similar_chunks(
        query_vector=query_vec,
        owner_id=user_a_uuid,
        top_k=5,
        similarity_threshold=0.5,
    )
    assert len(results_a) == 1
    assert results_a[0].document_id == doc_a.id
    assert results_a[0].filename == "financials.pdf"

    # User B queries: must only get User B chunk
    results_b = retriever.search_similar_chunks(
        query_vector=query_vec,
        owner_id=user_b_uuid,
        top_k=5,
        similarity_threshold=0.5,
    )
    assert len(results_b) == 1
    assert results_b[0].document_id == doc_b.id
    assert results_b[0].filename == "medical_record.pdf"


# ==========================================
# 5. RAG QA PIPELINE & GEMINI GROUNDING TESTS
# ==========================================

def test_rag_qa_pipeline_successful_answer(db_session, monkeypatch):
    user_a_uuid = uuid.UUID(USER_A_ID)
    doc_repo = DocumentRepository(db_session)

    doc = doc_repo.create(
        owner_id=user_a_uuid,
        filename="project_plan.md",
        storage_path=f"{user_a_uuid}/test/plan.md",
        file_type="text/markdown",
        file_size=200,
    )
    doc_repo.create_chunk(
        document_id=doc.id,
        owner_id=user_a_uuid,
        chunk_index=0,
        content="The deadline for Phase 2 is October 15th.",
        embedding=[0.2] * 384,
        chunk_metadata={"filename": "project_plan.md", "page": None},
    )

    # Mock embeddings and Gemini client
    service = LocalEmbeddingService.get_instance()
    monkeypatch.setattr(service, "embed_query", lambda q: [0.2] * 384)

    def mock_gemini(question, context_str, *args, **kwargs):
        assert "October 15th" in context_str
        return "The deadline for Phase 2 is October 15th based on the plan."

    monkeypatch.setattr(gemini_client, "generate_grounded_answer", mock_gemini)

    pipeline = RAGQAPipeline(db_session)
    response = pipeline.execute_query(
        question="When is the Phase 2 deadline?",
        owner_id=user_a_uuid,
    )

    assert "October 15th" in response.answer
    assert len(response.sources) == 1
    assert response.sources[0].filename == "project_plan.md"
    assert response.sources[0].document_id == doc.id


def test_rag_qa_no_relevant_chunks_skips_gemini(db_session, monkeypatch):
    user_a_uuid = uuid.UUID(USER_A_ID)
    service = LocalEmbeddingService.get_instance()
    monkeypatch.setattr(service, "embed_query", lambda q: [0.5] * 384)

    # Ensure Gemini is NEVER called when no chunks exist
    def fail_if_called(*args, **kwargs):
        pytest.fail("Gemini should not be called when no chunks match threshold")

    monkeypatch.setattr(gemini_client, "generate_grounded_answer", fail_if_called)

    pipeline = RAGQAPipeline(db_session)
    response = pipeline.execute_query(
        question="Unrelated question with no matching documents?",
        owner_id=user_a_uuid,
    )

    assert "couldn't find relevant information" in response.answer.lower()
    assert response.sources == []


def test_rag_qa_unauthorized_document_id_rejected(db_session, monkeypatch):
    user_a_uuid = uuid.UUID(USER_A_ID)
    user_b_uuid = uuid.UUID(USER_B_ID)

    doc_repo = DocumentRepository(db_session)
    doc_b = doc_repo.create(
        owner_id=user_b_uuid,
        filename="user_b_private.pdf",
        storage_path=f"{user_b_uuid}/test/b.pdf",
        file_type="application/pdf",
        file_size=100,
    )

    pipeline = RAGQAPipeline(db_session)

    # User A tries to explicitly target User B's document_id
    with pytest.raises(ResourceNotFoundException):
        pipeline.execute_query(
            question="Tell me about User B document",
            owner_id=user_a_uuid,
            document_ids=[doc_b.id],
        )


# ==========================================
# 6. RAG API ROUTE INTEGRATION TESTS
# ==========================================

def test_api_rag_query_authorized(client, user_a_headers, monkeypatch):
    # Mock embedding and Gemini for fast HTTP API test
    service = LocalEmbeddingService.get_instance()
    monkeypatch.setattr(service, "embed_query", lambda q: [0.3] * 384)
    monkeypatch.setattr(
        gemini_client,
        "generate_grounded_answer",
        lambda q, c, *args, **kwargs: "Sample grounded answer from mock Gemini.",
    )

    payload = {
        "question": "What are the core findings?",
    }
    response = client.post("/api/v1/rag/query", headers=user_a_headers, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data


def test_api_rag_query_unauthenticated(client):
    response = client.post("/api/v1/rag/query", json={"question": "No auth question?"})
    assert response.status_code == 401


def test_api_rag_query_empty_question_rejected(client, user_a_headers):
    response = client.post("/api/v1/rag/query", headers=user_a_headers, json={"question": ""})
    assert response.status_code == 422
