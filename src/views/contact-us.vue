<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { publicUrl } from '../composables/publicUrl'
import DesignStage from '../components/DesignStage.vue'

// 该页设计画幅 = 参考视口 1707×932（基准下 scale=1、舞台盒=视口 → 与原版完全一致）。
// 同心圆/图标轨道/贝塞尔转移用的都是固定 px 尺寸，即已是设计坐标；仅滚动离轨的
// 逃生终点用到了真实视口宽高，需换成设计常量，其余随舞台整体等比缩放。
const PAGE_W = 1707
const PAGE_H = 932

// 三个联系图标分别绕外层三个同心圆运动：圆心与 SVG 的圆心同在视口中心，
// 半径对齐外层三个圆的 r=235/305/375。周期不同 → 角速度/线速度都不同(速度不一样)。
// start 是起点角度比例，把三个出发位置岔开(各差 1/3 圈)，避免一开始挤在一起。
// src/qr 是字符串形式的 public 资源路径，Vite 不会改写，需显式走 publicUrl 以适配子目录部署
const iconOrbits = [
  { name: 'email',   src: publicUrl('/contact-us/email.webp'),   radius: 235, period: 24, start: 0.00, size: 88,
    email: '1950708010@qq.com', alt: '点击复制邮箱' },
  { name: 'redbook', src: publicUrl('/contact-us/redbook.webp'), radius: 305, period: 14, start: 0.33, size: 88,
    link: 'https://www.xiaohongshu.com/user/profile/67c0f46a0000000006010608?xsec_token=AB1ZXpyIYDmmIreEIYUSm6PUBgLFzy2pYYuVBcv79q0kI%3D&xsec_source=pc_search',
    alt: '点击进入官方账号' },
  { name: 'wechat',  src: publicUrl('/contact-us/wechat.webp'),  radius: 375, period: 19, start: 0.66, size: 88,
    qr: publicUrl('/contact-us/微信群.jpg') },
]
const iconEls = {}
let tweens = []
const rocketEl = ref(null)
const router = useRouter()

// 点击带有外部链接的图标：用新窗口打开(带 noopener 防止反向引用)
function openContactLink(link) {
  if (link) window.open(link, '_blank', 'noopener,noreferrer')
}

// 点击邮箱图标：复制到剪贴板，并短暂提示"已复制"
const copiedTip = ref('')
let copyTimer = null
function legacyCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch {}
  document.body.removeChild(ta)
}
async function copyEmail(email) {
  let ok = true
  try { await navigator.clipboard.writeText(email) } catch { ok = false }
  if (!ok) legacyCopy(email) // 非安全上下文(navigator.clipboard 不可用)的兜底
  copiedTip.value = '复制邮箱成功'
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copiedTip.value = '' }, 1600)
}

// 点击展示微信群二维码弹窗
const qrVisible = ref(false)
const qrSrc = ref('')
function openQr(src) { qrSrc.value = src; qrVisible.value = true }
function closeQr() { qrVisible.value = false }
function onKey(e) { if (e.key === 'Escape') qrVisible.value = false }

// 图标点击：有 link 打开外部链接；有 email 则复制；有 qr 则展示二维码；皆无则无动作
function handleIconClick(ic) {
  if (ic.link) { openContactLink(ic.link); return }
  if (ic.email) { copyEmail(ic.email); return }
  if (ic.qr) { openQr(ic.qr) }
}

// 上滚离开：累计滚动达到阈值后，火箭从当前位置沿"离轨转移弧"甩出，出界后返回对应页面。
const LEAVE_THRESHOLD = 500 // 累计滚动(上滚/下滚)达到该值 → 火箭离轨飞出
let accUp = 0               // 累计上滚量
let accDown = 0             // 累计下滚量
let leaving = false         // 离轨飞出进行中，屏蔽后续滚动
let orbitTween = null       // 进轨后的绕圈 tween(离轨前要先停掉)
let transferTween = null    // 进场转移 tween(未进轨就离开时也要先停掉，否则它与离轨弧互相拉扯)
let unbindWheel = null      // 滚动监听解绑函数

