import './assets/main.css'
import 'tdesign-vue-next/es/style/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import TDesign from 'tdesign-vue-next'
import 'tdesign-icons-vue-next'

const app = createApp(App)
app.use(TDesign)
app.mount('#app')
