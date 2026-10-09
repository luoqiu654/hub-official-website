import { ref, computed } from 'vue'

// ================= 设计坐标系 + 等比 contain-fit 缩放 =================
// 全站统一视觉:每页先用 px 把元素定在「设计坐标系」内,再由本模块监听
// 视口变化计算 uniform scale,用 transform: scale() 把整页等比缩放到视口内
// (contain fit 取较小值 min(scaleX, scaleY))。
//
// 为什么用 JS 而非纯 CSS:舞台内元素是固定 px 定位,若只等比缩放外层
// aspect 盒,内层 px 位置不会随之缩放(这正是原布局「不触发重排的定位 +
// 视口单位」错位的根源)。唯有由 JS 算出 scale 再整体 scale() 舞台,
// 设计坐标系内的 px 位置才能同步缩放。
//
// 为什么 300ms 节流:连续拖拽窗口时最多 300ms 重新计算一次,避免整层
// transform 缩放的高频重绘;等 resize 停止后再算一次,保证最终定位准确。
//
// 视口状态(vw/vh)为全应用唯一真源:改变窗口时只更新这两个 ref,
// 各页(或舞台)据此自行计算各自的 scale,互不干扰。

// 标准 16:9 设计基准(供大多数页面与动画换算用)
export const DESIGN_W = 1920
export const DESIGN_H = 1080

// 真实视口尺寸(模块级单例,由 initDesignScale 维护)
export const vw = ref(typeof window === 'undefined' ? 1920 : window.innerWidth)
export const vh = ref(typeof window === 'undefined' ? 1080 : window.innerHeight)

// 标准 16:9 缩放 = min(winW/1920, winH/1080):供动画代码与 16:9 页面读取。
// 任意组件或普通 JS(如 useGrowScene 的 GSAP 动画)都可调用 getScale() 拿当前值。
export const designScale = computed(() => Math.min(vw.value / DESIGN_W, vh.value / DESIGN_H))
export const getScale = () => designScale.value

// 生成某页自己的缩放(设计宽高可自定义)。fit 决定缩放基准,默认 contain:
//   contain(默认) min(scaleX, scaleY) → 内容完整可见、不裁切,可能留左右/上下边条
//   width         vw/designW          → 锁宽度铺满,纵向溢出被裁(适合 2880 宽的高画布,如 about-us2)
//   height        vh/designH          → 锁高度铺满,横向溢出被裁
//
// contain 适配主流办公屏(1920×1080、1366×768、1600×900、1440×900、2560×1440),
// 任意比例下内容完整可见、不裁切,天然抵消浏览器占去的约 80–120px 高度。
// width 专为「原生比视口更窄(更高)的画布」:像 about-us2 这类 2880×2048 设计
// 在 16:9 屏下按 contain 会被高度压缩而整体缩小,改用 width 铺满宽度、上下裁切,
// 才与原 `w-full aspect-2880/2048` 的构图一致。
export function makeScale(designW = DESIGN_W, designH = DESIGN_H, fit = 'contain') {
  return computed(() => {
    if (fit === 'width') return vw.value / designW
    if (fit === 'height') return vh.value / designH
    return Math.min(vw.value / designW, vh.value / designH)
  })
}

// 监听视口变化,300ms 节流,只更新 vw/vh(不直接改 scale,交给各页计算)。
export function initDesignScale() {
  const update = () => {
    vw.value = window.innerWidth
    vh.value = window.innerHeight
  }
  let timer = null
  update() // 挂载即先算一次,首帧即为真实视口
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(update, 300) // 最多 300ms 响应一次
  })
}