// ================= 火箭：从屏幕外左上方沿转移弧切入最内圆并顺时针绕圈 =================
// 以同心圆圆心为参考系(屏幕 px，y 向下)。进轨点选在最内圆的"正上方"，火箭从屏幕外左上
// 俯冲下来、贴着正上方沿切线(+x 方向)切入，随后按 r=165 匀速顺时针转(上→右→下→左)，
// 正好就是"从上方绕下来、顺时针旋转"。位置、进轨点、头部朝向三者连续，进轨不再突然转向。
const R_INNER = 165            // 最内圆半径 = 目标轨道半径
const ENTRY_PHI = -Math.PI / 2 // 进轨点相位：-90° = 最内圆正上方(0,-165)
const ENTRY_PT = { x: R_INNER * Math.cos(ENTRY_PHI), y: R_INNER * Math.sin(ENTRY_PHI) } // 进轨点(正上方)
const ENTRY_DIR = { x: -Math.sin(ENTRY_PHI), y: Math.cos(ENTRY_PHI) }                   // 顺时针切向(此处 = +x)
const ORBIT_PERIOD = 17        // 进轨后绕一圈时长

// 转移弧用三次贝塞尔：B0(起点)屏幕外左上 → B3(终点)恰为进轨点；
// 末段切线由 B3-B2 决定，把它设成与顺时针切向(+x)同向 → 位置与方向都无跳变。
const B0 = { x: -1100, y: -1000 }
const B1 = { x: -1000, y: -340 }
const B2 = { x: ENTRY_PT.x - 520 * ENTRY_DIR.x, y: ENTRY_PT.y - 520 * ENTRY_DIR.y } // 正上方左侧 520px
const B3 = ENTRY_PT

// 让"到轨瞬间"的速度等于圆周运动速度(而非减到 0)：
//   圆周速度 V_ORB = 2π·r / 周期；贝塞尔终点参数化 |B'(1)| = 3·|B3-B2|。
//   缓动末斜率 S_END = V_ORB·时长 / |B'(1)|，使转移末段正好滑进轨道、与圆轨道无缝衔接。
const TRANSFER_DURATION = 3.8
const V_ORB = (R_INNER * 2 * Math.PI) / ORBIT_PERIOD   // 圆周运动速度(px/s) ≈ 61
const G_END = 3 * Math.hypot(B3.x - B2.x, B3.y - B2.y) // 贝塞尔终点切向模长 |B'(1)| = 1560 px/t
const S_END = (V_ORB * TRANSFER_DURATION) / G_END       // 缓动末斜率(≈0.149)
// 减速但不归零的缓动：f(0)=0 起飞慢(屏幕外无感)、f'(1)=S_END → 到轨速度恰为圆周速度
const transferEase = (u) => (3 - S_END) * (u * u) + (S_END - 2) * (u * u * u)

// 用相邻两帧位移求火箭朝向：箭尖始终顺着飞行方向，进轨瞬间与圆轨道运动方向无缝衔接
function makeSteer(el) {
  let px = 0, py = 0, init = false
  return (x, y) => {
    if (!init) { px = x; py = y; init = true; return }
    const dx = x - px, dy = y - py
    if (dx * dx + dy * dy > 0.25) {
      gsap.set(el, { rotation: Math.atan2(dy, dx) * 180 / Math.PI })
      px = x; py = y
    }
  }
}

// 转移段：沿贝塞尔曲线俯冲进场，抵达 B3(正上方)那一刻正好沿 +x(顺时针切向)水平切入
function startRocketTransfer(el) {
  const t = { v: 0 }
  const steer = makeSteer(el)
  const place = () => {
    const u = 1 - t.v
    const a = u * u * u, b = 3 * u * u * t.v, c = 3 * u * t.v * t.v, d = t.v * t.v * t.v
    const x = a * B0.x + b * B1.x + c * B2.x + d * B3.x
    const y = a * B0.y + b * B1.y + c * B2.y + d * B3.y
    gsap.set(el, { x, y })
    steer(x, y)
  }
  place() // 先摆到屏幕外起点的朝向上，避免首帧露在圆心
  transferTween = gsap.to(t, { v: 1, duration: TRANSFER_DURATION, delay: 0.4, ease: transferEase, onUpdate: place,
    onComplete: () => startInnerOrbit(el, steer) })
  tweens.push(transferTween)
}

// 进轨后：从正上方出发、θ 单调递增 → 顺时针(上→右→下→左)。起始角/位置与转移终点一致，方向也同向
function startInnerOrbit(el, steer) {
  const ang = { v: ENTRY_PHI }
  const place = () => {
    const x = R_INNER * Math.cos(ang.v), y = R_INNER * Math.sin(ang.v)
    gsap.set(el, { x, y })
    steer(x, y)
  }
  place()
  orbitTween = gsap.to(ang, { v: ENTRY_PHI + Math.PI * 2, duration: ORBIT_PERIOD, ease: 'none', repeat: -1, onUpdate: place })
  tweens.push(orbitTween)
}

