// 把第三方库需要的 Vuetify 组件补到全局。
//
// Vuetify 的组件平时由 vite-plugin-vuetify 按需编译进各个 SFC，不会挂到全局；
// 而 @vue-js-cron/vuetify 是在运行时用 resolveComponent('v-chip') 这类名字找组件的，
// 找不到就直接渲染失败（并且 Vue 的告警自己会抛错，看起来像别的毛病）。
//
// 只注册实际用到的那几个，不整体注册 Vuetify（那会把整个组件库打进包里）。
import type { App } from 'vue'
import { VChip, VCol, VIcon, VList, VListItem, VMenu, VRow } from 'vuetify/components'

const globals = { VChip, VCol, VIcon, VList, VListItem, VMenu, VRow }

export default {
  install(app: App): void {
    for (const [name, component] of Object.entries(globals)) {
      app.component(name, component)
    }
  },
}
