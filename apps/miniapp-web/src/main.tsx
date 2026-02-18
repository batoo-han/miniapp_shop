/**
 * Точка входа Telegram Mini App (витрина товаров)
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

// Обязательная инициализация для Telegram WebView: без ready/expand Mini App может оставаться пустым
const tg = (window as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp
if (tg) {
  tg.ready?.()
  tg.expand?.()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
