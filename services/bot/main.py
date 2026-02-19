"""
Telegram-бот для запуска витрины товаров (Mini App).

При /start показывает приветственное сообщение и устанавливает
кнопку «Каталог» в меню чата для открытия Mini App.
"""
import logging
import os

from telegram import MenuButtonWebApp, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# Логирование: httpx/httpcore не логируем каждый getUpdates
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


def get_miniapp_url() -> str:
    """
    URL Mini App.

    Важно по документации Telegram:
    - это должен быть HTTPS-URL
    - Web App открывается из приватного чата с ботом через кнопки типа `web_app`
    """
    return os.getenv("MINIAPP_URL", "https://app.batoohan.ru/miniapp/").strip()


def get_welcome_text() -> str:
    """
    Приветственный текст при /start.
    """
    return """🛒 Это тестовый магазин с витриной товаров.

Для запуска витрины нажмите на кнопку «Каталог» в меню."""


async def ensure_menu_button_for_chat(application: Application, chat_id: int) -> None:
    """
    Гарантируем кнопку меню «Каталог» для конкретного чата.

    По Bot API `setChatMenuButton` работает только для приватных чатов.
    Выставлять на /start надёжнее, чем надеяться на "дефолтную" кнопку.
    """
    miniapp_url = get_miniapp_url()
    await application.bot.set_chat_menu_button(
        chat_id=chat_id,
        menu_button=MenuButtonWebApp(
            text="Каталог",
            web_app=WebAppInfo(url=miniapp_url),
        ),
    )


async def cmd_start(update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка команды /start: приветствие."""
    user = update.effective_user
    logger.info("User %s started the bot", user.id if user else "unknown")
    if not update.effective_chat:
        return

    # Важный момент: кнопки `web_app` (и меню-кнопка) корректно работают в приватном чате с ботом.
    await ensure_menu_button_for_chat(context.application, update.effective_chat.id)

    if update.message:
        await update.message.reply_text(get_welcome_text())


async def post_init(application: Application) -> None:
    """Установка кнопки «Каталог» в меню бота (по умолчанию для всех чатов)."""
    miniapp_url = get_miniapp_url()
    await application.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="Каталог",
            web_app=WebAppInfo(url=miniapp_url),
        ),
    )
    logger.info("Menu button 'Каталог' set for %s", miniapp_url)


def main() -> None:
    """Запуск бота."""
    token = os.getenv("BOT_TOKEN")
    if not token:
        logger.error("BOT_TOKEN not set")
        raise SystemExit(1)

    app = Application.builder().token(token).post_init(post_init).build()
    app.add_handler(CommandHandler("start", cmd_start))

    logger.info("Bot starting (polling)")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
