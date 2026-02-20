/**
 * Общий Layout панели управления: хедер, навигация, кнопка "Добавить товар".
 * Темный хедер, светлая область контента.
 */
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Package, FolderTree, Settings, Plus, LogOut, LayoutDashboard } from 'lucide-react'
import { ScrollToTop } from './ScrollToTop'

export function Layout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-inner">
          <Link to="/" className="layout-logo">
            <LayoutDashboard size={20} />
            <span>Панель управления</span>
          </Link>
          <nav className="layout-nav">
            <Link to="/" className="layout-nav-link">
              <Package size={18} />
              <span>Товары</span>
            </Link>
            <Link to="/categories" className="layout-nav-link">
              <FolderTree size={18} />
              <span>Категории</span>
            </Link>
            <Link to="/settings" className="layout-nav-link">
              <Settings size={18} />
              <span>Настройки</span>
            </Link>
          </nav>
          <div className="layout-actions">
            <Link to="/product/new" className="btn btn-primary btn-with-icon">
              <Plus size={18} />
              <span>Добавить товар</span>
            </Link>
            <button type="button" className="btn btn-ghost btn-with-icon" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выход</span>
            </button>
          </div>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      <ScrollToTop />
    </div>
  )
}
