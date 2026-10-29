import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { BirthdayConfig } from '../config/types'
import type { AudioEngine } from '../audio/AudioEngine'
import { preloadExperience } from './preload'

interface AssetsState {
  ready: boolean
}

const AssetsContext = createContext<AssetsState>({ ready: false })

/** Starts preloading as soon as the app mounts and exposes when it's safe to begin. */
export function AssetsProvider(props: { config: BirthdayConfig; audio: AudioEngine; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const { config, audio } = props

  useEffect(() => {
    let cancelled = false
    void preloadExperience(config, audio).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [config, audio])

  return <AssetsContext.Provider value={{ ready }}>{props.children}</AssetsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAssets(): AssetsState {
  return useContext(AssetsContext)
}
