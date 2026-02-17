"""
Маршруты API.
"""
from fastapi import APIRouter

from app.api import admin, files, products

router = APIRouter()
router.include_router(products.router, prefix="/products", tags=["products"])
router.include_router(files.router, prefix="/files", tags=["files"])
router.include_router(admin.router_public, prefix="/admin", tags=["admin"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
