"""Initial schema with pgvector and Row Level Security (RLS)

Revision ID: 0001_initial_schema_with_rls
Revises: 
Create Date: 2026-09-25 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema_with_rls'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable PostgreSQL extensions
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
        op.execute('CREATE EXTENSION IF NOT EXISTS "vector";')

    # 2. Profiles table
    op.create_table(
        'profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()') if is_postgres else None),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'])
    op.create_index('ix_profiles_created_at', 'profiles', ['created_at'])

    # 3. Documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()') if is_postgres else None),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('storage_path', sa.String(length=1024), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='uploaded'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_documents_owner_id', 'documents', ['owner_id'])
    op.create_index('ix_documents_status', 'documents', ['status'])
    op.create_index('ix_documents_created_at', 'documents', ['created_at'])

    # 4. Document Chunks table
    op.create_table(
        'document_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()') if is_postgres else None),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(384), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb") if is_postgres else None),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])
    op.create_index('ix_document_chunks_owner_id', 'document_chunks', ['owner_id'])
    op.create_index('ix_document_chunks_chunk_index', 'document_chunks', ['chunk_index'])

    # 5. Conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()') if is_postgres else None),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, server_default='New Conversation'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_conversations_owner_id', 'conversations', ['owner_id'])
    op.create_index('ix_conversations_updated_at', 'conversations', ['updated_at'])

    # 6. Messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()') if is_postgres else None),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    op.create_index('ix_messages_owner_id', 'messages', ['owner_id'])
    op.create_index('ix_messages_created_at', 'messages', ['created_at'])

    # 7. Enable Row Level Security (RLS) & Policies on Postgres
    if is_postgres:
        # Profiles RLS
        op.execute("ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Profiles are manageable by user only" 
            ON profiles FOR ALL 
            TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
        """)

        # Documents RLS
        op.execute("ALTER TABLE documents ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Documents are manageable by owner only" 
            ON documents FOR ALL 
            TO authenticated 
            USING (auth.uid() = owner_id) 
            WITH CHECK (auth.uid() = owner_id);
        """)

        # Document Chunks RLS
        op.execute("ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Document chunks are manageable by owner only" 
            ON document_chunks FOR ALL 
            TO authenticated 
            USING (auth.uid() = owner_id) 
            WITH CHECK (auth.uid() = owner_id);
        """)

        # Conversations RLS
        op.execute("ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Conversations are manageable by owner only" 
            ON conversations FOR ALL 
            TO authenticated 
            USING (auth.uid() = owner_id) 
            WITH CHECK (auth.uid() = owner_id);
        """)

        # Messages RLS
        op.execute("ALTER TABLE messages ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Messages are manageable by owner only" 
            ON messages FOR ALL 
            TO authenticated 
            USING (auth.uid() = owner_id) 
            WITH CHECK (auth.uid() = owner_id);
        """)


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("DROP POLICY IF EXISTS \"Messages are manageable by owner only\" ON messages;")
        op.execute("DROP POLICY IF EXISTS \"Conversations are manageable by owner only\" ON conversations;")
        op.execute("DROP POLICY IF EXISTS \"Document chunks are manageable by owner only\" ON document_chunks;")
        op.execute("DROP POLICY IF EXISTS \"Documents are manageable by owner only\" ON documents;")
        op.execute("DROP POLICY IF EXISTS \"Profiles are manageable by user only\" ON profiles;")

    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.drop_table('profiles')
