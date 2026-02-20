/**
 * Корневой компонент админки — роутинг.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { ProductList } from './pages/ProductList'
import { ProductEdit } from './pages/ProductEdit'
import { Categories } from './pages/Categories'
import { Settings } from './pages/Settings'
import { ProtectedRoute } from './ProtectedRoute'

export function App() {
  // В проде админка живёт по /admin/. В dev (vite) — обычно на /.
  const basename =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
      ? '/admin'
      : '/'
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ProductList />} />
          <Route path="/product/new" element={<ProductEdit />} />
          <Route path="/product/:id/edit" element={<ProductEdit />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
