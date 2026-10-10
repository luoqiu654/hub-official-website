import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initDesignScale } from './composables/useDesignScale'
import { initIsMobile } from './composables/useIsMobile'

// 全应用单监听:计算设计坐标系等比缩放(1920×1080 基准,300ms 节流)。
// 页面切换不重复绑定。
initDesignScale()

// 移动端判定监听(pointer: coarse / max-width: 1024px,200ms 防抖):
// 触发双轨渲染分支,桌面 deck 与移动长页互斥挂载。
initIsMobile()

createApp(App).use(router).mount('#app')
