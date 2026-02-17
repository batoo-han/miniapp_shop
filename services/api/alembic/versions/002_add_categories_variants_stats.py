"""add categories variants stats

Revision ID: 002
Revises: 001
Create Date: 2025-02-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["product_categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_product_categories_slug"), "product_categories", ["slug"], unique=True)

    op.add_column("products", sa.Column("sku", sa.String(64), nullable=True))
    op.add_column("products", sa.Column("manufacturer", sa.String(255), nullable=True))
    op.add_column("products", sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("products", sa.Column("view_count", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.create_foreign_key("fk_products_category", "products", "product_categories", ["category_id"], ["id"], ondelete="SET NULL")

    op.create_table(
        "product_variants",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("option_name", sa.String(128), nullable=False),
        sa.Column("option_value", sa.String(255), nullable=False),
        sa.Column("stock_qty", sa.Integer(), nullable=False),
        sa.Column("in_order_qty", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_product_variants_product_id"), "product_variants", ["product_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_product_variants_product_id"), table_name="product_variants")
    op.drop_table("product_variants")
    op.drop_constraint("fk_products_category", "products", type_="foreignkey")
    op.drop_column("products", "view_count")
    op.drop_column("products", "category_id")
    op.drop_column("products", "manufacturer")
    op.drop_column("products", "sku")
    op.drop_index(op.f("ix_product_categories_slug"), table_name="product_categories")
    op.drop_table("product_categories")
