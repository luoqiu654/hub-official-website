// 翻页全局锁：任何一次「滚动翻页」启动后，在过渡动画结束前忽略后续滚动。
// 否则鼠标一次的滚动动量会被后续崭新挂载的页面接连捕获，造成「滚一下切两页」。
const HOLD_MS = 1050 // 略长于 App.vue 的 0.9s 过渡，确保过渡期间不再触发下一次翻页
let holdUntil = 0

// 尝试获取翻页许可：空闲期返回 true 并开始锁定；锁定期间返回 false
export function tryAcquireFlip() {
  const now = performance.now()
  if (now < holdUntil) return false
  holdUntil = now + HOLD_MS
  return true
}
