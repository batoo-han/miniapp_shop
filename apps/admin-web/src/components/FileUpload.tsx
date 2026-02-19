/**
 * Компонент для загрузки файлов с поддержкой drag & drop
 */
import { useRef, useState } from 'react'
import './FileUpload.css'

export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  label?: string
  description?: string
}

export function FileUpload({
  accept,
  multiple = false,
  onFilesSelected,
  disabled = false,
  label = 'Выберите файлы',
  description = 'или перетащите их сюда',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
    // Сброс input для возможности повторной загрузки того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div
      className={`file-upload-zone ${isDragging ? 'file-upload-zone--dragging' : ''} ${disabled ? 'file-upload-zone--disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="file-upload-input"
        aria-label={label}
      />
      <div className="file-upload-content">
        <div className="file-upload-icon">📎</div>
        <div className="file-upload-text">
          <strong>{label}</strong>
          {!disabled && <span className="file-upload-description">{description}</span>}
        </div>
      </div>
    </div>
  )
}