// 通用离轨：从火箭此刻在圆轨道上的位置出发，沿"外抛转移弧"(近似天体运动)
// 甩向 exit 方向飞出；起点切线接当前圆周方向 → 无跳变，出界后回调 onDone。
function rocketEscape(el, exit, endDir, onDone) {
  // 火箭離軌时它可能仍在进场转移中(未到轨道)或已在轨道上。先把仍在跑、各自改写火箭位置的
  // transfer 与 orbit tween 一并停掉，否则它们会继续用各自的 place() 把火箭往轨道上拽，
  // 与离轨弧互相拉扯→飞出后又在轨道上闪几下。
  transferTween?.kill()
  transferTween = null
  orbitTween?.kill()
  orbitTween = null
  const sx = Number(gsap.getProperty(el, 'x')) || 0
  const sy = Number(gsap.getProperty(el, 'y')) || 0
  const rad = Math.hypot(sx, sy) || 1
  const tx = -(sy / rad), ty = sx / rad       // 圆周运动方向(顺时针切向) = 当前速度方向
  const L = 260
  const P0 = { x: sx, y: sy }
  const P1 = { x: sx + tx * L, y: sy + ty * L }                        // 起点沿当前圆周方向(动量不突变)
  const P2 = { x: exit.x - endDir.x * L, y: exit.y - endDir.y * L }    // 出界点沿 endDir 滑出
  const P3 = { x: exit.x, y: exit.y }
  const steer = makeSteer(el)
  const t = { v: 0 }
  const place = () => {
    const u = 1 - t.v
    const a = u * u * u, b = 3 * u * u * t.v, c = 3 * u * t.v * t.v, d = t.v * t.v * t.v
    const x = a * P0.x + b * P1.x + c * P2.x + d * P3.x
    const y = a * P0.y + b * P1.y + c * P2.y + d * P3.y
    gsap.set(el, { x, y })
    steer(x, y)
  }
  place()
  tweens.push(gsap.to(t, { v: 1, duration: 1.4, ease: 'power2.inOut', onUpdate: place, onComplete: onDone }))
}

// 上滚离轨：火箭向屏幕外左上飞出，回到 destination。
function leaveToDestination(el) {
  if (leaving) return
  leaving = true
  orbitTween?.kill()
  orbitTween = null
  const vw = PAGE_W
  const sy = Number(gsap.getProperty(el, 'y')) || 0
  rocketEscape(el,
    { x: -vw / 2 - 500, y: sy - 160 },                       // 屏幕外左上
    { x: -Math.sqrt(0.97), y: -Math.sqrt(0.03) },            // 左上单位方向
    () => router.push('/destination'))
}

// 下滚离轨：火箭向屏幕外下方(略偏左)飞出，回到首页。
function leaveToHome(el) {
  if (leaving) return
  leaving = true
  orbitTween?.kill()
  orbitTween = null
  const vh = PAGE_H
  const sx = Number(gsap.getProperty(el, 'x')) || 0
  rocketEscape(el,
    { x: sx - 240, y: vh / 2 + 500 },                        // 屏幕外下方略偏左
    { x: -Math.sqrt(0.03), y: Math.sqrt(0.97) },             // 下偏左单位方向
    () => router.push('/'))
}

// 点击右下角「返回首页」圆钮：复用下滚那条出口，火箭沿同一条离轨弧飞出屏幕后才切路由。
// 不直接 router.push —— 否则火箭还挂在圆轨道上，页面就已经没了，动画等于白做；
// 而且 leaveToHome 内部会先 kill 掉 transfer/orbit 两个还在改写火箭位置的补间，
// 与滚轮离轨走的是同一条路径，两者看到的动画完全一致。
// rocketEl 在 mount 后才绑上，所以做空值保护（点了没反应，总好过报错）。
const backToIndex = () => { if (rocketEl.value) leaveToHome(rocketEl.value) }

