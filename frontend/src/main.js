import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import BaiduMap from 'vue-baidu-map-3x'

const app = createApp(App)

app.use(router)
app.use(store)
app.use(ElementPlus)
app.use(BaiduMap, {
  ak: 'Mwa6vJOY1esfS47AcXVfARhplRszw10T',
})

app.mount('#app')
