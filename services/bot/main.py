"""
Telegram-бот для запуска витрины товаров (Mini App).

При /start показывает приветственное сообщение и устанавливает
кнопку «Каталог» в меню чата для открытия Mini App.
"""
import logging
import os

from telegram import Bot, MenuButtonWebApp, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# Логирование
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
)
logger = logging.getLogger(__name__)


# Приветственный текст при /start
WELCOME_TEXT = """🛒 Это тестовый магазин с витриной товаров.

Для запуска витрины нажмите на кнопку **«Каталог»** в меню внизу слева."""


async def cmd_start(update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка команды /start: приветствие."""
    user = update.effective_user
    logger.info("User %s started the bot", user.id if user else "unknown")
    await update.message.reply_text(WELCOME_TEXT, parse_mode="Markdown")


async def post_init(application: Application) -> None:
    """Установка кнопки «Каталог» в меню бота (по умолчанию для всех чатов)."""
    miniapp_url = os.getenv("MINIAPP_URL", "https://app.batoohan.ru/miniapp/")
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
