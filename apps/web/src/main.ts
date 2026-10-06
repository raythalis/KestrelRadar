import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n'
import { pinia } from './plugins/pinia'
import appComponents from './plugins/components'
import vuetify from './plugins/vuetify'
import vuetifyGlobals from './plugins/vuetify-globals'
// 样式分层：字体 → 图标 → 基础形状 → 基础层 → 组件层 → v2 设计层
// 视觉数值只有一份 source：design/v2/tokens.ts 注入的 --k2-*（旧名字 --k-* 是兼容别名）。
import './styles/fonts.scss'
import './styles/mdi.scss'
import './styles/main.scss'
import './styles/foundation.scss'
import './styles/components.scss'
import './styles/v2.scss'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(vuetifyGlobals)
app.use(appComponents)
app.use(i18n)

app.mount('#app')
