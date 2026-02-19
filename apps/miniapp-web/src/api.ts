/**
 * API-клиент для витрины (публичные эндпоинты)
 */
// В dev/prod используем /api. В WebView явно берём origin — некоторые WebView
// (например Telegram Desktop) некорректно резолвят относительные URL.
function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && fromEnv.startsWith('http')) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin + '/api'
  return fromEnv || '/api'
}
const API_BASE = getApiBase()

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
  const apiBase = getApiBase()
  const base = apiBase.replace(/\/api\/?$/, '')
  return urlPath.startsWith('http') ? urlPath : (base ? base + urlPath : urlPath)
}

export type MiniappSettings = {
  section_title: string
  footer_text: string
  background_color: string
  background_image: string
  text_color: string
  heading_color: string
  price_color: string
  hint_color: string
  card_bg_color: string
  contact_telegram_link: string
}

export async function fetchMiniappSettings(): Promise<MiniappSettings> {
  const res = await fetch(`${API_BASE}/miniapp/settings`)
  if (!res.ok) {
    // Fallback к значениям по умолчанию при ошибке
    return {
      section_title: 'Витрина',
      footer_text: '@TestoSmaipl_bot',
      background_color: '#000000',
      background_image: '',
      text_color: '#ffffff',
      heading_color: '#ffffff',
      price_color: '#00d4ff',
      hint_color: '#cccccc',
      card_bg_color: 'rgba(255, 255, 255, 0.1)',
      contact_telegram_link: 'https://t.me/support',
    }
  }
  return await res.json()
}
