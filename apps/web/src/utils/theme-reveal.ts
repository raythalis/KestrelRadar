import { nextTick } from 'vue'

/**
 * 换主题时的圆形扩散：用 View Transitions API 把"新主题"当成一层贴上来，
 * 再用 clip-path 从点击位置画一个圆扩到全屏。
 *
 * 浏览器不支持（或者用户开了"减少动态效果"）时老老实实直接换，不做动画。
 */
interface ViewTransitionLike {
  ready: Promise<void>
}

/** 只声明我们用到的那一点；lib.dom 里新版本已经有完整签名，这里不跟它抢 */
interface ViewTransitionHost {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransitionLike
}

export interface RevealOrigin {
  x: number
  y: number
}

/** 扩散时长（毫秒） */
const REVEAL_MS = 420

/** 覆盖到屏幕最远的那个角，圆才算扩满 */
function coverRadius(origin: RevealOrigin): number {
  return Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  )
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function applyThemeWithReveal(origin: RevealOrigin | null, apply: () => void): void {
  const doc = document as unknown as ViewTransitionHost
  if (!origin || typeof doc.startViewTransition !== 'function' || reducedMotion()) {
    apply()
    return
  }

  const radius = coverRadius(origin)
  const transition = doc.startViewTransition(async () => {
    apply()
    // Vue 的 DOM 更新是异步的，不等一次就会拍到旧快照，扩散出去还是老主题
    await nextTick()
  })

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        {
          duration: REVEAL_MS,
          easing: 'ease-out',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {
      // 过渡被跳过（比如标签页不可见）就算了，主题已经换好了
    })
}
