/**
 * Страница управления категориями товаров.
 * Позволяет создавать, редактировать и удалять категории.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '../api'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast, ToastContainer } = useToast()

  // Состояние модального окна
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sort_order: 0,
    parent_id: '' as string,
  })
  const [saving, setSaving] = useState(false)

  // Загрузка списка категорий
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listCategories()
      setCategories(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки категорий')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Открытие модального окна для создания
  function handleOpenCreate() {
    setEditingCategory(null)
    setFormData({ name: '', slug: '', sort_order: categories.length, parent_id: '' })
    setShowModal(true)
  }

  // Открытие модального окна для редактирования
  function handleOpenEdit(cat: Category) {
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      slug: cat.slug,
      sort_order: cat.sort_order,
      parent_id: cat.parent_id || '',
    })
    setShowModal(true)
  }

  // Закрытие модального окна
  function handleCloseModal() {
    setShowModal(false)
    setEditingCategory(null)
    setFormData({ name: '', slug: '', sort_order: 0, parent_id: '' })
  }

  // Автогенерация slug из названия
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
          ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
          н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
          ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
          ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
        }
        return map[char] || char
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Обработка изменения названия (автогенерация slug)
  function handleNameChange(value: string) {
    const newFormData = { ...formData, name: value }
    // Автогенерация slug только для новых категорий или если slug пустой
    if (!editingCategory || !formData.slug) {
      newFormData.slug = generateSlug(value)
    }
    setFormData(newFormData)
  }

  // Сохранение категории
  async function handleSave() {
    if (!formData.name.trim()) {
      showToast('Введите название категории', 'error')
      return
    }
    if (!formData.slug.trim()) {
      showToast('Введите slug категории', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        sort_order: formData.sort_order,
        parent_id: formData.parent_id || null,
      }

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
        showToast('Категория обновлена', 'success')
      } else {
        await createCategory(payload)
        showToast('Категория создана', 'success')
      }

      handleCloseModal()
      await loadCategories()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка сохранения'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Удаление категории
  async function handleDelete(cat: Category) {
    if (!confirm(`Удалить категорию "${cat.name}"?`)) return

    try {
      await deleteCategory(cat.id)
      showToast('Категория удалена', 'success')
      await loadCategories()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка удаления'
      showToast(msg, 'error')
    }
  }

  if (loading) return <p className="loading">Загрузка категорий...</p>

  return (
    <div className="categories-page">
      <ToastContainer />

      <div className="categories-header">
        <h1>Категории</h1>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          Добавить категорию
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {categories.length === 0 ? (
        <div className="categories-empty">
          <p>Категорий пока нет</p>
          <p className="hint">Создайте первую категорию для организации товаров</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Slug</th>
                <th>Порядок</th>
                <th>Родитель</th>
                <th style={{ width: 150 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {categories
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((cat) => {
                  const parent = categories.find((c) => c.id === cat.parent_id)
                  return (
                    <tr key={cat.id}>
                      <td>{cat.name}</td>
                      <td>
                        <code style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {cat.slug}
                        </code>
                      </td>
                      <td>{cat.sort_order}</td>
                      <td>{parent ? parent.name : '—'}</td>
                      <td>
                        <button
                          className="btn-link"
                          onClick={() => handleOpenEdit(cat)}
                          style={{ marginRight: 12 }}
                        >
                          Изменить
                        </button>
                        <button
                          className="btn-link btn-danger"
                          onClick={() => handleDelete(cat)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCategory ? 'Редактировать категорию' : 'Новая категория'}
      >
        <div className="form-group">
          <label>
            Название <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Например: Электроника"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>
            Slug <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
            placeholder="elektronika"
          />
          <span className="form-hint">
            URL-идентификатор категории (латиница, цифры, дефисы)
          </span>
        </div>

        <div className="form-group">
          <label>Порядок сортировки</label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) =>
              setFormData((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))
            }
          />
        </div>

        <div className="form-group">
          <label>Родительская категория</label>
          <select
            value={formData.parent_id}
            onChange={(e) => setFormData((f) => ({ ...f, parent_id: e.target.value }))}
          >
            <option value="">— Нет (корневая) —</option>
            {categories
              .filter((c) => c.id !== editingCategory?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
