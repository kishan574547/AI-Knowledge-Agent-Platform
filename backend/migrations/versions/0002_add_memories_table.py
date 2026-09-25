"""Add memories table with pgvector and RLS

Revision ID: 0002_add_memories_table
Revises: 0001_initial_schema_with_rls
Create Date: 2026-09-25 19:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '0002_add_memories_table'
down_revision: Union[str, None] = '0001_initial_schema_with_rls'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Create memories table
    op.create_table(
        'memories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()') if is_postgres else None),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('memory_type', sa.String(length=50), nullable=False, server_default='fact'),
        sa.Column('embedding', Vector(384), nullable=True),
        sa.Column('importance', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('source_conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('source_message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb") if is_postgres else None),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index('ix_memories_owner_id', 'memories', ['owner_id'])
    op.create_index('ix_memories_memory_type', 'memories', ['memory_type'])
    op.create_index('ix_memories_created_at', 'memories', ['created_at'])

    # 2. Row Level Security and Vector index for PostgreSQL / Supabase
    if is_postgres:
        op.execute("ALTER TABLE memories ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'memories' AND policyname = 'Memories are manageable by owner only'
                ) THEN
                    CREATE POLICY "Memories are manageable by owner only" 
                    ON memories FOR ALL 
                    TO authenticated 
                    USING (auth.uid() = owner_id) 
                    WITH CHECK (auth.uid() = owner_id);
                END IF;
            END $$;
        """)

        # Vector cosine similarity index
        try:
            op.execute("""
                CREATE INDEX IF NOT EXISTS ix_memories_embedding 
                ON memories USING hnsw (embedding vector_cosine_ops);
            """)
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("DROP POLICY IF EXISTS \"Memories are manageable by owner only\" ON memories;")
        op.execute("DROP INDEX IF EXISTS ix_memories_embedding;")

    op.drop_table('memories')
