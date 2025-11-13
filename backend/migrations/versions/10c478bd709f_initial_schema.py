"""Initial schema

Revision ID: 10c478bd709f
Revises: 
Create Date: 2025-11-12 07:38:59.379753

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '10c478bd709f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('image', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('email')
    )
    
    op.create_table('folders',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_email', sa.Text(), nullable=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('parent_folder_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_email'], ['users.email'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_folder_id'], ['folders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('files',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_email', sa.Text(), nullable=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('icon_url', sa.Text(), nullable=True),
        sa.Column('mime_type', sa.Text(), nullable=True),
        sa.Column('starred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('last_interacted', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('folder_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['user_email'], ['users.email'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['folder_id'], ['folders.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('files')
    op.drop_table('folders')
    op.drop_table('users')
