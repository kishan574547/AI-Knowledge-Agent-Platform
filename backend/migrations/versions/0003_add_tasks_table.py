"""Add tasks table with RLS

Revision ID: 0003_add_tasks_table
Revises: 0002_add_memories_table
Create Date: 2026-09-26 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0003_add_tasks_table'
down_revision: Union[str, None] = '0002_add_memories_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.create_table(
        'tasks',
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
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_tasks_owner_id', 'tasks', ['owner_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_created_at', 'tasks', ['created_at'])
    op.create_index('ix_tasks_due_at', 'tasks', ['due_at'])

    if is_postgres:
        op.execute("ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY "Tasks are manageable by owner only"
            ON tasks FOR ALL
            TO authenticated
            USING (auth.uid() = owner_id)
            WITH CHECK (auth.uid() = owner_id);
        """)


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute('DROP POLICY IF EXISTS "Tasks are manageable by owner only" ON tasks;')

    op.drop_table('tasks')
