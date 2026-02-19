/**
 * Конфигурация витрины — ссылка на контакт специалиста
 */
function normalizeTelegramLink(raw: string): string {
  const v = (raw || '').trim()
  if (!v) return ''

  // Разрешаем задавать контакт в разных удобных форматах:
  // - @username
  // - username
  // - t.me/username
  // - https://t.me/username
  if (v.startsWith('https://') || v.startsWith('http://') || v.startsWith('tg://')) return v
  if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`
  if (v.startsWith('t.me/')) return `https://${v}`
  return `https://t.me/${v}`
}

// ВАЖНО: это build-time переменная Vite (VITE_*).
// В docker-compose она автоматически заполняется из CONTACT_TELEGRAM_LINK (см. docker-compose.yml).
const CONTACT_LINK = normalizeTelegramLink(import.meta.env.VITE_CONTACT_TELEGRAM_LINK) || 'https://t.me/support'

export { CONTACT_LINK }
