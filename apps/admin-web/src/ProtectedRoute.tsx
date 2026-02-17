/**
 * Защищённый маршрут — редирект на логин при отсутствии токена.
 * Оборачивает контент в Layout (хедер, навигация).
 */
import { Navigate, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'

export function ProtectedRoute() {
  const token = localStorage.getItem('admin_token')
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Layout />
}
