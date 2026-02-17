"""
Подключение к БД и сессии (async SQLAlchemy 2.0).
Используются только параметризованные запросы — защита от SQL injection.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()
engine = create_async_engine(
    settings.database_url,
    echo=settings.log_level.upper() == "DEBUG",
)

# Фабрика сессий
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Базовый класс для ORM-моделей."""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Зависимость FastAPI для получения сессии БД."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
