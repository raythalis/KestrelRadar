/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string
  readonly VITE_API_BASE?: string
  readonly VITE_API_PROXY_TARGET?: string
}
