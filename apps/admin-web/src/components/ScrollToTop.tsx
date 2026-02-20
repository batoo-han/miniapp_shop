/**
 * Компонент кнопки "Наверх".
 * Показывается при прокрутке страницы вниз на 300px.
 * Плавно скроллит страницу к началу при клике.
 */
import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import './ScrollToTop.css'

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      // Показываем кнопку при прокрутке больше 300px
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  if (!isVisible) return null

  return (
    <button
      type="button"
      className="scroll-to-top"
      onClick={scrollToTop}
      aria-label="Вернуться наверх"
      title="Наверх"
    >
      <ChevronUp />
    </button>
  )
}
