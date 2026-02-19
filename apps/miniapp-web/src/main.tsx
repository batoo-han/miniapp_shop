/**
 * Точка входа Telegram Mini App (витрина товаров)
 */
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

type TgWebApp = { ready?: () => void; expand?: () => void }

const tg = (window as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp
if (tg) {
  tg.ready?.()
  tg.expand?.()
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
