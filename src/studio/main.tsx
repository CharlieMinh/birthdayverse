import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StudioApp } from './StudioApp'
import { applyTheme } from '../theme/applyTheme'
import { THEME_PRESETS } from '../theme/presets'
import '../index.css'
import './studio.css'

applyTheme(THEME_PRESETS.starry)
document.documentElement.classList.add('studio-page')
// The experience locks scrolling; the Studio is a normal scrolling page.
document.body.style.overflow = 'auto'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
)
