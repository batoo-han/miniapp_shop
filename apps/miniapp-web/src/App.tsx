/**
 * Корневой компонент витрины — роутинг и обёртка.
 * HashRouter для совместимости с Telegram WebView.
 */
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ProductList } from './pages/ProductList'
import { ProductDetail } from './pages/ProductDetail'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
      </Routes>
    </HashRouter>
  )
}
