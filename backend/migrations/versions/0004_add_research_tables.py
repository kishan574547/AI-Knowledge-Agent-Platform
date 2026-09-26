"""Add research_sessions table with RLS

Revision ID: 0004_add_research_tables
Revises: 0003_add_tasks_table
Create Date: 2026-09-26 13:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0004_add_research_tables'
down_revision: Union[str, None] = '0003_add_tasks_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.create_table(
        'research_sessions',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36),
            primary_key=True,
            server_default=sa.text('uuid_generate_v4()') if is_postgres else None,
        ),
        sa.Column(
            'owner_id',
            postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36),
            nullable=False,
        ),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('plan', postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=True),
        sa.Column('retrieved_sources', postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=True),
        sa.Column('analysis', postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=True),
        sa.Column('verification', postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=True),
        sa.Column('final_report', postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=True),
        sa.Column('failed_agent', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('execution_log', postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_research_sessions_owner_id', 'research_sessions', ['owner_id'])
    op.create_index('ix_research_sessions_status', 'research_sessions', ['status'])
    op.create_index('ix_research_sessions_created_at', 'research_sessions', ['created_at'])

    if is_postgres:
        op.execute("ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Research sessions are manageable by owner only"
            ON research_sessions FOR ALL
            TO authenticated
            USING (auth.uid() = owner_id)
            WITH CHECK (auth.uid() = owner_id);
        """)


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute('DROP POLICY IF EXISTS "Research sessions are manageable by owner only" ON research_sessions;')

    op.drop_table('research_sessions')
