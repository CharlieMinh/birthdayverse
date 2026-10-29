import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import type { Director, DirectorState } from './director'

const DirectorContext = createContext<Director | null>(null)

export function DirectorProvider({ director, children }: { director: Director; children: ReactNode }) {
  return <DirectorContext.Provider value={director}>{children}</DirectorContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirector(): Director {
  const director = useContext(DirectorContext)
  if (!director) throw new Error('useDirector must be used inside <DirectorProvider>')
  return director
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirectorState(): DirectorState {
  const director = useDirector()
  return useSyncExternalStore(director.subscribe, director.getState, director.getState)
}
