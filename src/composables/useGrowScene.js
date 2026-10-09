import gsap from 'gsap'
import Physics2DPlugin from 'gsap/Physics2DPlugin'

// ================= grow 布局层公共场景 =================
// bg.png / bg-hub.png / 成长体系.png / DEVELOPMENT.png / feature 是 grow 下所有子路由
// 共享的场景：入场动画在每次进入子路由时由布局层（grow.vue）重播；
// 滚动交互（拉动、回弹、戏剧性猛回弹 + 飞出）由各子路由复用：
//   - 小幅滚动：场景按比例平移，停止后回弹
//   - 大幅滚动：切换子路由（导航目标由子路由的回调决定）
// 子路由只负责自己的内容（卡片、火箭等）飞出与导航目标。
// 注意：场景元素挂在布局层，子路由用选择器驱动；元素在 DOM 中始终存在。

gsap.registerPlugin(Physics2DPlugin)

const BG_PULL = 8     // bg.png / bg-hub.png 随滚动被拉动的最大位移（视口高度百分比）
const THRESHOLD = 500 // 累计滚动量达到该值 → 上滚导航 / 下滚戏剧性飞出导航
const SETTLE_MS = 150 // 最后一次滚动事件后多久判定"停止滚动"
const ENTRANCE_DELAY = 0.3 // 入场动画整体延迟（秒），顺延 `ENTRANCE_MS` 保持"落定后才响应滚动"
const ENTRANCE_MS = 4000 // 入场动画总时长（含 ENTRANCE_DELAY 的顺延），结束后才响应滚动

// 模块级场景状态：grow 布局层常驻，子路由切换只换内容，场景状态连续
const s = {
  flipping: false,
  accUp: 0,
  accDown: 0,
  settledTimer: null,
  entryDone: false,
  entryTimer: null,
  bgY: 0, hubY: 0, tossAY: 0, tossBY: 0, vh: 0,
  straightenTimer: null,
  exitTimer: null,
  cb: { onUp: null, onDown: null, flyOut: null, backDramatic: false }, // 子路由回调
}

// 多次上滚时翻转补间可能被中途打断，旋转会停在歪的角度：
// 动画完全落定 0.5s 后原地旋转，就近摆正到整数圈
function straighten() {
  s.straightenTimer = null
  ;['.grow-toss-a', '.grow-toss-b'].forEach((sel) => {
    const rot = gsap.getProperty(sel, 'rotation')
    gsap.to(sel, { rotation: Math.round(rot / 360) * 360, duration: 0.35, ease: 'power1.out', overwrite: 'auto' })
  })
}

// ============ 入场动画（仅布局层挂载时播放一次，即首次进入 /grow） ============
export function playGrowEntrance() {
  // 清理上一轮的状态与动画（防止上一路由退出动画残留）
  if (s.entryTimer) { s.entryTimer.kill(); s.entryTimer = null }
  if (s.settledTimer) { clearTimeout(s.settledTimer); s.settledTimer = null }
  if (s.straightenTimer) { s.straightenTimer.kill(); s.straightenTimer = null }
  if (s.exitTimer) { s.exitTimer.kill(); s.exitTimer = null }
  s.flipping = false
  s.accUp = 0
  s.accDown = 0
  s.entryDone = false
  gsap.killTweensOf(['.bg', '.grow-toss-a', '.grow-toss-b', '.feature'])

  // 入场动画整体顺延 0.3s：用一条 timeline 统一 delay，各补间原有 delay 与并行关系保持不变
  const entrance = gsap.timeline({ delay: ENTRANCE_DELAY })

  const bgy = gsap.getProperty('.bg', 'y')
  // bg 从屏幕上方拉下来（起始位置为视口高度之上）
  entrance.fromTo('.bg', { y: -window.innerHeight + bgy }, { duration: 1, y: bgy }, 0)
  // 落地时的弹簧形变：先略放大再弹性回落到 1.8
  entrance.fromTo('.bg', { scale: 2.2 }, { scale: 1.8, duration: 1.2, ease: 'elastic.out(1.5, 0.28)', delay: 0.9 }, 0)

  entrance.fromTo(
    '.grow-toss-a',
    { y: () => window.innerHeight * 2.2, rotation: 0 },
    { y: 0, rotation: 360, duration: 1.8, ease: 'elastic.out(1, 0.55)', delay: 0.8 }, 0
  )

  entrance.to('.grow-toss-b', {
    duration: 1.30,
    delay: 1.0,
    physics2D: { velocity: 1020, angle: -90, gravity: 1500 },
    rotation: 360,
    ease: 'none',
    onComplete: () => {
      const y = gsap.getProperty('.grow-toss-b', 'y')
      gsap.fromTo('.grow-toss-b', { y: y + 40 }, { y, duration: 1.4, ease: 'elastic.out(1, 0.35)' })
    },
  }, 0)

  // feature 由大到小贴上去，透明度先慢后快由 0 到 1。
  // 基准缩放已挪到布局层 .feature-wrap 的 growScale（individual scale，不参与 GSAP），
  // 这里 .feature（img）只保留设计基准值 0.604（=0.7×932/1080，参考屏下的设计尺寸），
  // 不再含 window.innerHeight 项 → 视觉变化全部由 growScale 承担，避免与 wrapper 双重缩放。
  entrance.fromTo('.feature',
    { scale: 2.6, opacity: 0 },
    { scale: 0.604, opacity: 1, duration: 1.0, delay: 1.2, ease: 'power1.in' }, 0
  )

  // 入场动画全部结束后捕获场景静止位置，开始响应滚动
  s.entryTimer = gsap.delayedCall(ENTRANCE_MS / 1000, () => {
    s.bgY = gsap.getProperty('.bg', 'y')
    s.tossAY = gsap.getProperty('.grow-toss-a', 'y')
    s.tossBY = gsap.getProperty('.grow-toss-b', 'y')
    s.vh = window.innerHeight
    s.entryDone = true
  })
}