onMounted(() => {
  iconOrbits.forEach((o) => {
    const el = iconEls[o.name]
    if (!el) return
    // t ∈ [start, start+1)：驱动角度，place 用三角函数把角度换算成圆上的 x/y 位移
    const angle = { t: o.start }
    const place = () => {
      const rad = angle.t * Math.PI * 2
      gsap.set(el, { x: o.radius * Math.cos(rad), y: o.radius * Math.sin(rad) })
    }
    place() // 先摆好初始位置，避免首帧出现在圆心
    // 绕一圈时长 = period：period 越大转得越慢；ease:'none' 匀速。
    // 每圈结束 GSAP 自动重复，t 从 start+1 跳回 start 时因三角函数周期性无视觉突变。
    const tw = gsap.to(angle, { t: o.start + 1, duration: o.period, ease: 'none', repeat: -1, onUpdate: place })
    tweens.push(tw)
    // 鼠标悬停该图标 → 暂停绕圈；离开 → 从当前位置继续
    el.addEventListener('mouseenter', () => tw.pause())
    el.addEventListener('mouseleave', () => tw.play())
  })

  // 火箭：从屏幕外左上沿转移轨道切入最内圆，随后绕它转动
  startRocketTransfer(rocketEl.value)

  // 滚动离页：上滚累计达阈值 → 火箭向屏幕左侧飞出返回 destination；
  //            下滚累计达阈值 → 火箭向下方飞出返回首页。滚动方向可随时切换，各自独立累计。
  function onWheel(e) {
    if (leaving || !e.deltaY) return
    if (e.deltaY > 0) {
      accUp = 0
      accDown += e.deltaY
      if (accDown >= LEAVE_THRESHOLD) leaveToHome(rocketEl.value)
    } else {
      accDown = 0
      accUp += -e.deltaY
      if (accUp >= LEAVE_THRESHOLD) leaveToDestination(rocketEl.value)
    }
  }
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('keydown', onKey)
  unbindWheel = () => window.removeEventListener('wheel', onWheel)
})

onUnmounted(() => {
  if (unbindWheel) unbindWheel()
  window.removeEventListener('keydown', onKey)
  if (copyTimer) clearTimeout(copyTimer)
  tweens.forEach((t) => t.kill())
  tweens = []
  orbitTween = null
  transferTween = null
  accUp = 0
  accDown = 0
  leaving = false
})
</script>

