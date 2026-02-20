/**
 * Страница настроек системы
 */
import { useEffect, useState } from 'react'
import { getSettings, updateSettings, uploadBackgroundImage, deleteBackgroundImage, type Settings, type SettingsUpdate } from '../api'
import { useToast } from '../components/Toast'
import { FileUpload } from '../components/FileUpload'
import { ColorPicker } from '../components/ColorPicker'
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
        miniapp_section_title: data.miniapp_section_title,
        miniapp_footer_text: data.miniapp_footer_text,
        miniapp_background_color: data.miniapp_background_color,
        miniapp_background_image: data.miniapp_background_image,
        miniapp_text_color: data.miniapp_text_color,
        miniapp_heading_color: data.miniapp_heading_color,
        miniapp_price_color: data.miniapp_price_color,
        miniapp_hint_color: data.miniapp_hint_color,
        miniapp_card_bg_color: data.miniapp_card_bg_color,
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
        </section>

        {/* Настройки мини-приложения магазина */}
        <section className="settings-section">
          <h2>Мини-приложение магазина</h2>
          <div className="form-group">
            <label>
              Заголовок секции товаров
              <input
                type="text"
                value={formData.miniapp_section_title || ''}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, miniapp_section_title: e.target.value }))
                }
                placeholder="Витрина"
              />
              <small>Заголовок над списком товаров</small>
            </label>
          </div>
          <div className="form-group">
            <label>
              Текст в подвале
              <input
                type="text"
                value={formData.miniapp_footer_text || ''}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, miniapp_footer_text: e.target.value }))
                }
                placeholder="@TestoSmaipl_bot"
              />
              <small>Текст, отображаемый в нижней части мини-приложения</small>
            </label>
          </div>
          <ColorPicker
            label="Цвет фона страницы"
            value={formData.miniapp_background_color || '#000000'}
            onChange={(value) =>
              setFormData((d) => ({ ...d, miniapp_background_color: value }))
            }
            description="Цвет фона страницы мини-приложения (HEX формат). Используется, если не задано изображение."
          />
          <div className="form-group">
            <label>
              Изображение фона страницы
              {settings.miniapp_background_image ? (
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <img
                    src={settings.miniapp_background_image.startsWith('http') ? settings.miniapp_background_image : window.location.origin + settings.miniapp_background_image}
                    alt="Текущее фоновое изображение"
                    style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteBackgroundImage()
                        showToast('Фоновое изображение удалено', 'success')
                        loadSettings()
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : 'Ошибка удаления изображения', 'error')
                      }
                    }}
                    style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '0.875rem' }}
                  >
                    Удалить
                  </button>
                </div>
              ) : null}
              <FileUpload
                accept="image/jpeg,image/png,image/webp"
                multiple={false}
                onFilesSelected={async (files) => {
                  if (files.length === 0) return
                  try {
                    setSaving(true)
                    await uploadBackgroundImage(files[0])
                    showToast('Фоновое изображение загружено', 'success')
                    loadSettings()
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Ошибка загрузки изображения', 'error')
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                label="Выберите изображение для фона"
                description="или перетащите его сюда"
              />
              <small>Допустимые форматы: JPG, PNG, WebP. Максимальный размер: 50 МБ. Если задано, используется вместо цвета фона.</small>
            </label>
          </div>
          <ColorPicker
            label="Цвет основного текста"
            value={formData.miniapp_text_color || '#ffffff'}
            onChange={(value) =>
              setFormData((d) => ({ ...d, miniapp_text_color: value }))
            }
            description="Цвет основного текста на странице"
          />
          <ColorPicker
            label="Цвет заголовков"
            value={formData.miniapp_heading_color || '#ffffff'}
            onChange={(value) =>
              setFormData((d) => ({ ...d, miniapp_heading_color: value }))
            }
            description="Цвет заголовков секций и названий товаров"
          />
          <ColorPicker
            label="Цвет цен"
            value={formData.miniapp_price_color || '#00d4ff'}
            onChange={(value) =>
              setFormData((d) => ({ ...d, miniapp_price_color: value }))
            }
            description="Цвет отображения цен товаров"
          />
          <ColorPicker
            label="Цвет подсказок и вторичного текста"
            value={formData.miniapp_hint_color || '#cccccc'}
            onChange={(value) =>
              setFormData((d) => ({ ...d, miniapp_hint_color: value }))
            }
            description="Цвет описаний, подсказок и вторичного текста"
          />
          <ColorPicker
            label="Цвет фона карточек товаров"
            value={formData.miniapp_card_bg_color || '#2a2a2a'}
            onChange={(value) =>
              setFormData((d) => ({ ...d, miniapp_card_bg_color: value }))
            }
            description="Цвет фона карточек товаров"
          />
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
