/**
 * Карточка товара — галерея, описание, ТТХ, файлы, кнопка «Связаться»
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchProduct, getFileUrl, trackProductView, type ProductDetail } from '../api'
import { downloadFile, openTelegramLink } from '../useTelegram'
import { CONTACT_LINK } from '../config'
import './ProductDetail.css'

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [galleryIndex, setGalleryIndex] = useState(0)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchProduct(slug)
      .then((p) => {
        setProduct(p)
        trackProductView(slug)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="product-detail">Загрузка...</div>
  if (error || !product) {
    return (
      <div className="product-detail">
        <p style={{ color: '#c00' }}>{error || 'Товар не найден'}</p>
        <Link to="/">Назад к списку</Link>
      </div>
    )
  }

  const images = product.images || []
  const currentImage = images[galleryIndex]

  return (
    <div className="product-detail">
      <Link to="/" className="product-detail__back">
        ← Назад к списку
      </Link>

      <h1 className="product-detail__title">{product.title}</h1>

      {images.length > 0 && (
        <div className="product-detail__gallery">
          <div className="product-detail__gallery-main">
            <img
              src={getFileUrl(currentImage.url)}
              alt={currentImage.alt || product.title}
            />
          </div>
          {images.length > 1 && (
            <div className="product-detail__gallery-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`product-detail__thumb ${i === galleryIndex ? 'active' : ''}`}
                  onClick={() => setGalleryIndex(i)}
                >
                  <img src={getFileUrl(img.url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(product.price_amount != null || product.price_currency) && (
        <div className="product-detail__price">
          {product.price_amount != null && (
            <>
              {product.price_amount.toLocaleString('ru-RU')} {product.price_currency || '₽'}
            </>
          )}
        </div>
      )}

      {product.description && (
        <div className="product-detail__section">
          <h3>Описание</h3>
          <p className="product-detail__desc">{product.description}</p>
        </div>
      )}

      {product.specs && product.specs.length > 0 && (
        <div className="product-detail__section">
          <h3>Характеристики</h3>
          <ul className="product-detail__specs">
            {product.specs.map((s) => (
              <li key={s.id}>
                <span className="product-detail__spec-name">{s.name}</span>
                <span className="product-detail__spec-value">
                  {s.value} {s.unit || ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.attachments && product.attachments.length > 0 && (
        <div className="product-detail__section">
          <h3>Файлы</h3>
          <ul className="product-detail__attachments">
            {product.attachments.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="product-detail__download"
                  onClick={() =>
                    downloadFile(getFileUrl(a.url), a.title || 'attachment')
                  }
                >
                  📄 {a.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="product-detail__contact"
        onClick={() => openTelegramLink(CONTACT_LINK)}
      >
        Связаться со специалистом
      </button>
    </div>
  )
}
