/**
 * Страница входа в панель управления.
 * Современный дизайн с карточкой, иконками и градиентным фоном.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, User, Lock, LogIn, AlertCircle } from 'lucide-react'
import { login } from '../api'
import './Login.css'

export function Login() {
  const navigate = useNavigate()
  const [loginVal, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(loginVal, password)
      localStorage.setItem('admin_token', res.access_token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Шапка */}
        <header className="login-header">
          <div className="login-icon">
            <Shield />
          </div>
          <h1 className="login-title">Панель управления</h1>
          <p className="login-subtitle">Войдите в систему для продолжения</p>
        </header>

        {/* Форма входа */}
        <form className="login-form" onSubmit={handleSubmit}>
          {/* Поле логина */}
          <div className="login-field">
            <label className="login-field-label" htmlFor="login">
              Логин
            </label>
            <div className="login-field-wrapper">
              <input
                id="login"
                type="text"
                className="login-field-input"
                value={loginVal}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                required
                autoComplete="username"
                autoFocus
              />
              <span className="login-field-icon">
                <User />
              </span>
            </div>
          </div>

          {/* Поле пароля */}
          <div className="login-field">
            <label className="login-field-label" htmlFor="password">
              Пароль
            </label>
            <div className="login-field-wrapper">
              <input
                id="password"
                type="password"
                className="login-field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                autoComplete="current-password"
              />
              <span className="login-field-icon">
                <Lock />
              </span>
            </div>
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="login-error">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Кнопка входа */}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              'Вход...'
            ) : (
              <>
                <LogIn />
                <span>Войти</span>
              </>
            )}
          </button>
        </form>

        {/* Футер */}
        <footer className="login-footer">
          <p className="login-footer-text">
            Управление магазином — витрина товаров
          </p>
        </footer>
      </div>
    </div>
  )
}