<template>
  <div class="contact-us">
    <!-- 设计舞台：画幅 1707×932（基准视口）。舞台成为这些 fixed 元素的包含块，
         同心圆/图标轨道/火箭按设计坐标定位并整体等比缩放（基准下 scale=1、与视口重合）。
         复制弹窗与二维码弹层属于真实视口 UI，留在舞台外，不随舞台缩放。 -->
    <DesignStage :design-w="1707" :design-h="932">
    <!-- 背景：固定在整个视口底部 -->
    <img src="/bg-light.webp" class="fixed bottom-0 scale-[3] translate-y-2/3">
    <!-- 主图：改为 fixed 脱离文档流，避免撑动/影响上面背景的位置；定位用下面的 class 自行调整 -->
    <img src="/contact-us/联系我们.webp" alt="" class="scale-[0.5] fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-[63%] z-10">
    <img src="/contact-us/CONTACT.webp" class="scale-[0.5] fixed left-1/2 -translate-x-1/2 top-1/2 z-10">
    <!-- 4 个虚线同心圆：包住上面两个图，样式与原来的椭圆一致(同色描边 + 圆点)，
         圆心对准两个图所在的视口中心，最内环正好包住文字、往外按 70px 等差扩散。
         viewBox 取 754、圆心放在 377，正好容纳最外环 r=375 及其 3.5px 圆点描边，
         边界不再裁掉外圈 -->
    <svg
      class="fixed left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      width="754" height="754" viewBox="0 0 754 754"
    >
      <g fill="none" stroke="#033B37" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0 22">
        <circle cx="377" cy="377" r="165" />
        <circle cx="377" cy="377" r="235" />
        <circle cx="377" cy="377" r="305" />
        <circle cx="377" cy="377" r="375" />
      </g>
    </svg>
    <!-- 三个联系图标分别绕外层三个同心圆运动：圆心即 SVG 圆心(视口中心)，半径/周期不同 → 速度不同。
         图标用负 margin 居中到 (left:50%, top:50%)，位移交给 GSAP 的 x/y，避免与 CSS translate 相撞 -->
    <img
      v-for="ic in iconOrbits"
      :key="ic.name"
      :src="ic.src"
      :alt="ic.alt || ''"
      :ref="(el) => (iconEls[ic.name] = el)"
      @click="handleIconClick(ic)"
      class="contact-icon fixed left-1/2 top-1/2 z-10 cursor-pointer"
      :style="{ width: ic.size + 'px', height: ic.size + 'px', marginLeft: -ic.size / 2 + 'px', marginTop: -ic.size / 2 + 'px' }"
    />
    <!-- 火箭：以同心圆圆心为锚点，位移交给 GSAP 的 x/y（避免与 CSS translate 相撞），
         z-20 让它浮在圆环与“联系我们”文字之上；箭头朝向由 GSAP rotation 逐帧跟着轨迹方向走 -->
    <img ref="rocketEl" src="/grow/rocket.webp" class="fixed left-1/2 top-1/2 z-20 pointer-events-none"
      style="width: 96px; height: 96px; margin-left: -48px; margin-top: -48px">
    <img src="/aboutus/earth.webp" class="scale-[0.6] fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-3/8 z-0">
    </DesignStage>
    <!-- 右下角「返回首页」圆钮：与二维码弹层/复制提示同属真实视口 UI，故放在舞台外 ——
         fixed 落在真实视口右下角，不随舞台等比缩放，任何分辨率下大小与位置都一致；
         若放进舞台，舞台 contain 缩放后在宽屏会留出边条，按钮会浮在离屏幕角还有一段的位置。
         点击不直接切路由，走 backToIndex() → 与下滚同一套火箭离轨动画（见 <script>） -->
    <button type="button" class="back-to-index" aria-label="返回首页" @click="backToIndex">
      <img src="/contact-us/backtoindex.webp" alt="" />
    </button>
    <!-- 复制邮箱成功后顶部弹出的小弹窗 -->
    <div v-if="copiedTip"
      class="copy-pop fixed left-1/2 top-14 z-30 px-4 py-2 rounded-full bg-black/70 text-white text-sm whitespace-nowrap">
      {{ copiedTip }}
    </div>
    <!-- 微信群二维码弹窗：点遮罩或右上角 × 或按 Esc 关闭 -->
    <transition name="qr-fade">
      <div v-if="qrVisible" class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 cursor-pointer"
        @click="qrVisible = false">
        <div class="relative pointer-events-auto" @click.stop>
          <img :src="qrSrc" alt="微信群二维码" class="max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl">
          <button
            class="absolute -top-3 -right-3 size-9 rounded-full bg-white text-black text-xl font-bold shadow-lg cursor-pointer"
            @click="qrVisible = false">×</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 右下角「返回首页」圆钮：原图 172×182（backtoindex.webp，无损 WebP，9863B → 3454B）。
   图里真正可见的实心圆盘（含深青描边）只有 133px 直径，四周还留了透明边和第 11~33px
   处一圈柔和投影，所以 width 要按「画布 ÷ 圆盘」放大 —— 这样 --disc 就是屏幕上看到的
   圆盘直径，想调按钮大小只改这一个值，投影与留白随之等比。
   放在舞台外（fixed 相对真实视口），所以用 px 而不是设计坐标；尺子对齐 .contact-icon(88px)，
   略小一圈 —— 角落里的导航按钮不该比主内容更抢眼。
   z-30：压在火箭(z-20)/图标之上、二维码弹层(z-40)之下。 */
.back-to-index {
  --disc: 56px;
  position: fixed;
  right: 32px;
  bottom: 32px;
  z-index: 30;
  width: calc(var(--disc) * 172 / 133);
  border: 0;
  padding: 0;
  background: transparent;
  line-height: 0;
  border-radius: 9999px;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

/* 上箭头本身就是「向上/退出」的语义，悬停再往上抬一点强化这个方向感 */
.back-to-index:hover {
  transform: translateY(-4px) scale(1.06);
}

.back-to-index:active {
  transform: translateY(0) scale(0.96);
}

.back-to-index:focus-visible {
  outline: 2px solid rgba(3, 59, 55, 0.8);
  outline-offset: 4px;
}

/* 图铺满按钮盒；点击落到 button 上，别让 img 抢走事件目标 */
.back-to-index img {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
}

/* 顶部复制弹窗：用私有 transform 居中(不依赖 Tailwind 的 translate)，动画与静止态叠加在同一 transform 上 */
.copy-pop {
  transform: translateX(-50%);
  animation: copyPopIn 0.25s ease-out;
}
@keyframes copyPopIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* 微信群二维码弹窗：淡入淡出 */
.qr-fade-enter-active, .qr-fade-leave-active { transition: opacity 0.2s ease; }
.qr-fade-enter-from, .qr-fade-leave-to { opacity: 0; }
</style>
