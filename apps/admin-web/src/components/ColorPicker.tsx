/**
 * Компонент выбора цвета с визуальным превью
 */
import { useRef } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  label: string
  description?: string
}

export function ColorPicker({ value, onChange, label, description }: ColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Обработка клика на превью цвета
  function handlePreviewClick() {
    colorInputRef.current?.click()
  }

  // Валидация и нормализация HEX цвета
  function normalizeHexColor(input: string): string {
    let hex = input.trim().toUpperCase()
    
    // Добавляем # если отсутствует
    if (!hex.startsWith('#')) {
      hex = '#' + hex
    }
    
    // Проверяем валидность
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      return hex
    }
    
    // Если 3 символа, расширяем до 6
    if (/^#[0-9A-F]{3}$/i.test(hex)) {
      const r = hex[1]
      const g = hex[2]
      const b = hex[3]
      return `#${r}${r}${g}${g}${b}${b}`
    }
    
    return value // Возвращаем текущее значение, если ввод невалиден
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="color-picker-wrapper">
        {/* Превью цвета (кликабельное) */}
        <div
          className="color-picker-preview"
          style={{ backgroundColor: value }}
          onClick={handlePreviewClick}
          title="Нажмите для выбора цвета"
        />
        <div className="color-picker-input">
          {/* Скрытый нативный color picker */}
          <input
            ref={colorInputRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {/* Текстовое поле для ручного ввода */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onChange(normalizeHexColor(e.target.value))}
            placeholder="#000000"
            maxLength={7}
          />
        </div>
      </div>
      {description && <small>{description}</small>}
    </div>
  )
}
