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
import { useToast } from '../components/Toast'
import { FileUpload } from '../components/FileUpload'
import { Modal } from '../components/Modal'

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
  hashtags: string
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
  hashtags: '',
  images: [],
  attachments: [],
  specs: [],
  variants: [],
}

/**
 * Генерация slug из названия (транслитерация кириллицы в латиницу)
 */
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

/**
 * Нормализация хэштегов: добавляет # в начало, убирает пробелы внутри тегов
 */
function normalizeHashtags(input: string): string {
  if (!input.trim()) return ''
  
  // Разбиваем по пробелам и обрабатываем каждый тег
  const tags = input.split(/\s+/).filter(Boolean)
  
  return tags.map(tag => {
    // Убираем лишние # в начале
    let cleaned = tag.replace(/^#+/, '')
    // Убираем недопустимые символы (оставляем буквы, цифры, подчёркивания)
    cleaned = cleaned.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_]/g, '')
    // Добавляем # в начало, если тег не пустой
    return cleaned ? `#${cleaned}` : ''
  }).filter(Boolean).join(' ')
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
  const { showToast, ToastContainer } = useToast()
  const [showSpecModal, setShowSpecModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [newSpec, setNewSpec] = useState({ name: '', value: '', unit: '' })
  const [newVariant, setNewVariant] = useState({ option_name: '', option_value: '', stock_qty: 0, in_order_qty: 0 })

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
        sort_order: Number(p.sort_order ?? 0),
        hashtags: (p.hashtags as string) ?? '',
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
        hashtags: data.hashtags || null,
      }
      if (isNew) {
        const res = await createProduct(payload)
        showToast('Товар успешно создан', 'success')
        // Обновляем id в URL и перезагружаем данные
        navigate(`/product/${res.id}/edit`, { replace: true })
        // Обновляем состояние для загрузки товара с новым id
        const loadedProduct = (await getProduct(res.id)) as Record<string, unknown>
        setData({
          slug: (loadedProduct.slug as string) ?? '',
          title: (loadedProduct.title as string) ?? '',
          sku: (loadedProduct.sku as string) ?? '',
          manufacturer: (loadedProduct.manufacturer as string) ?? '',
          category_id: (loadedProduct.category_id as string) ?? '',
          short_description: (loadedProduct.short_description as string) ?? '',
          description: (loadedProduct.description as string) ?? '',
          price_amount: loadedProduct.price_amount != null ? Number(loadedProduct.price_amount) : null,
          price_currency: (loadedProduct.price_currency as string) ?? 'RUB',
          is_published: Boolean(loadedProduct.is_published),
          sort_order: Number(loadedProduct.sort_order ?? 0),
          hashtags: (loadedProduct.hashtags as string) ?? '',
          images: ((loadedProduct.images as ImageItem[]) ?? []).map((i) => ({
            ...i,
            sort_order: i.sort_order ?? 0,
          })),
          attachments: ((loadedProduct.attachments as AttachmentItem[]) ?? []).map((a) => ({
            ...a,
            sort_order: a.sort_order ?? 0,
          })),
          specs: ((loadedProduct.specs as SpecItem[]) ?? []).map((s) => ({
            ...s,
            sort_order: s.sort_order ?? 0,
          })),
          variants: ((loadedProduct.variants as VariantItem[]) ?? []).map((v) => ({
            ...v,
            stock_qty: v.stock_qty ?? 0,
            in_order_qty: v.in_order_qty ?? 0,
            sort_order: v.sort_order ?? 0,
          })),
        })
      } else {
        await updateProduct(id!, payload)
        showToast('Товар успешно сохранён', 'success')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сохранения'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleImagesSelected(files: File[]) {
    if (!id || isNew) return
    for (const file of files) {
      try {
        const res = await uploadImage(id, file, undefined, data.images.length)
        setData((d) => ({
          ...d,
          images: [
            ...d.images,
            { id: res.id, url: res.url, sort_order: d.images.length },
          ],
        }))
        showToast(`Фотография "${file.name}" успешно загружена`, 'success')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки'
        showToast(`Ошибка загрузки "${file.name}": ${errorMessage}`, 'error')
      }
    }
  }

  async function handleAttachmentsSelected(files: File[]) {
    if (!id || isNew) return
    for (const file of files) {
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
        showToast(`Файл "${file.name}" успешно загружен`, 'success')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки'
        showToast(`Ошибка загрузки "${file.name}": ${errorMessage}`, 'error')
      }
    }
  }

  async function handleDeleteImage(imgId: string) {
    if (!id || isNew) return
    if (!confirm('Удалить фотографию?')) return
    try {
      await deleteFile(imgId)
      setData((d) => ({ ...d, images: d.images.filter((i) => i.id !== imgId) }))
      showToast('Фотография удалена', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления'
      setError(errorMessage)
      showToast(errorMessage, 'error')
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
    if (!confirm('Удалить файл?')) return
    try {
      await deleteFile(attId)
      setData((d) => ({
        ...d,
        attachments: d.attachments.filter((a) => a.id !== attId),
      }))
      showToast('Файл удалён', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }

  async function handleAddSpec() {
    if (!id || isNew) return
    if (!newSpec.name.trim() || !newSpec.value.trim()) {
      showToast('Заполните название и значение', 'error')
      return
    }
    try {
      const res = await addSpec(id, {
        name: newSpec.name.trim(),
        value: newSpec.value.trim(),
        unit: newSpec.unit.trim() || undefined,
        sort_order: data.specs.length,
      })
      setData((d) => ({
        ...d,
        specs: [
          ...d.specs,
          {
            id: res.id,
            name: newSpec.name.trim(),
            value: newSpec.value.trim(),
            unit: newSpec.unit.trim() || '',
            sort_order: d.specs.length,
          },
        ],
      }))
      setNewSpec({ name: '', value: '', unit: '' })
      setShowSpecModal(false)
      showToast('Характеристика добавлена', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка добавления ТТХ'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }

  async function handleDeleteSpec(specId: string) {
    if (!id || isNew) return
    if (!confirm('Удалить характеристику?')) return
    try {
      await deleteSpec(id, specId)
      setData((d) => ({ ...d, specs: d.specs.filter((s) => s.id !== specId) }))
      showToast('Характеристика удалена', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления ТТХ'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }

  async function handleAddVariant() {
    if (!id || isNew) return
    if (!newVariant.option_name.trim() || !newVariant.option_value.trim()) {
      showToast('Заполните название опции и значение', 'error')
      return
    }
    try {
      const res = await addVariant(id, {
        option_name: newVariant.option_name.trim(),
        option_value: newVariant.option_value.trim(),
        stock_qty: newVariant.stock_qty || 0,
        in_order_qty: newVariant.in_order_qty || 0,
        sort_order: data.variants.length,
      })
      setData((d) => ({
        ...d,
        variants: [
          ...d.variants,
          {
            id: res.id,
            option_name: newVariant.option_name.trim(),
            option_value: newVariant.option_value.trim(),
            stock_qty: newVariant.stock_qty || 0,
            in_order_qty: newVariant.in_order_qty || 0,
            sort_order: d.variants.length,
          },
        ],
      }))
      setNewVariant({ option_name: '', option_value: '', stock_qty: 0, in_order_qty: 0 })
      setShowVariantModal(false)
      showToast('Вариант добавлен', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка добавления варианта'
      setError(errorMessage)
      showToast(errorMessage, 'error')
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
    if (!confirm('Удалить вариант?')) return
    try {
      await deleteVariant(id, variantId)
      setData((d) => ({
        ...d,
        variants: d.variants.filter((v) => v.id !== variantId),
      }))
      showToast('Вариант удалён', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления варианта'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }

  if (loading) return <p className="loading">Загрузка...</p>

  const canUploadFiles = !isNew && id

  return (
    <div className="product-edit">
      <ToastContainer />
      <h1>{isNew ? 'Новый товар' : 'Редактирование'}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="edit-form">
        <section className="form-section">
          <h2>Основное</h2>
          
          {/* Ряд 1: Опубликован | Порядок сортировки */}
          <div className="form-row form-row--top">
            <label className="checkbox-label checkbox-label--inline">
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
              Порядок сортировки
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
          </div>
          
          {/* Ряд 2: Категория */}
          <label>
            Категория
            <select
              value={data.category_id}
              onChange={(e) =>
                setData((d) => ({ ...d, category_id: e.target.value }))
              }
            >
              <option value="">— Корневая —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          
          {/* Ряд 3: Название | Артикул */}
          <div className="form-row">
            <label>
              Название
              <input
                value={data.title}
                onChange={(e) => {
                  const newTitle = e.target.value
                  setData((d) => {
                    const newData = { ...d, title: newTitle }
                    // Автозаполнение slug для новых товаров или если slug пуст
                    if (isNew || !d.slug) {
                      newData.slug = generateSlug(newTitle)
                    }
                    return newData
                  })
                }}
                required
              />
            </label>
            <label>
              Артикул
              <input
                value={data.sku}
                onChange={(e) => setData((d) => ({ ...d, sku: e.target.value }))}
              />
            </label>
          </div>
          
          {/* Ряд 4: Slug */}
          <label>
            Slug
            <input
              value={data.slug}
              onChange={(e) => setData((d) => ({ ...d, slug: e.target.value }))}
              required
            />
            <span className="form-hint">URL-идентификатор товара (латиница, цифры, дефисы)</span>
          </label>
          
          {/* Ряд 5: Производитель */}
          <label>
            Производитель
            <input
              value={data.manufacturer}
              onChange={(e) =>
                setData((d) => ({ ...d, manufacturer: e.target.value }))
              }
            />
          </label>
          
          {/* Ряд 6: Хэштеги */}
          <label>
            Хэштеги
            <input
              value={data.hashtags}
              onChange={(e) => setData((d) => ({ ...d, hashtags: e.target.value }))}
              onBlur={(e) => setData((d) => ({ ...d, hashtags: normalizeHashtags(e.target.value) }))}
              placeholder="#тег1 #тег2 #тег3"
            />
            <span className="form-hint">Введите теги через пробел, # добавится автоматически</span>
          </label>
          
          {/* Ряд 7: Цена | Валюта */}
          <div className="form-row">
            <label>
              Цена
              <input
                type="number"
                step="0.01"
                min="0"
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
              <select
                value={data.price_currency}
                onChange={(e) =>
                  setData((d) => ({ ...d, price_currency: e.target.value }))
                }
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
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
          <h2>Фото</h2>
          {!canUploadFiles ? (
            <div className="form-info-message">
              Сначала сохраните товар, чтобы загрузить фотографии
            </div>
          ) : (
            <>
              <FileUpload
                accept="image/*"
                multiple
                onFilesSelected={handleImagesSelected}
                label="Выберите фотографии"
                description="или перетащите их сюда"
              />
              {data.images.length > 0 && (
                <div className="images-grid">
                  {[...data.images]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((img, idx) => (
                      <div key={img.id} className="image-card">
                        <img src={getFileUrl(img.id)} alt={img.alt} />
                        <div className="image-actions">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveImage(idx, -1)
                            }}
                            disabled={idx === 0}
                            title="Переместить вверх"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveImage(idx, 1)
                            }}
                            disabled={idx === data.images.length - 1}
                            title="Переместить вниз"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteImage(img.id)
                            }}
                            title="Удалить"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="form-section">
          <h2>Прикреплённые файлы</h2>
          {!canUploadFiles ? (
            <div className="form-info-message">
              Сначала сохраните товар, чтобы загрузить файлы
            </div>
          ) : (
            <>
              <FileUpload
                accept=".pdf,.zip,.rar"
                multiple
                onFilesSelected={handleAttachmentsSelected}
                label="Выберите файлы"
                description="или перетащите их сюда (PDF, ZIP, RAR)"
              />
              {data.attachments.length > 0 && (
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
              )}
            </>
          )}
        </section>

        <section className="form-section">
          <h2>ТТХ</h2>
          {!canUploadFiles ? (
            <div className="form-info-message">
              Сначала сохраните товар, чтобы добавить характеристики
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowSpecModal(true)}
                className="btn btn-secondary"
              >
                Добавить ТТХ
              </button>
              {data.specs.length > 0 && (
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
                            className="btn-link btn-danger"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>

        <section className="form-section">
          <h2>Варианты</h2>
          {!canUploadFiles ? (
            <div className="form-info-message">
              Сначала сохраните товар, чтобы добавить варианты
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowVariantModal(true)}
                className="btn btn-secondary"
              >
                Добавить вариант
              </button>
              {data.variants.length > 0 && (
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
                            className="btn-link btn-danger"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>

        <Modal
          isOpen={showSpecModal}
          onClose={() => {
            setShowSpecModal(false)
            setNewSpec({ name: '', value: '', unit: '' })
          }}
          title="Добавить характеристику"
        >
          <div className="form-group">
            <label>
              Название <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={newSpec.name}
              onChange={(e) => setNewSpec((s) => ({ ...s, name: e.target.value }))}
              placeholder="Например: Вес"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>
              Значение <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={newSpec.value}
              onChange={(e) => setNewSpec((s) => ({ ...s, value: e.target.value }))}
              placeholder="Например: 2.5"
            />
          </div>
          <div className="form-group">
            <label>Единица измерения</label>
            <input
              type="text"
              value={newSpec.unit}
              onChange={(e) => setNewSpec((s) => ({ ...s, unit: e.target.value }))}
              placeholder="Например: кг"
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowSpecModal(false)
                setNewSpec({ name: '', value: '', unit: '' })
              }}
            >
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAddSpec}>
              Добавить
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false)
            setNewVariant({ option_name: '', option_value: '', stock_qty: 0, in_order_qty: 0 })
          }}
          title="Добавить вариант"
        >
          <div className="form-group">
            <label>
              Название опции <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={newVariant.option_name}
              onChange={(e) => setNewVariant((v) => ({ ...v, option_name: e.target.value }))}
              placeholder="Например: Цвет"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>
              Значение <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={newVariant.option_value}
              onChange={(e) => setNewVariant((v) => ({ ...v, option_value: e.target.value }))}
              placeholder="Например: Multicam"
            />
          </div>
          <div className="form-group">
            <label>В наличии</label>
            <input
              type="number"
              min={0}
              value={newVariant.stock_qty}
              onChange={(e) =>
                setNewVariant((v) => ({ ...v, stock_qty: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
          <div className="form-group">
            <label>В заказе</label>
            <input
              type="number"
              min={0}
              value={newVariant.in_order_qty}
              onChange={(e) =>
                setNewVariant((v) => ({ ...v, in_order_qty: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowVariantModal(false)
                setNewVariant({ option_name: '', option_value: '', stock_qty: 0, in_order_qty: 0 })
              }}
            >
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAddVariant}>
              Добавить
            </button>
          </div>
        </Modal>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
