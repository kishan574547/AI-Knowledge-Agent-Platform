"""Add conversation_type to conversations and events to messages

Revision ID: 0005_conv_type_events
Revises: 0004_add_research_tables
Create Date: 2026-09-26 14:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector

revision: str = '0005_conv_type_events'
down_revision: Union[str, None] = '0004_add_research_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    inspector = Inspector.from_engine(bind)

    # Add conversation_type to conversations if not present
    conv_cols = [c['name'] for c in inspector.get_columns('conversations')]
    if 'conversation_type' not in conv_cols:
        op.add_column(
            'conversations',
            sa.Column('conversation_type', sa.String(length=50), nullable=False, server_default='rag'),
        )
        op.create_index('ix_conversations_conversation_type', 'conversations', ['conversation_type'])

    # Add events to messages for MCP tool history if not present
    msg_cols = [c['name'] for c in inspector.get_columns('messages')]
    if 'events' not in msg_cols:
        op.add_column(
            'messages',
            sa.Column(
                'events',
                postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(),
                nullable=True,
            ),
        )


def downgrade() -> None:
    op.drop_column('messages', 'events')
    op.drop_index('ix_conversations_conversation_type', table_name='conversations')
    op.drop_column('conversations', 'conversation_type')
