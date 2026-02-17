/**
 * Общий Layout админки: хедер, навигация, кнопка «Добавить товар».
 * Тёмный хедер, светлая область контента.
 */
import { Link, Outlet, useNavigate } from 'react-router-dom'

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
            Админка
          </Link>
          <nav className="layout-nav">
            <Link to="/" className="layout-nav-link">
              Товары
            </Link>
            <Link to="/settings" className="layout-nav-link">
              Настройки
            </Link>
          </nav>
          <div className="layout-actions">
            <Link to="/product/new" className="btn btn-primary">
              Добавить товар
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Выход
            </button>
          </div>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}
