import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n'
import { pinia } from './plugins/pinia'
import appComponents from './plugins/components'
import vuetify from './plugins/vuetify'
// 样式分层：旧样式（P6 清理）→ 基础层 → 组件层
import './styles/main.scss'
import './styles/foundation.scss'
import './styles/components.scss'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(appComponents)
app.use(i18n)

app.mount('#app')
