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

  // Применяем фон из настроек (изображение или цвет)
  useEffect(() => {
    const root = document.getElementById('root')
    const body = document.body
    
    if (settings.background_image && settings.background_image.trim()) {
      // Используем изображение фона (цвет не применяем)
      const imageUrl = settings.background_image.startsWith('http') 
        ? settings.background_image 
        : (window.location.origin + settings.background_image)
      
      body.style.backgroundImage = `url(${imageUrl})`
      body.style.backgroundSize = 'cover'
      body.style.backgroundPosition = 'center'
      body.style.backgroundRepeat = 'no-repeat'
      body.style.backgroundColor = 'transparent'
      
      if (root) {
        root.style.backgroundImage = `url(${imageUrl})`
        root.style.backgroundSize = 'cover'
        root.style.backgroundPosition = 'center'
        root.style.backgroundRepeat = 'no-repeat'
        root.style.backgroundColor = 'transparent'
      }
    } else {
      // Используем только цвет (изображения нет)
      body.style.backgroundImage = 'none'
      body.style.backgroundColor = settings.background_color
      
      if (root) {
        root.style.backgroundImage = 'none'
        root.style.backgroundColor = settings.background_color
      }
    }
    
    document.documentElement.style.setProperty('--miniapp-bg-color', settings.background_color)
    
    // Применяем цвета текста из настроек
    document.documentElement.style.setProperty('--miniapp-text-color', settings.text_color)
    document.documentElement.style.setProperty('--miniapp-heading-color', settings.heading_color)
    document.documentElement.style.setProperty('--miniapp-price-color', settings.price_color)
    document.documentElement.style.setProperty('--miniapp-hint-color', settings.hint_color)
    document.documentElement.style.setProperty('--miniapp-card-bg-color', settings.card_bg_color)
    
    // Применяем цвета к body и root для глобального использования
    body.style.color = settings.text_color
    if (root) {
      root.style.color = settings.text_color
    }
  }, [settings.background_color, settings.background_image, settings.text_color, settings.heading_color, settings.price_color, settings.hint_color, settings.card_bg_color])

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
