import { useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { gsap } from 'gsap'
import type { SceneId } from '../config/types'
import { useDirector, useDirectorState } from '../engine/DirectorContext'
import { useConfig } from '../config/ConfigContext'
import type { SceneProps } from '../scenes/types'

interface Layer {
  key: string
  scene: SceneId
}

function SceneLayer(props: {
  Scene: ComponentType<SceneProps>
  leaving: boolean
  duration: number
  onLeft: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onLeft = useRef(props.onLeft)
  onLeft.current = props.onLeft

  useLayoutEffect(() => {
    if (!props.leaving) return
    const tween = gsap.to(ref.current, {
      autoAlpha: 0,
      duration: props.duration,
      ease: 'power2.inOut',
      onComplete: () => onLeft.current(),
    })
    return () => {
      tween.kill()
    }
  }, [props.leaving, props.duration])

  const { Scene } = props
  return (
    <div
      ref={ref}
      className={`absolute inset-0 ${props.leaving ? 'pointer-events-none' : ''}`}
      aria-hidden={props.leaving || undefined}
    >
      <Scene leaving={props.leaving} />
    </div>
  )
}

/**
 * Renders the current scene and crossfades out the previous one. Layers keep
 * their React identity when they start leaving, so the outgoing scene is not
 * remounted. The incoming scene fades itself in on its own timeline.
 */
export function Stage({ scenes }: { scenes: Record<SceneId, ComponentType<SceneProps>> }) {
  const { order } = useDirector()
  const { sceneIndex, runId } = useDirectorState()
  const { timings } = useConfig()
  const currentKey = `${runId}:${sceneIndex}`
  const [layers, setLayers] = useState<Layer[]>([{ key: currentKey, scene: order[sceneIndex] }])

  // Adjust state during render when the scene changes (React's pattern for
  // state derived from props) so the next scene mounts in the same commit.
  const active = layers[layers.length - 1]
  if (active.key !== currentKey) {
    // Keep at most one outgoing layer to bound the work during fast skips.
    setLayers([active, { key: currentKey, scene: order[sceneIndex] }])
  }

  return (
    <div className="absolute inset-0">
      {layers.map((layer) => (
        <SceneLayer
          key={layer.key}
          Scene={scenes[layer.scene]}
          leaving={layer.key !== currentKey}
          duration={timings.crossfade}
          onLeft={() => setLayers((list) => list.filter((l) => l.key !== layer.key))}
        />
      ))}
    </div>
  )
}
