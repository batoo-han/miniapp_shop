/**
 * Страница входа в админку
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export function Login() {
  const navigate = useNavigate()
  const [loginVal, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await login(loginVal, password)
      localStorage.setItem('admin_token', res.access_token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: '100px auto' }}>
      <h1>Вход в админку</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          Логин
          <input
            type="text"
            value={loginVal}
            onChange={(e) => setLogin(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: 10 }}>
          Войти
        </button>
      </form>
    </div>
  )
}
