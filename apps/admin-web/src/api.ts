/**
 * API-клиент для админки
 */
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api')

function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

function clearToken() {
  localStorage.removeItem('admin_token')
}

function adminBasePath(): string {
  // В проде админка отдаётся по /admin/
  if (typeof window === 'undefined') return ''
  return window.location.pathname.startsWith('/admin') ? '/admin' : ''
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const base = adminBasePath()
  const target = `${base}/login`
  if (window.location.pathname === target) return
  window.location.replace(target)
}

function handleUnauthorized() {
  clearToken()
  redirectToLogin()
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Unauthorized')
  }
  return res
}

export async function login(login: string, password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Login failed')
  }
  return res.json()
}

export type ProductListItem = {
  id: string
  slug: string
  title: string
  sku: string | null
  manufacturer: string | null
  category_id: string | null
  category_name: string | null
  price_amount: number | null
  price_currency: string | null
  is_published: boolean
  sort_order: number
  view_count: number
  image_url: string | null
  variants: Array<{ id: string; option_name: string; option_value: string; stock_qty: number; in_order_qty: number }>
}

export type ProductListResponse = {
  items: ProductListItem[]
  total: number
  page: number
  per_page: number
}

export type ProductListParams = {
  search?: string
  category_id?: string
  is_published?: boolean
  manufacturer?: string
  page?: number
  per_page?: number
}

export async function listProducts(params?: ProductListParams): Promise<ProductListResponse> {
  const sp = new URLSearchParams()
  if (params?.search) sp.set('search', params.search)
  if (params?.category_id) sp.set('category_id', params.category_id)
  if (params?.is_published !== undefined) sp.set('is_published', String(params.is_published))
  if (params?.manufacturer) sp.set('manufacturer', params.manufacturer)
  if (params?.page) sp.set('page', String(params.page))
  if (params?.per_page) sp.set('per_page', String(params.per_page))
  const qs = sp.toString()
  const url = `${API_BASE}/admin/products${qs ? `?${qs}` : ''}`
  const res = await fetchWithAuth(url, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()
}

export async function listCategories(): Promise<
  Array<{ id: string; name: string; slug: string; sort_order: number; parent_id: string | null }>
> {
  const res = await fetchWithAuth(`${API_BASE}/admin/categories`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load categories')
  return res.json()
}

export async function listManufacturers(): Promise<string[]> {
  const res = await fetchWithAuth(`${API_BASE}/admin/manufacturers`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load manufacturers')
  return res.json()
}

export type StatsResponse = { total_products: number; published_count: number; total_views: number }

export async function getStats(): Promise<StatsResponse> {
  const res = await fetchWithAuth(`${API_BASE}/admin/stats`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load stats')
  return res.json()
}

export async function getProduct(id: string): Promise<Record<string, unknown>> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${id}`, { headers: authHeaders() })
  if (res.status === 404) throw new Error('Product not found')
  if (!res.ok) throw new Error('Failed to load product')
  return res.json()
}

export async function createProduct(data: Record<string, unknown>): Promise<{ id: string; slug: string }> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create product')
  return res.json()
}

export async function updateProduct(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update product')
  return res.json()
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete product')
}

export async function uploadImage(
  productId: string,
  file: File,
  alt?: string,
  sortOrder?: number
): Promise<{ id: string; url: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('alt', alt || '')
  form.append('sort_order', String(sortOrder ?? 0))
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload image')
  return res.json()
}

export async function uploadAttachment(
  productId: string,
  file: File,
  title?: string,
  sortOrder?: number
): Promise<{ id: string; url: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title || file.name)
  form.append('sort_order', String(sortOrder ?? 0))
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload attachment')
  return res.json()
}

export async function addVariant(
  productId: string,
  data: { option_name: string; option_value: string; stock_qty?: number; in_order_qty?: number; sort_order?: number }
): Promise<{ id: string }> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/variants`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      option_name: data.option_name,
      option_value: data.option_value,
      stock_qty: data.stock_qty ?? 0,
      in_order_qty: data.in_order_qty ?? 0,
      sort_order: data.sort_order ?? 0,
    }),
  })
  if (!res.ok) throw new Error('Failed to add variant')
  return res.json()
}

export async function updateVariant(
  productId: string,
  variantId: string,
  data: { option_name?: string; option_value?: string; stock_qty?: number; in_order_qty?: number; sort_order?: number }
): Promise<{ id: string }> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/variants/${variantId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update variant')
  return res.json()
}

export async function deleteVariant(productId: string, variantId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/variants/${variantId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete variant')
}

export async function addSpec(
  productId: string,
  data: { name: string; value: string; unit?: string; sort_order?: number }
): Promise<{ id: string }> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/specs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add spec')
  return res.json()
}

export async function updateSpec(
  productId: string,
  specId: string,
  data: { name?: string; value?: string; unit?: string; sort_order?: number }
): Promise<{ id: string }> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/specs/${specId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update spec')
  return res.json()
}

export async function deleteSpec(productId: string, specId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/specs/${specId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete spec')
}

export async function updateImageSort(
  productId: string,
  imageId: string,
  sortOrder: number
): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/admin/products/${productId}/images/${imageId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ sort_order: sortOrder }),
  })
  if (!res.ok) throw new Error('Failed to update image order')
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/admin/files/${fileId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete file')
}

export function getFileUrl(fileId: string): string {
  const base = API_BASE.replace(/\/api\/?$/, '')
  return `${base}/api/files/${fileId}`
}

// --- Settings ---
export type Settings = {
  contact_telegram_link: string
  storage_max_file_size_mb: number
  storage_allowed_image_types: string
  storage_allowed_attachment_types: string
  log_level: string
  log_max_bytes_mb: number
  miniapp_section_title: string
  miniapp_footer_text: string
  miniapp_background_color: string
  miniapp_background_image: string
  miniapp_text_color: string
  miniapp_heading_color: string
  miniapp_price_color: string
  miniapp_hint_color: string
  miniapp_card_bg_color: string
  api_port: number
  cors_origins: string
  storage_path: string
}

export type SettingsUpdate = {
  contact_telegram_link?: string
  storage_max_file_size_mb?: number
  storage_allowed_image_types?: string
  storage_allowed_attachment_types?: string
  log_level?: string
  log_max_bytes_mb?: number
  miniapp_section_title?: string
  miniapp_footer_text?: string
  miniapp_background_color?: string
  miniapp_background_image?: string
  miniapp_text_color?: string
  miniapp_heading_color?: string
  miniapp_price_color?: string
  miniapp_hint_color?: string
  miniapp_card_bg_color?: string
}

export async function getSettings(): Promise<Settings> {
  const res = await fetchWithAuth(`${API_BASE}/admin/settings`, {
    method: 'GET',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to get settings')
  return res.json()
}

export async function updateSettings(data: SettingsUpdate): Promise<Settings> {
  const res = await fetchWithAuth(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to update settings' }))
    throw new Error(error.detail || 'Failed to update settings')
  }
  return res.json()
}

export async function uploadBackgroundImage(file: File): Promise<{ id: string; url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const res = await fetchWithAuth(`${API_BASE}/admin/settings/background-image`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to upload background image' }))
    throw new Error(error.detail || 'Failed to upload background image')
  }
  return res.json()
}

export async function deleteBackgroundImage(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/admin/settings/background-image`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to delete background image' }))
    throw new Error(error.detail || 'Failed to delete background image')
  }
}
