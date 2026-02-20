/**
 * Список товаров в панели управления: таблица с превью, фильтрами, 
 * сортировкой по столбцам, раскрытием вариантов, панель статистики.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, Search, X } from 'lucide-react'
import {
  listProducts,
  listCategories,
  listManufacturers,
  getStats,
  deleteProduct,
  type ProductListItem,
  type StatsResponse,
  type SortField,
  type SortOrder,
} from '../api'
import { getFileUrl } from '../api'

export function ProductList() {
  const [data, setData] = useState<{ items: ProductListItem[]; total: number; page: number; per_page: number } | null>(
    null
  )
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formFilters, setFormFilters] = useState({
    search: '',
    category_id: '',
    is_published: undefined as boolean | undefined,
    manufacturer: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category_id: '',
    is_published: undefined as boolean | undefined,
    manufacturer: '',
    page: 1,
    per_page: 10,
    sort_by: 'sort_order' as SortField,
    sort_order: 'asc' as SortOrder,
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [productsRes, statsRes, catsRes, mfrsRes] = await Promise.all([
        listProducts({
          search: appliedFilters.search || undefined,
          category_id: appliedFilters.category_id || undefined,
          is_published: appliedFilters.is_published,
          manufacturer: appliedFilters.manufacturer || undefined,
          page: appliedFilters.page,
          per_page: appliedFilters.per_page,
          sort_by: appliedFilters.sort_by,
          sort_order: appliedFilters.sort_order,
        }),
        getStats(),
        listCategories(),
        listManufacturers(),
      ])
      setData(productsRes)
      setStats(statsRes)
      setCategories(catsRes.map((c) => ({ id: c.id, name: c.name })))
      setManufacturers(mfrsRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedFilters((prev) => ({ ...prev, ...formFilters, page: 1 }))
  }

  const resetFilters = () => {
    const empty = {
      search: '',
      category_id: '',
      is_published: undefined as boolean | undefined,
      manufacturer: '',
    }
    setFormFilters(empty)
    setAppliedFilters((prev) => ({ ...prev, ...empty, page: 1 }))
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить товар?')) return
    setDeletingId(id)
    try {
      await deleteProduct(id)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления')
    } finally {
      setDeletingId(null)
    }
  }

  // Обработка сортировки по столбцу
  const handleSort = (field: SortField) => {
    setAppliedFilters((prev) => {
      if (prev.sort_by === field) {
        // Переключение направления сортировки
        return { ...prev, sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc', page: 1 }
      }
      // Новый столбец - сортировка по возрастанию
      return { ...prev, sort_by: field, sort_order: 'asc', page: 1 }
    })
  }

  // Изменение количества элементов на странице
  const handlePerPageChange = (value: number) => {
    setAppliedFilters((prev) => ({ ...prev, per_page: value, page: 1 }))
  }

  // Компонент заголовка сортируемого столбца
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = appliedFilters.sort_by === field
    const isAsc = appliedFilters.sort_order === 'asc'

    return (
      <th
        className={`sortable-header ${isActive ? 'active' : ''}`}
        onClick={() => handleSort(field)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span className="sortable-header-content">
          {children}
          <span className="sort-icon">
            {isActive ? (
              isAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUp size={14} style={{ opacity: 0.3 }} />
            )}
          </span>
        </span>
      </th>
    )
  }

  const imgUrl = (p: ProductListItem): string | null => {
    if (p.image_url) {
      const match = p.image_url.match(/\/api\/files\/([a-f0-9-]+)/i)
      if (match) return getFileUrl(match[1])
    }
    return null
  }

  if (loading && !data) return <p className="loading">Загрузка...</p>
  if (error && !data) return <p className="error">{error}</p>

  const totalPages = data ? Math.ceil(data.total / appliedFilters.per_page) : 1

  return (
    <div className="product-list">
      {/* Панель статистики */}
      {stats && (
        <div className="stats-panel">
          <div className="stat-card">
            <span className="stat-value">{stats.total_products}</span>
            <span className="stat-label">Всего товаров</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.published_count}</span>
            <span className="stat-label">Опубликовано</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_views}</span>
            <span className="stat-label">Просмотры</span>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <form className="filters" onSubmit={applyFilters}>
        <input
          type="search"
          placeholder="Поиск по названию или артикулу"
          value={formFilters.search}
          onChange={(e) => setFormFilters((p) => ({ ...p, search: e.target.value }))}
          className="filter-input"
        />
        <select
          value={formFilters.category_id}
          onChange={(e) => setFormFilters((p) => ({ ...p, category_id: e.target.value }))}
          className="filter-select"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={formFilters.manufacturer}
          onChange={(e) => setFormFilters((p) => ({ ...p, manufacturer: e.target.value }))}
          className="filter-select"
        >
          <option value="">Все производители</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={formFilters.is_published === undefined ? '' : String(formFilters.is_published)}
          onChange={(e) =>
            setFormFilters((p) => ({
              ...p,
              is_published: e.target.value === '' ? undefined : e.target.value === 'true',
            }))
          }
          className="filter-select"
        >
          <option value="">Все</option>
          <option value="true">Опубликованные</option>
          <option value="false">Черновики</option>
        </select>
        <button type="submit" className="btn btn-primary btn-with-icon">
          <Search size={16} />
          <span>Применить</span>
        </button>
        <button type="button" className="btn btn-secondary btn-with-icon" onClick={resetFilters}>
          <X size={16} />
          <span>Сбросить</span>
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {/* Таблица */}
      <div className="table-wrap">
        <table className="product-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}></th>
              <th>Превью</th>
              <th>Название</th>
              <SortableHeader field="sku">Артикул</SortableHeader>
              <SortableHeader field="price">Цена</SortableHeader>
              <SortableHeader field="manufacturer">Производитель</SortableHeader>
              <th>Категория</th>
              <SortableHeader field="status">Статус</SortableHeader>
              <SortableHeader field="views">Просмотры</SortableHeader>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <React.Fragment key={p.id}>
                <tr
                  key={p.id}
                  className={expandedIds.has(p.id) ? 'expanded' : ''}
                  onClick={() => p.variants.length > 0 && toggleExpand(p.id)}
                  style={p.variants.length > 0 ? { cursor: 'pointer' } : undefined}
                >
                  <td>
                    {p.variants.length > 0 && (
                      <span className="expand-icon">{expandedIds.has(p.id) ? '▼' : '▶'}</span>
                    )}
                  </td>
                  <td>
                    {imgUrl(p) ? (
                      <img src={imgUrl(p)!} alt="" className="thumb" />
                    ) : (
                      <span className="thumb-placeholder">—</span>
                    )}
                  </td>
                  <td>{p.title}</td>
                  <td>{p.sku || '—'}</td>
                  <td>
                    {p.price_amount != null
                      ? `${p.price_amount} ${p.price_currency || 'RUB'}`
                      : '—'}
                  </td>
                  <td>{p.manufacturer || '—'}</td>
                  <td>{p.category_name || '—'}</td>
                  <td>
                    <span className={`badge ${p.is_published ? 'badge-success' : 'badge-draft'}`}>
                      {p.is_published ? 'Опубликован' : 'Черновик'}
                    </span>
                  </td>
                  <td>{p.view_count}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link to={`/product/${p.id}/edit`} className="btn-link">
                      Редактировать
                    </Link>
                    {' · '}
                    <button
                      type="button"
                      className="btn-link btn-danger"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
                {expandedIds.has(p.id) && p.variants.length > 0 && (
                  <tr key={`${p.id}-variants`} className="variants-row">
                    <td colSpan={10}>
                      <div className="variants-panel">
                        <strong>Варианты:</strong>
                        <table className="variants-table">
                          <thead>
                            <tr>
                              <th>Опция</th>
                              <th>Значение</th>
                              <th>В наличии</th>
                              <th>В заказе</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.variants.map((v) => (
                              <tr key={v.id}>
                                <td>{v.option_name}</td>
                                <td>{v.option_value}</td>
                                <td>{v.stock_qty}</td>
                                <td>{v.in_order_qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {data && (
        <div className="pagination">
          <div className="pagination-per-page">
            <span>Показывать:</span>
            <select
              value={appliedFilters.per_page}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="filter-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={appliedFilters.page <= 1}
              onClick={() => setAppliedFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              ← Назад
            </button>
            <span className="pagination-info">
              Страница {appliedFilters.page} из {totalPages} (всего {data.total})
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={appliedFilters.page >= totalPages}
              onClick={() => setAppliedFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
