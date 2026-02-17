/**
 * Редактирование/создание товара: артикул, категория, производитель, варианты, ТТХ, фото с сортировкой.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addSpec,
  addVariant,
  createProduct,
  deleteFile,
  deleteSpec,
  deleteVariant,
  getProduct,
  listCategories,
  updateImageSort,
  updateProduct,
  updateVariant,
  uploadAttachment,
  uploadImage,
  getFileUrl,
} from '../api'

type ImageItem = { id: string; url: string; alt?: string; sort_order: number }
type AttachmentItem = { id: string; title: string; url: string; sort_order: number }
type SpecItem = { id: string; name: string; value: string; unit?: string; sort_order: number }
type VariantItem = {
  id: string
  option_name: string
  option_value: string
  stock_qty: number
  in_order_qty: number
  sort_order: number
}

type ProductData = {
  slug: string
  title: string
  sku: string
  manufacturer: string
  category_id: string
  short_description: string
  description: string
  price_amount: number | null
  price_currency: string
  is_published: boolean
  sort_order: number
  images: ImageItem[]
  attachments: AttachmentItem[]
  specs: SpecItem[]
  variants: VariantItem[]
}

const emptyProduct: ProductData = {
  slug: '',
  title: '',
  sku: '',
  manufacturer: '',
  category_id: '',
  short_description: '',
  description: '',
  price_amount: null,
  price_currency: 'RUB',
  is_published: false,
  sort_order: 0,
  images: [],
  attachments: [],
  specs: [],
  variants: [],
}

export function ProductEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [data, setData] = useState<ProductData>(emptyProduct)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProduct = useCallback(async () => {
    if (isNew || !id) return
    try {
      const p = (await getProduct(id)) as Record<string, unknown>
      setData({
        slug: (p.slug as string) ?? '',
        title: (p.title as string) ?? '',
        sku: (p.sku as string) ?? '',
        manufacturer: (p.manufacturer as string) ?? '',
        category_id: (p.category_id as string) ?? '',
        short_description: (p.short_description as string) ?? '',
        description: (p.description as string) ?? '',
        price_amount: p.price_amount != null ? Number(p.price_amount) : null,
        price_currency: (p.price_currency as string) ?? 'RUB',
        is_published: Boolean(p.is_published),
        sort_order: Number(p.sort_order) ?? 0,
        images: ((p.images as ImageItem[]) ?? []).map((i) => ({
          ...i,
          sort_order: i.sort_order ?? 0,
        })),
        attachments: ((p.attachments as AttachmentItem[]) ?? []).map((a) => ({
          ...a,
          sort_order: a.sort_order ?? 0,
        })),
        specs: ((p.specs as SpecItem[]) ?? []).map((s) => ({
          ...s,
          sort_order: s.sort_order ?? 0,
        })),
        variants: ((p.variants as VariantItem[]) ?? []).map((v) => ({
          ...v,
          stock_qty: v.stock_qty ?? 0,
          in_order_qty: v.in_order_qty ?? 0,
          sort_order: v.sort_order ?? 0,
        })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  useEffect(() => {
    listCategories()
      .then((cats) => setCategories(cats.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        slug: data.slug,
        title: data.title,
        sku: data.sku || null,
        manufacturer: data.manufacturer || null,
        category_id: data.category_id || null,
        short_description: data.short_description || null,
        description: data.description || null,
        price_amount: data.price_amount,
        price_currency: data.price_currency,
        is_published: data.is_published,
        sort_order: data.sort_order,
      }
      if (isNew) {
        const res = await createProduct(payload)
        navigate(`/product/${res.id}/edit`)
      } else {
        await updateProduct(id!, payload)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || isNew) return
    try {
      const res = await uploadImage(id, file, undefined, data.images.length)
      setData((d) => ({
        ...d,
        images: [
          ...d.images,
          { id: res.id, url: res.url, sort_order: d.images.length },
        ],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    }
    e.target.value = ''
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || isNew) return
    try {
      const res = await uploadAttachment(id, file, file.name, data.attachments.length)
      setData((d) => ({
        ...d,
        attachments: [
          ...d.attachments,
          {
            id: res.id,
            title: file.name,
            url: res.url,
            sort_order: d.attachments.length,
          },
        ],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    }
    e.target.value = ''
  }

  async function handleDeleteImage(imgId: string) {
    if (!id || isNew) return
    try {
      await deleteFile(imgId)
      setData((d) => ({ ...d, images: d.images.filter((i) => i.id !== imgId) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  async function handleMoveImage(idx: number, dir: 1 | -1) {
    if (!id || isNew || idx + dir < 0 || idx + dir >= data.images.length) return
    const imgs = [...data.images].sort((a, b) => a.sort_order - b.sort_order)
    const tmp = imgs[idx]
    imgs[idx] = imgs[idx + dir]
    imgs[idx + dir] = tmp
    try {
      await updateImageSort(id, imgs[idx].id, idx)
      await updateImageSort(id, imgs[idx + dir].id, idx + dir)
      setData((d) => ({
        ...d,
        images: imgs.map((img, i) => ({ ...img, sort_order: i })),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сортировки')
    }
  }

  async function handleDeleteAttachment(attId: string) {
    if (!id || isNew) return
    try {
      await deleteFile(attId)
      setData((d) => ({
        ...d,
        attachments: d.attachments.filter((a) => a.id !== attId),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  async function handleAddSpec() {
    if (!id || isNew) return
    const name = prompt('Название ТТХ')
    const value = prompt('Значение')
    if (!name || !value) return
    try {
      const res = await addSpec(id, {
        name,
        value,
        sort_order: data.specs.length,
      })
      setData((d) => ({
        ...d,
        specs: [
          ...d.specs,
          { id: res.id, name, value, unit: '', sort_order: d.specs.length },
        ],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления ТТХ')
    }
  }

  async function handleDeleteSpec(specId: string) {
    if (!id || isNew) return
    try {
      await deleteSpec(id, specId)
      setData((d) => ({ ...d, specs: d.specs.filter((s) => s.id !== specId) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления ТТХ')
    }
  }

  async function handleAddVariant() {
    if (!id || isNew) return
    const option_name = prompt('Название опции (например, Цвет)')
    const option_value = prompt('Значение (например, Multicam)')
    if (!option_name || !option_value) return
    try {
      const res = await addVariant(id, {
        option_name,
        option_value,
        stock_qty: 0,
        in_order_qty: 0,
        sort_order: data.variants.length,
      })
      setData((d) => ({
        ...d,
        variants: [
          ...d.variants,
          {
            id: res.id,
            option_name,
            option_value,
            stock_qty: 0,
            in_order_qty: 0,
            sort_order: d.variants.length,
          },
        ],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления варианта')
    }
  }

  async function handleUpdateVariant(
    variantId: string,
    field: 'stock_qty' | 'in_order_qty',
    value: number
  ) {
    if (!id || isNew) return
    try {
      await updateVariant(id, variantId, { [field]: value })
      setData((d) => ({
        ...d,
        variants: d.variants.map((v) =>
          v.id === variantId ? { ...v, [field]: value } : v
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления варианта')
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!id || isNew) return
    try {
      await deleteVariant(id, variantId)
      setData((d) => ({
        ...d,
        variants: d.variants.filter((v) => v.id !== variantId),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления варианта')
    }
  }

  if (loading) return <p className="loading">Загрузка...</p>

  return (
    <div className="product-edit">
      <h1>{isNew ? 'Новый товар' : 'Редактирование'}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="edit-form">
        <section className="form-section">
          <h2>Основное</h2>
          <div className="form-row">
            <label>
              Slug
              <input
                value={data.slug}
                onChange={(e) => setData((d) => ({ ...d, slug: e.target.value }))}
                required
              />
            </label>
            <label>
              Название
              <input
                value={data.title}
                onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Артикул
              <input
                value={data.sku}
                onChange={(e) => setData((d) => ({ ...d, sku: e.target.value }))}
              />
            </label>
            <label>
              Производитель
              <input
                value={data.manufacturer}
                onChange={(e) =>
                  setData((d) => ({ ...d, manufacturer: e.target.value }))
                }
              />
            </label>
            <label>
              Категория
              <select
                value={data.category_id}
                onChange={(e) =>
                  setData((d) => ({ ...d, category_id: e.target.value }))
                }
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>Описание</h2>
          <label>
            Краткое
            <textarea
              value={data.short_description}
              onChange={(e) =>
                setData((d) => ({ ...d, short_description: e.target.value }))
              }
              rows={2}
            />
          </label>
          <label>
            Полное
            <textarea
              value={data.description}
              onChange={(e) =>
                setData((d) => ({ ...d, description: e.target.value }))
              }
              rows={6}
            />
          </label>
        </section>

        <section className="form-section">
          <h2>Цена</h2>
          <div className="form-row">
            <label>
              Сумма
              <input
                type="number"
                step="0.01"
                value={data.price_amount ?? ''}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    price_amount: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
              />
            </label>
            <label>
              Валюта
              <input
                value={data.price_currency}
                onChange={(e) =>
                  setData((d) => ({ ...d, price_currency: e.target.value }))
                }
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.is_published}
              onChange={(e) =>
                setData((d) => ({ ...d, is_published: e.target.checked }))
              }
            />
            Опубликован
          </label>
          <label>
            Порядок
            <input
              type="number"
              value={data.sort_order}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  sort_order: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </label>
        </section>

        {!isNew && (
          <>
            <section className="form-section">
              <h2>Фото</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <div className="images-grid">
                {[...data.images]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((img, idx) => (
                    <div key={img.id} className="image-card">
                      <img
                        src={getFileUrl(img.id)}
                        alt={img.alt}
                      />
                      <div className="image-actions">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 1)}
                          disabled={idx === data.images.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="form-section">
              <h2>Прикреплённые файлы</h2>
              <input
                type="file"
                accept=".pdf,.zip,.rar"
                onChange={handleAttachmentUpload}
              />
              <ul className="attachments-list">
                {data.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={getFileUrl(a.id)} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(a.id)}
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="form-section">
              <h2>ТТХ</h2>
              <button type="button" onClick={handleAddSpec}>
                Добавить ТТХ
              </button>
              <table className="specs-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Значение</th>
                    <th>Ед.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.specs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.value}</td>
                      <td>{s.unit || '—'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpec(s.id)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="form-section">
              <h2>Варианты</h2>
              <button type="button" onClick={handleAddVariant}>
                Добавить вариант
              </button>
              <table className="variants-edit-table">
                <thead>
                  <tr>
                    <th>Опция</th>
                    <th>Значение</th>
                    <th>В наличии</th>
                    <th>В заказе</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.variants.map((v) => (
                    <tr key={v.id}>
                      <td>{v.option_name}</td>
                      <td>{v.option_value}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={v.stock_qty}
                          onChange={(e) =>
                            handleUpdateVariant(
                              v.id,
                              'stock_qty',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={v.in_order_qty}
                          onChange={(e) =>
                            handleUpdateVariant(
                              v.id,
                              'in_order_qty',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
