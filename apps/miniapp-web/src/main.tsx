/**
 * Точка входа Telegram Mini App (витрина товаров)
 */
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

const tg = (window as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp
if (tg) {
  tg.ready?.()
  tg.expand?.()
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
