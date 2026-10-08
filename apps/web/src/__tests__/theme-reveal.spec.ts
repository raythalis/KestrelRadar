import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyThemeWithReveal } from '@/utils/theme-reveal'

type StartViewTransition = (callback: () => void | Promise<void>) => { ready: Promise<void> }

type WithViewTransition = { startViewTransition?: unknown }

function doc(): WithViewTransition {
  return document as unknown as WithViewTransition
}

function clearApi() {
  delete doc().startViewTransition
}

describe('主题圆形扩散', () => {
  beforeEach(clearApi)

  it('浏览器不支持 View Transitions 时直接换主题，不做动画', () => {
    let applied = false
    applyThemeWithReveal({ x: 10, y: 10 }, () => (applied = true))
    expect(applied).toBe(true)
  })

  it('拿不到点击位置（比如键盘触发）时也直接换', () => {
    let applied = false
    applyThemeWithReveal(null, () => (applied = true))
    expect(applied).toBe(true)
  })

  it('用户开了"减少动态效果"时不扩散', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    const startViewTransition = vi.fn<StartViewTransition>()
    doc().startViewTransition = startViewTransition

    let applied = false
    applyThemeWithReveal({ x: 1, y: 1 }, () => (applied = true))

    expect(applied).toBe(true)
    expect(startViewTransition).not.toHaveBeenCalled()
    window.matchMedia = original
  })

  it('支持时从点击位置向外扩散，动画挂在新主题那一层上', async () => {
    const animate = vi.fn<Element['animate']>()
    document.documentElement.animate = animate
    const startViewTransition = vi.fn<StartViewTransition>((callback) => {
      void callback()
      return { ready: Promise.resolve() }
    })
    doc().startViewTransition = startViewTransition

    let applied = false
    applyThemeWithReveal({ x: 100, y: 50 }, () => (applied = true))

    expect(applied).toBe(true)
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    await Promise.resolve()

    expect(animate).toHaveBeenCalledTimes(1)
    const [frames, options] = animate.mock.calls[0] as [
      { clipPath: string[] },
      { pseudoElement: string; duration: number },
    ]
    expect(frames.clipPath[0]).toBe('circle(0px at 100px 50px)')
    expect(frames.clipPath[1]).toMatch(/^circle\([\d.]+px at 100px 50px\)$/)
    expect(options.pseudoElement).toBe('::view-transition-new(root)')
  })
})
