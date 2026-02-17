/**
 * Корневой компонент админки — роутинг.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { ProductList } from './pages/ProductList'
import { ProductEdit } from './pages/ProductEdit'
import { Settings } from './pages/Settings'
import { ProtectedRoute } from './ProtectedRoute'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ProductList />} />
          <Route path="/product/new" element={<ProductEdit />} />
          <Route path="/product/:id/edit" element={<ProductEdit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
