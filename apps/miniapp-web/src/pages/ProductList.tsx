/**
 * Страница списка товаров — плитка с пагинацией
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, getFileUrl, type ProductListItem } from '../api'
import { useSettings } from '../contexts/SettingsContext'
import { Footer } from '../components/Footer'
import './ProductList.css'

export function ProductList() {
  const settings = useSettings()
  const [items, setItems] = useState<ProductListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const perPage = 12

  useEffect(() => {
    setLoading(true)
    fetchProducts(page, perPage)
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  if (loading && items.length === 0) return <div className="product-list">Загрузка...</div>
  if (error) return <div className="product-list product-list--error">{error}</div>

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="product-list">
      <h1 className="product-list__title">{settings.section_title}</h1>

      {items.length === 0 ? (
        <p className="product-list__empty">Нет товаров</p>
      ) : (
        <>
          <div className="product-grid">
            {items.map((p) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="product-card">
                <div className="product-card__image">
                  {p.image_url ? (
                    <img src={getFileUrl(p.image_url)} alt={p.title} />
                  ) : (
                    <div className="product-card__placeholder">Нет фото</div>
                  )}
                </div>
                <div className="product-card__body">
                  <h3 className="product-card__title">{p.title}</h3>
                  {p.price_amount != null && (
                    <div className="product-card__price">
                      {p.price_amount.toLocaleString('ru-RU')} {p.price_currency || '₽'}
                    </div>
                  )}
                  {p.short_description && (
                    <p className="product-card__desc">{p.short_description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="product-list__pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
      <Footer footerText={settings.footer_text} />
    </div>
  )
}
