import { useLayoutEffect, type DependencyList, type RefObject } from 'react'
import { gsap } from 'gsap'

/**
 * Runs GSAP setup scoped to `scope`. Everything created inside (tweens,
 * timelines, delayedCalls) is reverted on unmount or when deps change.
 * Return a function from `setup` for any extra cleanup.
 */
export function useGsap(
  scope: RefObject<HTMLElement>,
  setup: (ctx: gsap.Context) => void | (() => void),
  deps: DependencyList,
): void {
  useLayoutEffect(() => {
    const ctx = gsap.context(setup, scope)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
