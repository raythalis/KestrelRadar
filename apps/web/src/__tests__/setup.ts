// jsdom 里没有这几个浏览器 API，Vuetify 的布局会用到；给个无害的替身。
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, writable: true })
}

if (!('matchMedia' in globalThis)) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

if (!('scrollTo' in globalThis)) {
  Object.defineProperty(globalThis, 'scrollTo', { value: () => undefined, writable: true })
}

// jsdom 没有 visualViewport：Vuetify 的浮层（弹窗/菜单）定位会用到它，缺了会直接抛错
if (!('visualViewport' in globalThis)) {
  const stub = {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  Object.defineProperty(globalThis, 'visualViewport', { value: stub, writable: true })
}

// jsdom 环境里 localStorage 不总是存在（这套用例大量用它存 UI 偏好），给一个内存实现。
if (!('localStorage' in globalThis) || !globalThis.localStorage) {
  const store = new Map<string, string>()
  const memoryStorage = {
    get length(): number {
      return store.size
    },
    key: (index: number): string | null => [...store.keys()][index] ?? null,
    getItem: (key: string): string | null => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string): void => void store.set(key, String(value)),
    removeItem: (key: string): void => void store.delete(key),
    clear: (): void => void store.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, writable: true })
  // 标记：kestrel-test-localStorage
}
