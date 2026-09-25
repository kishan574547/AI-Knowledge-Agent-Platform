-- ============================================================
-- PRODUCTION RAG DOCUMENT Q&A SYSTEM
-- Supabase SQL Editor Setup Script
-- Run this ONCE in your Supabase project SQL Editor:
--   Dashboard -> SQL Editor -> New Query -> paste all -> Run
-- ============================================================

-- STEP 1: Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- STEP 2a: Profiles (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email       VARCHAR(255),
    full_name   VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_profiles_user_id    ON profiles (user_id);
CREATE INDEX IF NOT EXISTS ix_profiles_created_at ON profiles (created_at);

-- STEP 2b: Documents
CREATE TABLE IF NOT EXISTS documents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id     UUID NOT NULL,
    filename     VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    file_type    VARCHAR(100) NOT NULL,
    file_size    INTEGER NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_documents_owner_id   ON documents (owner_id);
CREATE INDEX IF NOT EXISTS ix_documents_status     ON documents (status);
CREATE INDEX IF NOT EXISTS ix_documents_created_at ON documents (created_at);

-- STEP 2c: Document Chunks (384 dims for all-MiniLM-L6-v2)
CREATE TABLE IF NOT EXISTS document_chunks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    owner_id     UUID NOT NULL,
    chunk_index  INTEGER NOT NULL,
    content      TEXT NOT NULL,
    embedding    vector(384),
    metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS ix_document_chunks_owner_id    ON document_chunks (owner_id);
CREATE INDEX IF NOT EXISTS ix_document_chunks_chunk_index ON document_chunks (chunk_index);

-- STEP 2d: Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id   UUID NOT NULL,
    title      VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_conversations_owner_id   ON conversations (owner_id);
CREATE INDEX IF NOT EXISTS ix_conversations_updated_at ON conversations (updated_at);

-- STEP 2e: Messages
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    owner_id        UUID NOT NULL,
    role            VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS ix_messages_owner_id        ON messages (owner_id);
CREATE INDEX IF NOT EXISTS ix_messages_created_at      ON messages (created_at);

-- STEP 3: Alembic Version Stamp (prevents Alembic from re-running migrations)
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num)
VALUES ('0001_initial_schema_with_rls')
ON CONFLICT DO NOTHING;

-- STEP 4: Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are manageable by user only" ON profiles;
CREATE POLICY "Profiles are manageable by user only"
    ON profiles FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Documents are manageable by owner only" ON documents;
CREATE POLICY "Documents are manageable by owner only"
    ON documents FOR ALL TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Document chunks are manageable by owner only" ON document_chunks;
CREATE POLICY "Document chunks are manageable by owner only"
    ON document_chunks FOR ALL TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Conversations are manageable by owner only" ON conversations;
CREATE POLICY "Conversations are manageable by owner only"
    ON conversations FOR ALL TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages are manageable by owner only" ON messages;
CREATE POLICY "Messages are manageable by owner only"
    ON messages FOR ALL TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- STEP 5: Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
        CREATE TRIGGER trg_profiles_updated_at
            BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_documents_updated_at') THEN
        CREATE TRIGGER trg_documents_updated_at
            BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_document_chunks_updated_at') THEN
        CREATE TRIGGER trg_document_chunks_updated_at
            BEFORE UPDATE ON document_chunks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_updated_at') THEN
        CREATE TRIGGER trg_conversations_updated_at
            BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_updated_at') THEN
        CREATE TRIGGER trg_messages_updated_at
            BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- STEP 6: Private Storage Bucket named "documents"
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
CREATE POLICY "Users can read their own documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DONE: Schema is fully set up.
-- Do NOT run "alembic upgrade head" -- already stamped above.
