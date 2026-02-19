/**
 * Компонент подвала мини-приложения
 */
import './Footer.css'

interface FooterProps {
  footerText: string
}

export function Footer({ footerText }: FooterProps) {
  return (
    <footer className="miniapp-footer">
      <p className="miniapp-footer__text">{footerText}</p>
    </footer>
  )
}
