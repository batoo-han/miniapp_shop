/**
 * Точка входа Telegram Mini App (витрина товаров)
 */
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

// Обязательная инициализация для Telegram WebView
const tg = (window as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp
if (tg) {
  tg.ready?.()
  tg.expand?.()
}

const root = document.getElementById('root')!

// В WebView Telegram fetch иногда блокируется. Запрос до монтирования React,
// при ошибке — понятное сообщение вместо пустого экрана.
const apiUrl = `${window.location.origin}/api/products/?page=1&per_page=1&sort=sort_order`
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 15000)
fetch(apiUrl, { signal: controller.signal })
  .then((r) => {
    clearTimeout(timeout)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })
  .then(() => {
    ReactDOM.createRoot(root).render(<App />)
  })
  .catch((err) => {
    clearTimeout(timeout)
    const msg = err?.name === 'AbortError' ? 'Таймаут запроса' : String(err?.message || err)
    root.innerHTML = `<div style="padding:20px;font-family:sans-serif;color:#333;background:#fff;">
      <p><strong>Ошибка загрузки данных</strong></p>
      <p>${msg}</p>
      <p style="font-size:12px;color:#666;">Проверьте соединение и откройте снова.</p>
    </div>`
  })
