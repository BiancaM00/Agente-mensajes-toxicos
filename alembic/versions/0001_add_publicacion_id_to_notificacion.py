"""add publicacion_id to notificacion

Revision ID: 0001_add_publicacion_id
Revises: 
Create Date: 2026-05-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_add_publicacion_id'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add column publicacion_id
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('notificacion')]
    if 'publicacion_id' not in cols:
        op.add_column('notificacion', sa.Column('publicacion_id', sa.Integer(), nullable=True))
        # Add foreign key if publicacion table exists
        if 'publicacion' in inspector.get_table_names():
            op.create_foreign_key('fk_notificacion_publicacion', 'notificacion', 'publicacion', ['publicacion_id'], ['id'], ondelete='SET NULL')
        op.create_index('idx_notificacion_publicacion', 'notificacion', ['publicacion_id'])


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('notificacion')]
    if 'publicacion_id' in cols:
        try:
            op.drop_constraint('fk_notificacion_publicacion', 'notificacion', type_='foreignkey')
        except Exception:
            pass
        try:
            op.drop_index('idx_notificacion_publicacion', table_name='notificacion')
        except Exception:
            pass
        op.drop_column('notificacion', 'publicacion_id')
