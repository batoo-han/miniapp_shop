/**
 * Страница настроек системы
 */
import { useEffect, useState } from 'react'
import { getSettings, updateSettings, type Settings, type SettingsUpdate } from '../api'
import { useToast } from '../components/Toast'
import './Settings.css'

export function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<SettingsUpdate>({})
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await getSettings()
      setSettings(data)
      setFormData({
        contact_telegram_link: data.contact_telegram_link,
        storage_max_file_size_mb: data.storage_max_file_size_mb,
        storage_allowed_image_types: data.storage_allowed_image_types,
        storage_allowed_attachment_types: data.storage_allowed_attachment_types,
        log_level: data.log_level,
        log_max_bytes_mb: data.log_max_bytes_mb,
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка загрузки настроек', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateSettings(formData)
      setSettings(updated)
      showToast('Настройки успешно сохранены', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения настроек', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="loading">Загрузка настроек...</p>
  }

  if (!settings) {
    return <p className="error">Не удалось загрузить настройки</p>
  }

  return (
    <div className="settings-page">
      <ToastContainer />
      <h1>Настройки системы</h1>

      <form onSubmit={handleSubmit} className="settings-form">
        {/* Telegram настройки */}
        <section className="settings-section">
          <h2>Telegram</h2>
          <div className="form-group">
            <label>
              Ссылка для кнопки "Связаться с оператором"
              <input
                type="text"
                value={formData.contact_telegram_link || ''}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, contact_telegram_link: e.target.value }))
                }
                placeholder="https://t.me/support"
              />
              <small>Используется в мини-приложении для связи с оператором</small>
            </label>
          </div>
        </section>

        {/* Настройки хранилища */}
        <section className="settings-section">
          <h2>Хранилище файлов</h2>
          <div className="form-group">
            <label>
              Максимальный размер файла (МБ)
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1000"
                value={formData.storage_max_file_size_mb ?? ''}
                onChange={(e) =>
                  setFormData((d) => ({
                    ...d,
                    storage_max_file_size_mb: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
              <small>Максимальный размер загружаемого файла в мегабайтах</small>
            </label>
          </div>
          <div className="form-group">
            <label>
              Разрешённые типы изображений
              <input
                type="text"
                value={formData.storage_allowed_image_types || ''}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, storage_allowed_image_types: e.target.value }))
                }
                placeholder="image/jpeg,image/png,image/webp"
              />
              <small>MIME-типы изображений через запятую</small>
            </label>
          </div>
          <div className="form-group">
            <label>
              Разрешённые типы файлов
              <input
                type="text"
                value={formData.storage_allowed_attachment_types || ''}
                onChange={(e) =>
                  setFormData((d) => ({
                    ...d,
                    storage_allowed_attachment_types: e.target.value,
                  }))
                }
                placeholder="application/pdf,application/zip"
              />
              <small>MIME-типы файлов через запятую</small>
            </label>
          </div>
          <div className="settings-readonly">
            <div className="readonly-item">
              <strong>Путь к хранилищу:</strong>
              <code>{settings.storage_path}</code>
            </div>
          </div>
        </section>

        {/* Настройки логирования */}
        <section className="settings-section">
          <h2>Логирование</h2>
          <div className="form-group">
            <label>
              Уровень логирования
              <select
                value={formData.log_level || ''}
                onChange={(e) => setFormData((d) => ({ ...d, log_level: e.target.value }))}
              >
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <small>Уровень детализации логов</small>
            </label>
          </div>
          <div className="form-group">
            <label>
              Максимальный размер логов (МБ)
              <input
                type="number"
                step="0.1"
                min="1"
                max="1000"
                value={formData.log_max_bytes_mb ?? ''}
                onChange={(e) =>
                  setFormData((d) => ({
                    ...d,
                    log_max_bytes_mb: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
              <small>Максимальный размер файла логов в мегабайтах</small>
            </label>
          </div>
        </section>

        {/* Только для чтения */}
        <section className="settings-section">
          <h2>Системные настройки (только чтение)</h2>
          <div className="settings-readonly">
            <div className="readonly-item">
              <strong>Порт API:</strong>
              <code>{settings.api_port}</code>
            </div>
            <div className="readonly-item">
              <strong>CORS Origins:</strong>
              <code>{settings.cors_origins}</code>
            </div>
          </div>
        </section>

        <div className="settings-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadSettings()}
            disabled={saving}
          >
            Отменить изменения
          </button>
        </div>
      </form>
    </div>
  )
}
