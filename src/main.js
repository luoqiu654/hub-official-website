import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initDesignScale } from './composables/useDesignScale'

// 全应用单监听:计算设计坐标系等比缩放(1920×1080 基准,300ms 节流)。
// 页面切换不重复绑定。
initDesignScale()

createApp(App).use(router).mount('#app')