// 子路由切换后：只静默复位交互状态与背景，不在切换那一刻再补播一次。
// toss-a / toss-b 的翻转落定与 bg 猛回弹已由 dramaticExit 同拍触发（与小幅滚动一致），
// 这里只复位状态，避免它们重复播放、也避免把 dramaticExit 已开始的 toss 掐断。
export function resetGrowScene() {
  if (s.settledTimer) { clearTimeout(s.settledTimer); s.settledTimer = null }
  if (s.straightenTimer) { s.straightenTimer.kill(); s.straightenTimer = null }
  if (s.exitTimer) { s.exitTimer.kill(); s.exitTimer = null }
  s.flipping = false
  s.accUp = 0
  s.accDown = 0
  // 入场弹簧仍在播放(entryDone=false)：bg 正被入场补间驱动，绝不掐断——否则「回弹到一半定住再闪回」，
  // 且此时 s.bgY 尚未捕获(仍为 0)，set 会把它瞬移到错误位置。此时只清交互状态，让入场自然播完。
  if (!s.entryDone) return
  // 入场已完成：把可能被滚动拉扯/打断的 bg 平滑滑回归位。用一次过渡而非 set 瞬移——
  // 若 bg 正被 springBack / 猛回弹的弹簧驱动，kill+set 会冻结再跳变；从「当前值续到底」则无跳变。
  // 不 kill toss-a / toss-b：让 dramaticExit 已开始的翻转自然落定
  gsap.killTweensOf('.feature')
  gsap.killTweensOf('.bg')
  gsap.to('.bg', { y: s.bgY, scaleX: 1.8, scaleY: 1.8, duration: 0.5, ease: 'power2.out', overwrite: 'auto' })
  // entryDone 不重置：场景从未离开静止状态，直接继续响应滚动
}

