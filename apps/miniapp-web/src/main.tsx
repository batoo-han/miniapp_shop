/**
 * Точка входа Telegram Mini App (витрина товаров)
 */
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

type TgWebApp = {
  initData?: string
  initDataUnsafe?: unknown
  ready?: () => void
  expand?: () => void
  showAlert?: (message: string) => void
}

const tg = (window as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp
if (tg) {
  tg.ready?.()
  tg.expand?.()
}

function showFatal(message: string) {
  const el = document.getElementById('root')
  if (el) {
    el.innerHTML = `
      <div style="padding:16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Не удалось открыть витрину</div>
        <div style="white-space:pre-wrap;line-height:1.35">${message.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</div>
      </div>
    `
  }
  tg?.showAlert?.(message)
}

// Диагностика: если Mini App запускается из кнопки `web_app` и при этом "пустой" —
// это часто либо блокировка WebView, либо ошибка JS до первого запроса к API.
// Мы включаем мягкую проверку и понятное сообщение ТОЛЬКО в Telegram-контейнере.
async function telegramStartupProbe() {
  if (!tg) return
  // В некоторых клиентах объект есть, но initData пустой. Всё равно пробуем сеть.
  const controller = new AbortController()
  const t = window.setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${window.location.origin}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) {
      showFatal(
        `WebApp запустился, но API недоступен (HTTP ${res.status}).\n` +
          `Откройте витрину по ссылке: ${window.location.origin}/miniapp/`
      )
    }
  } catch {
    showFatal(
      `Telegram открыл WebApp, но запрос к API не прошёл.\n` +
        `Чаще всего это ограничения клиента/окружения.\n` +
        `Откройте витрину по ссылке: ${window.location.origin}/miniapp/`
    )
  } finally {
    window.clearTimeout(t)
  }
}

window.addEventListener('error', (e) => {
  if (!tg) return
  const msg = e.error instanceof Error ? `${e.error.name}: ${e.error.message}` : String(e.message || 'Ошибка')
  showFatal(`Ошибка в приложении: ${msg}`)
})
window.addEventListener('unhandledrejection', (e) => {
  if (!tg) return
  const r = (e as PromiseRejectionEvent).reason
  const msg = r instanceof Error ? `${r.name}: ${r.message}` : String(r || 'Ошибка')
  showFatal(`Ошибка в приложении: ${msg}`)
})

void telegramStartupProbe()

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
