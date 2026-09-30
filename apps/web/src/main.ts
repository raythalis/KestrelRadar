import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n'
import vuetify from './plugins/vuetify'
import './styles/main.scss'

const app = createApp(App)

app.use(createPinia().use(piniaPluginPersistedstate))
app.use(router)
app.use(vuetify)
app.use(i18n)

app.mount('#app')
