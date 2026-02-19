/**
 * Компонент заголовка мини-приложения с названием магазина
 */
import './Header.css'

interface HeaderProps {
  shopName: string
}

export function Header({ shopName }: HeaderProps) {
  return (
    <header className="miniapp-header">
      <h1 className="miniapp-header__title">{shopName}</h1>
    </header>
  )
}