// 成长体系.png / DEVELOPMENT.png：物理上抛 + 翻转一圈，随后弹性落定回原位。
// 供滚动回弹（springBack）与子路由切换的猛回弹（dramaticExit）复用 —— 两处都要有这个动画效果
function playToss() {
  // 成长体系.png：物理引擎上抛 + 翻转一圈，随后弹性落定回原位
  gsap.to('.grow-toss-a', {
    duration: 0.55,
    physics2D: { velocity: 500, angle: -90, gravity: 1500 },
    rotation: '+=360',
    ease: 'none',
    overwrite: 'auto',
    onComplete: () => {
      gsap.to('.grow-toss-a', { y: s.tossAY, duration: 0.45, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' })
    },
  })
  // DEVELOPMENT.png：物理上抛（抛物线）后弹性落回原位，同时翻转一圈
  gsap.to('.grow-toss-b', {
    duration: 1.1,
    delay: 0.15,
    physics2D: { velocity: 900, angle: -90, gravity: 1500 },
    rotation: '+=360',
    ease: 'none',
    overwrite: 'auto',
    onComplete: () => {
      gsap.to('.grow-toss-b', {
        y: s.tossBY, duration: 1.0, ease: 'elastic.out(1, 0.35)', overwrite: 'auto',
        onComplete: () => { s.straightenTimer = gsap.delayedCall(0.1, straighten) },
      })
    },
  })
}

// bg.png 普通回弹（小幅滚动停止）：落回原位 + 轻微形变
function bgSpringBack() {
  gsap.to('.bg', { y: s.bgY, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' })
  gsap.to('.bg', { scaleX: 1.72, scaleY: 1.86, duration: 0.12, ease: 'power2.out', overwrite: 'auto' })
  gsap.to('.bg', { scaleX: 1.8, scaleY: 1.8, duration: 0.9, ease: 'elastic.out(1, 0.4)', delay: 0.12, overwrite: 'auto' })
}

// 停止滚动：bg.png / bg-hub.png 弹回原位 + 轻微形变；成长体系.png 与 DEVELOPMENT.png 物理上抛翻转落回
function springBack() {
  s.accUp = 0
  s.accDown = 0
  if (s.straightenTimer) { s.straightenTimer.kill(); s.straightenTimer = null } // 新一轮动画开始，取消待执行的摆正
  bgSpringBack()
  playToss()
}

// 大幅度滚动到阈值：bg 猛回弹 + toss 同拍翻转（前进 / 回退共用同一套弹簧与翻转），然后切到目标子路由。
// dir 决定导航目标：'down' 前进(下滚)→onDown（子路由内容由 flyOut 飞出）；'up' 回退(上滚)→onUp。
function dramaticExit(dir) {
  s.flipping = true
  clearTimeout(s.settledTimer)
  if (s.straightenTimer) { s.straightenTimer.kill(); s.straightenTimer = null } // 不再需要摆正
  const vw = window.innerWidth
  const vh = window.innerHeight

  // bg.png 回弹的瞬间 —— 比普通回弹猛得多：先猛冲过原位 6vh，再大幅回落过冲，
  // 最后强弹性多段震荡收敛（振幅、周期都比 springBack 大）。两个方向用同一套弹簧。
  gsap.to('.bg', {
    keyframes: [
      { y: s.bgY - (vh * 6) / 100, duration: 0.2, ease: 'power2.in' },    // 猛弹过头
      { y: s.bgY + (vh * 3) / 100, duration: 0.22, ease: 'power2.out' },  // 大幅回落过冲
      { y: s.bgY, duration: 1.0, ease: 'elastic.out(1, 0.24)' },          // 强弹性震荡收敛
    ],
    overwrite: 'auto',
  })
  // 更猛的地形变：压扁拉伸幅度加大，弹性回落震荡更久
  gsap.to('.bg', { scaleX: 1.62, scaleY: 1.98, duration: 0.14, ease: 'power2.out', overwrite: 'auto' })
  gsap.to('.bg', { scaleX: 1.8, scaleY: 1.8, duration: 1.1, ease: 'elastic.out(1, 0.28)', delay: 0.14, overwrite: 'auto' })

  // 与 bg 的猛回弹同拍：toss-a / toss-b 也翻转落定，效果与小幅滚动停止一致，二者同时进行
  playToss()

  // 前进：子路由自己的内容飞出（卡片、火箭、标题、中心轴…）；回退时内容由各子路由 onUp 自行处理
  if (dir === 'down' && s.cb.flyOut) s.cb.flyOut(vw, vh)

  // 全部飞出、猛回弹收敛后切到目标子路由（布局层保持挂载，页面不整体淡出）
  s.exitTimer = gsap.delayedCall(1.7, () => {
    if (dir === 'down') { if (s.cb.onDown) s.cb.onDown() }
    else { if (s.cb.onUp) s.cb.onUp() }
  })
}

// 滚动主逻辑：绑定 wheel 监听；onUp / onDown / flyOut / backDramatic 由子路由提供。
// backDramatic：上滚回退(切回上一个 grow 子路由)时，是否也播与前进一致的 bg 弹簧 + toss 翻转。
// 只对「回退仍在 grow 内」的子路由(community / service)开；grow-main 回退是顶层切换，不开。
export function bindGrowWheel({ onUp, onDown, flyOut, backDramatic }) {
  s.cb = { onUp, onDown, flyOut, backDramatic: !!backDramatic }

  function onWheel(e) {
    if (s.flipping || !s.entryDone || !e.deltaY) return
    const up = e.deltaY < 0
    const a = up
      ? (s.accUp = Math.min(s.accUp - e.deltaY, THRESHOLD))
      : (s.accDown = Math.min(s.accDown + e.deltaY, THRESHOLD))
    const pull = ((s.vh * BG_PULL) / 100) * (a / THRESHOLD)
    // bg.png 与 bg-hub.png 随滚动量同向按比例平移（向上滚上移、向下滚下移）
    gsap.to('.bg', { y: s.bgY + (up ? -pull : pull), duration: 0.25, ease: 'power2.out', overwrite: 'auto' })
    if (up && s.accUp >= THRESHOLD) { // 向上滚到一定程度 → 回退上一个 grow 子路由
      clearTimeout(s.settledTimer)
      if (s.cb.backDramatic) { // 回退也播与前进一样的 bg 弹簧 + toss 翻转，再切回上一子路由
        dramaticExit('up')
        return
      }
      s.flipping = true
      if (s.cb.onUp) s.cb.onUp()
      return
    }
    if (!up && s.accDown >= THRESHOLD) { // 向下滚到一定程度 → 戏剧性飞出 + 导航下一个子路由
      dramaticExit('down')
      return
    }
    clearTimeout(s.settledTimer)
    s.settledTimer = setTimeout(springBack, SETTLE_MS)
  }

  window.removeEventListener('wheel', onWheel) // 先移除再添加，防止 HMR 重跑 setup 时监听器重复
  window.addEventListener('wheel', onWheel, { passive: true })

  // 返回解绑函数：子路由卸载时移除监听
  return () => {
    window.removeEventListener('wheel', onWheel)
    if (s.settledTimer) clearTimeout(s.settledTimer)
  }
}
