/**
 * API-клиент для витрины (публичные эндпоинты)
 */
// В dev и prod по умолчанию используем относительный /api,
// чтобы не было mixed content при HTTPS. При необходимости
// можно переопределить через VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || '/api'

export type ProductListItem = {
  id: string
  slug: string
  title: string
  short_description: string | null
  price_amount: number | null
  price_currency: string | null
  image_url: string | null
}

export type ProductDetail = {
  id: string
  slug: string
  title: string
  description: string | null
  short_description: string | null
  price_amount: number | null
  price_currency: string | null
  images: Array<{ id: string; url: string; alt?: string; sort_order: number }>
  attachments: Array<{
    id: string
    title: string
    url: string
    sort_order: number
    mime?: string
    size_bytes?: number
  }>
  specs: Array<{ id: string; name: string; value: string; unit?: string; sort_order: number }>
}

export type ProductListResponse = {
  items: ProductListItem[]
  total: number
  page: number
  per_page: number
}

export async function fetchProducts(
  page = 1,
  perPage = 20,
  sort = 'sort_order'
): Promise<ProductListResponse> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage), sort })
  const res = await fetch(`${API_BASE}/products/?${params}`)
  if (!res.ok) throw new Error('Не удалось загрузить товары')
  return res.json()
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`)
  if (res.status === 404) throw new Error('Товар не найден')
  if (!res.ok) throw new Error('Не удалось загрузить товар')
  return res.json()
}

/** Трекинг просмотра товара (вызывается при загрузке карточки, один раз за сессию на slug). */
export async function trackProductView(slug: string): Promise<void> {
  const key = `viewed_${slug}`
  if (sessionStorage.getItem(key)) return
  try {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
    })
    if (res.ok) sessionStorage.setItem(key, '1')
  } catch {
    // игнорируем ошибки трекинга
  }
}

/** Полный URL файла для скачивания/просмотра */
export function getFileUrl(urlPath: string): string {
  const apiBase = import.meta.env.VITE_API_URL || '/api'
  const base = apiBase.replace(/\/api\/?$/, '')
  return urlPath.startsWith('http') ? urlPath : (base ? base + urlPath : urlPath)
}
