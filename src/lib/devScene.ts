import type { SceneId } from '../config/types'
import { SCENE_ORDER } from '../engine/director'

/** In development, `?scene=cake` skips straight to a scene after the envelope tap. */
export function devStartScene(): SceneId | null {
  if (!import.meta.env.DEV) return null
  const scene = new URLSearchParams(window.location.search).get('scene') as SceneId | null
  return scene && SCENE_ORDER.includes(scene) && scene !== 'invitation' ? scene : null
}
