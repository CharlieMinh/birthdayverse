import { createContext, useContext, type ReactNode } from 'react'
import type { BirthdayConfig } from './types'
import { uiStrings, type UiStrings } from '../i18n'

const ConfigContext = createContext<BirthdayConfig | null>(null)

export function ConfigProvider({ config, children }: { config: BirthdayConfig; children: ReactNode }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig(): BirthdayConfig {
  const config = useContext(ConfigContext)
  if (!config) throw new Error('useConfig must be used inside <ConfigProvider>')
  return config
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUi(): UiStrings {
  return uiStrings(useConfig().meta.lang)
}
