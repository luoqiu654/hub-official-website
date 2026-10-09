import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径产物：可部署在域名根目录，也可放在任意子目录（如 /cqupt-hub/），无需改配置。
  // 配合 router 的 hash 模式，刷新时浏览器只请求 index.html，不会把子路由当成真实路径。
  base: './',
  plugins: [vue(), tailwindcss()],
})
