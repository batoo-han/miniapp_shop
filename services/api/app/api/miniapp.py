"""
Публичные API для мини-приложения магазина (без авторизации).
"""
from fastapi import APIRouter

from app.config import get_settings
from app.schemas.admin import MiniappSettingsResponse

router = APIRouter()


@router.get("/settings", response_model=MiniappSettingsResponse)
async def get_miniapp_settings():
    """Получить публичные настройки для мини-приложения магазина."""
    s = get_settings()
    return MiniappSettingsResponse(
        section_title=s.miniapp_section_title,
        footer_text=s.miniapp_footer_text,
        background_color=s.miniapp_background_color,
        background_image=s.miniapp_background_image,
        text_color=s.miniapp_text_color,
        heading_color=s.miniapp_heading_color,
        price_color=s.miniapp_price_color,
        hint_color=s.miniapp_hint_color,
        card_bg_color=s.miniapp_card_bg_color,
        contact_telegram_link=s.contact_telegram_link,
    )
