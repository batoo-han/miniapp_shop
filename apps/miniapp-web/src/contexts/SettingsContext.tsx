/**
 * Контекст для настроек мини-приложения
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { fetchMiniappSettings, type MiniappSettings } from '../api'

const SettingsContext = createContext<MiniappSettings | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<MiniappSettings | null>(null)

  useEffect(() => {
    fetchMiniappSettings().then(setSettings)
  }, [])

  if (!settings) {
    return <div style={{ padding: '16px' }}>Загрузка...</div>
  }

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useSettings(): MiniappSettings {
  const settings = useContext(SettingsContext)
  if (!settings) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return settings
}
