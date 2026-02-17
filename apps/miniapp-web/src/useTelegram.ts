/**
 * Интеграция с Telegram WebApp API — открытие ссылок, скачивание файлов
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        openLink?: (url: string) => void
        openTelegramLink?: (url: string) => void
        ready?: () => void
      }
    }
  }
}

/** Открыть ссылку (t.me/..., внешнюю) внутри Telegram */
export function openTelegramLink(url: string): void {
  const tg = window.Telegram?.WebApp
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url)
  } else if (tg?.openLink) {
    tg.openLink(url)
  } else {
    window.open(url, '_blank')
  }
}

/** Скачать файл — в WebApp используем native downloadFile если доступно */
export function downloadFile(url: string, filename: string): void {
  const tg = window.Telegram?.WebApp
  // @ts-expect-error downloadFile может быть в SDK
  if (typeof tg?.downloadFile === 'function') {
    // @ts-expect-error
    tg.downloadFile(url, filename)
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}
