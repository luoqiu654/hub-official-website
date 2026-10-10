import { ref } from 'vue'

// ================= 设备检测单一真源（移动端长页模式） =================
// 双轨渲染：桌面保留现有 deck（滚轮翻页），移动端（手机 + 平板大类）走 MobileShell 长页。
// 判定口径（工作室已确认：平板先并入手机大类，后续再做专项调试）：
//   (1) pointer: coarse —— 触屏设备（手机 / 平板），横屏手机、iPad 横屏、Android 平板全覆盖；
//   (2) max-width: 1024px —— 非触屏的窄屏（小窗口桌面、<=1024 的显示器/浏览器）。
// 触屏笔记本 primary pointer 仍为 fine（鼠标优先），不会误入移动端。
// 所有组件只读本模块导出的 isMobile，不要各自判断尺寸。
const MOBILE_QUERIES = ['(pointer: coarse)', '(max-width: 1024px)']

const mqlList =
  typeof window !== 'undefined'
    ? MOBILE_QUERIES.map((q) => window.matchMedia(q))
    : []

function computeIsMobile() {
  return mqlList.some((mql) => mql.matches)
}

export const isMobile = ref(computeIsMobile())

let timer = null
function handleChange() {
  clearTimeout(timer)
  // 200ms 防抖：旋转/拖拽窗口跨阈值时避免频繁重渲染整棵分支
  timer = setTimeout(() => {
    isMobile.value = computeIsMobile()
  }, 200)
}

// 由 main.js 在应用启动时调用一次；change 事件在阈值跨越时触发
export function initIsMobile() {
  mqlList.forEach((mql) => {
    // 先移除再添加，防止 HMR 重跑 setup 时监听器重复
    mql.removeEventListener('change', handleChange)
    mql.addEventListener('change', handleChange)
  })
}
