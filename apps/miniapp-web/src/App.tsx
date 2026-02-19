/**
 * Корневой компонент витрины — роутинг и обёртка.
 *
 * Важно:
 * - Раньше использовали HashRouter для совместимости с Telegram WebView.
 * - Но Telegram (особенно Web-клиент) может добавлять служебные данные в URL fragment (hash),
 *   из-за чего HashRouter начинает считать это "маршрутом" и приложение выглядит пустым,
 *   при этом запросы к API не выполняются.
 *
 * Поэтому используем BrowserRouter (hash игнорируется) + nginx уже настроен на SPA (try_files),
 * так что прямые переходы/обновления страниц работают.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import { ProductList } from './pages/ProductList'
import { ProductDetail } from './pages/ProductDetail'
import { useSettings } from './contexts/SettingsContext'
import { useEffect } from 'react'

function AppContent() {
  const settings = useSettings()

  // Применяем цвет фона из настроек
  useEffect(() => {
    document.documentElement.style.setProperty('--miniapp-bg-color', settings.background_color)
    document.body.style.backgroundColor = settings.background_color
    const root = document.getElementById('root')
    if (root) {
      root.style.backgroundColor = settings.background_color
    }
  }, [settings.background_color])

  // В проде Mini App живёт по /miniapp/. В dev (vite) — обычно на /.
  const basename =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/miniapp')
      ? '/miniapp'
      : '/'
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        {/* Никогда не показываем "пустой экран" при неожиданных параметрах/маршрутах */}
        <Route path="*" element={<ProductList />} />
      </Routes>
    </BrowserRouter>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}
