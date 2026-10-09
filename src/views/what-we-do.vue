<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { tryAcquireFlip } from '../composables/useFlipLock'
import { cardModules } from '../composables/useProjectAssets'
import { PROJECT_LINKS } from '../composables/projectLinks'
import DesignStage from '../components/DesignStage.vue'

// 该页设计画幅 = 参考视口 1707×932（基准下 scale=1、舞台盒=视口 → 与原版完全一致）。
// 缩放后整体等比。灯笼走马灯/动画都按此设计宽度计算。
const PAGE_W = 1707
const PAGE_H = 932

const router = useRouter()

// 每个项目 = 一个项目栏单元：外框 + 项目卡片 + 底部内阴影 + 底部项目名称
// 项目图由 useProjectAssets 统一扫描 src/assets/whatwedo 下全部 *.webp 得到：
// 文件名即项目名，展示名 = 文件名 + “项目”。往该文件夹放一张新图即可自动进跑马灯，无需改代码
const projects = Object.entries(cardModules)
  .sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'))
  .map(([file, url]) => {
    const name = file.split('/').pop().replace(/\.webp$/, '')
    return { src: url, name: `${name}项目`, url: PROJECT_LINKS[name] }
  })

// 两行各一半（第一行向左、第二行向右），行与行反向交叉跑动
const rowSplit = Math.ceil(projects.length / 2)
const rowTop = projects.slice(0, rowSplit)
const rowBottom = projects.slice(rowSplit)
// 渲染 4 遍，translateX(-50%) 只推进一半宽度 → 走马灯无缝循环
const loop = (arr, prefix) => Array(4).fill(arr).flat().map((p, i) => ({ id: `${prefix}${i}`, src: p.src, name: p.name, url: p.url }))
const topUnits = loop(rowTop, 't')
const bottomUnits = loop(rowBottom, 'b')

const rows = [
  { dir: 'marquee-left', units: topUnits },
  { dir: 'marquee-right', units: bottomUnits },
]

// ── 灯笼走马灯参数（可调）────────────────────────────
const LANTERN_SCALE = 1 // 统一缩放
const LANTERN_DURATION = 10 // 每圈秒数：越小漂得越快（巡航段速度）
const ENTRY_DURATION = 0.5 // 进入页面时"快速冲进"的秒数
const ENTRY_FRAC = 0.1 // 入口冲刺 0.5s 推进的路程占整条路径的比例（越大冲得越猛）
const ENTRY_RUSH_START = 1.5 // 入口起点的相对陡度：越大开头冲得越狠；末端斜率自动匹配巡航速度
// 横幅沿运动线（斜率 450/238 ≈ 1.89，即与水平约 62.13°）倾斜，让图随移动方向一同旋转；
// 由同一斜率推导角度，保证和下方运动的 450/238 完全一致
const BANNER_ANGLE = (Math.atan(450 / 238) * 180) / Math.PI // ≈ 62.13°
// 横幅实际尺寸 1464×368；旋转后长轴贴运动线，故"一灯长" = 宽 1464×scale
const BANNER_W = 1464 * LANTERN_SCALE
// 首尾相接且无缝循环的关键：整条路径长 = 数量 × 一灯长。
// 这样相邻横幅匀速、间距恒为一灯长，出屏/回位也与下一盏正好错开一环（走马灯栅格原理）。
// 数量 ≥ 3 时路径才足够长，能保证横幅全程在屏幕外进出（数量 2 时高屏会露馅）。
const LANTERN_COUNT = 3 // 横幅数量（改多则路径/间距自动按上式重算；≥3 才能全程屏外进出）
// 起点回到原来位置：中心在屏幕右下角屏外 (vw+offRight, vh+offBottom)
const LANTERN_OFF_RIGHT = 400
const LANTERN_OFF_BOTTOM = 900
// ───────────────────────────────────────────────

// 灯笼（横幅）走马灯：右下角屏外进入 → 沿 y = -2x（屏幕坐标 (-DX, -2DX)）向左上漂移出屏 → 循环回右下角再入屏
const lanterns = ref([])
let lanternTl = null // 走马灯主时间线（入口冲进 + 巡航），供卸载/HMR 时清理

// 构造一条起点陡、末端恰好以指定斜率结束的 ease（三次样条）：
// f(t) = a·t³ + b·t² + c·t，约束 f(0)=0、f(1)=1、f'(0)=起点陡度、f'(1)=末端斜率。
// 用来让"冲进"结束时的速度 == 巡航速度 → 无缝滑入巡航，无停顿感。
function rushEase(endSlope, startSlope) {
  const a = endSlope - 2 + startSlope
  const b = 3 - endSlope - 2 * startSlope
  return (t) => a * t * t * t + b * t * t + startSlope * t
}

function startLanterns() {
  if (lanternTl) { lanternTl.kill(); lanternTl = null } // 防止 HMR 重跑 setup 时叠加旧时间线
  // 设计画幅固定 1707×932（基准视口）。灯笼身处缩放舞台内，x/y 均为设计单位：
  // 不用 window.innerWidth/innerHeight，否则与舞台 scale 双重补偿导致缩放后错位。
  const vw = PAGE_W
  const vh = PAGE_H
  const slope = 450 / 238
  const slopeLen = Math.hypot(1, slope) // 运动线线长比例：dx=1 时对应的斜边长（≈2.14）
  // 整条路径长 = 数量 × 一灯长 → 相邻横幅恒为一灯长（首尾相接），且循环回位正好错开一环
  const L = LANTERN_COUNT * BANNER_W
  // 起点回到原来的右下角屏外；路径足够长，全程在屏幕外进出，不露馅
  const startX = vw + LANTERN_OFF_RIGHT
  const startY = vh + LANTERN_OFF_BOTTOM

  // 一次性写好位移缩放旋转，之后每帧只改 x/y（GSAP 会保留其余变换分量）
  gsap.set(lanterns.value, {
    xPercent: -50, yPercent: -50, scale: LANTERN_SCALE, rotation: BANNER_ANGLE,
  })

  // 走马灯用"刚性"模型：state.p 为沿线进度（0=入口，L=出口）。
  // 所有灯按 p + i×一灯长 取模排布 —— 即使速度变化，相邻两灯也恒为一灯长，始终首尾相接。
  const state = { p: 0 }
  const place = () => {
    lanterns.value.forEach((el, i) => {
      const q = (((state.p + i * BANNER_W) % L) + L) % L // 按下标错位一灯长（可取负，确保非负）
      gsap.set(el, { x: startX - q / slopeLen, y: startY - (slope * q) / slopeLen }) // 纵向 = 横向 × slope → 贴合 y = -2x
    })
  }
  place() // 先摆好初始位置，避免首帧跳到原点

  // 入口 0.5s：整条灯列快速冲进，末端斜率匹配巡航速度 → 无缝滑入巡航，无停顿
  const cruiseStart = L * ENTRY_FRAC
  // 末端斜率：使冲进结束时的瞬时速度 == 巡航速度。解 ENTRY_FRAC*L*endSlope/ENTRY_DURATION = L/LANTERN_DURATION
  const endSlope = ENTRY_DURATION / (LANTERN_DURATION * ENTRY_FRAC)
  lanternTl = gsap.timeline()
  lanternTl.to(state, { p: cruiseStart, duration: ENTRY_DURATION, ease: rushEase(endSlope, ENTRY_RUSH_START), onUpdate: place }, 0)
  // 巡航：恒定速度（正常）无限循环。p 到 L 后按 L 取模，回环瞬间无缝
  lanternTl.to(
    state,
    { p: cruiseStart + L, duration: LANTERN_DURATION, ease: 'none', repeat: -1, onUpdate: place },
    ENTRY_DURATION
  )
}

// 点击有链接的项目卡：新标签页打开（无 url 的卡不可点）
const openLink = (url) => { if (url) window.open(url, '_blank', 'noopener') }

// 向上滚动：回到上一页 about-us2；向下滚动：切到 what-we-do2（不再淡出 bg-light，由 App.vue 弧形过渡接管）
let flipping = false
function onWheel(e) {
  if (flipping || !e.deltaY) return
  // 全局翻页锁：单次滚动的动量会被后续新挂载的页面接连捕获，这里在过渡期间拒绝再次翻页
  if (!tryAcquireFlip()) return
  flipping = true
  if (e.deltaY > 0) {
    router.push('/whatwedo2')
  } else {
    router.push('/aboutus2')
  }
}

onMounted(() => {
  window.removeEventListener('wheel', onWheel) // 先移除再添加，防止 HMR 重跑 setup 时监听器重复
  window.addEventListener('wheel', onWheel, { passive: true })
  startLanterns()
})

onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)
  if (lanternTl) lanternTl.kill()
  gsap.killTweensOf(lanterns.value)
})
</script>

<template>
  <div class="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden">
    <!-- 设计舞台：画幅 1707×932（基准视口）。舞台成为 absolute/fixed 元素的包含块，
         内部 % 定位由此解析到舞台（随舞台等比缩放）；仅 vh/vw 这类解析到真实视口的单位
         需换算成设计 px（基准下 scale=1，故设计 px = 基准视口 px）。 -->
    <DesignStage :design-w="1707" :design-h="932">
      <img src="/bg-light.webp" class="bg-light absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
      <img src="/whatwedo/WHAT-WE-DO.webp" class="absolute top-[-9.32px] left-[-68.28px] scale-[0.5]">
      <div class="sub-title absolute left-[17.07px] top-[65.24px] text-[#0A665F]">从教育数字化到互联网产品，我们持续探索技术应用的新可能。</div>
      <!-- 灯笼走马灯：从右下角屏外进入，沿 y = -2x 向左上漂移出屏，循环回右下角再入屏 -->
      <img v-for="i in LANTERN_COUNT" :key="i" src="/whatwedo/revolvinglantern.webp" ref="lanterns"
        class="absolute z-999 left-0 top-0">
      <!-- 两行走马灯：绝对定位铺满设计宽，轨道锚定在舞台最左，循环中任意时刻右侧都有内容补位 -->
      <div class="project-bar absolute left-0 top-[111.84px] z-10 flex w-full flex-col gap-5">
        <div v-for="row in rows" :key="row.dir" class="marquee w-max" :class="row.dir">
          <!-- 每个项目一个单元：外框 + 卡片 + 底部内阴影；带链接的卡可点 → 新标签页打开 -->
          <div v-for="unit in row.units" :key="unit.id" class="unit relative mr-5 overflow-hidden aspect-706/450 h-[233px]"
            :class="{ 'cursor-pointer': unit.url }" @click="openLink(unit.url)">
            <img :src="unit.src" class="card absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 object-cover" />
            <img src="/whatwedo/project-innershadow.webp"
              class="shadow pointer-events-none absolute w-[120%] max-w-none bottom-[-130.48px] left-1/2 -translate-x-1/2" />
            <!-- 右下角箭头：白色、指向右（原图 20×38）。放在 project-name 之前，
                 长项目名与箭头重叠时名称压在上层。pointer-events-none 让点击照常落到 .unit 上 -->
            <img src="/whatwedo/arrow.webp" class="arrow scale-[0.8]" alt="" />
            <div class="project-name">{{ unit.name }}</div>
          </div>
        </div>
      </div>
      <div
        class="show-project bg-cover aspect-square absolute w-[372.8px] left-[3%] bottom-[15%] translate-x-[-15%] translate-y-[35%]">
        <img src="/whatwedo/项目展示.webp" class="absolute scale-[0.5] top-[17%]">
        <img src="/whatwedo/SHOWREEL.webp" class="absolute scale-[0.5] top-[35%] left-[5%]">
      </div>
      <img src="/whatwedo/bottom.webp" class="fixed bottom-[-158.44px] left-[4%] scale-[0.4]">
    </DesignStage>
  </div>
</template>

<style scoped>
/* 单元整体缩放比例：改这个值调整整个走马灯的大小 */
.project-bar {
  --unit-scale: 0.5;
}

.show-project {
  background-image: url('../../public/whatwedo/earth.webp');
  /* 左下角果冻弹出：从屏外左下角弹跳入场，落到位后压扁/拉伸往复晃动，像果冻一样收敛 */
  animation: jellyPop 1.4s ease-out 0.35s both;
}

@keyframes jellyPop {
  0% {
    transform: translate(-75%, 280%) scale(0.4, 0.45) rotate(-6deg);
    opacity: 0;
  }

  30% {
    transform: translate(-5%, 45%) scale(0.92, 1.18) rotate(1deg);
    /* 上升途中纵向拉伸 */
    opacity: 1;
  }

  45% {
    transform: translate(-19%, 26%) scale(1.1, 0.86) rotate(3deg);
    /* 冲过头 → 落点压扁 */
  }

  60% {
    transform: translate(-11%, 44%) scale(0.94, 1.1) rotate(-2deg);
    /* 回弹过头 → 再拉伸 */
  }

  75% {
    transform: translate(-16%, 33%) scale(1.05, 0.95) rotate(1deg);
  }

  88% {
    transform: translate(-14%, 36%) scale(0.99, 1.01) rotate(0deg);
  }

  100% {
    transform: translate(-15%, 35%) scale(1, 1) rotate(0deg);
  }
}

/* 外框：代码绘制 —— 圆角 + 白色外边界（稍粗）+ #033B37 内边界 + 右下外阴影 */
.unit {
  background: #fff;
  border: calc(9px * var(--unit-scale)) solid #fff;
  border-radius: calc(64px * var(--unit-scale));
  box-shadow:
    inset 0 0 0 calc(2px * var(--unit-scale)) #033b37,
    calc(8px * var(--unit-scale)) calc(12px * var(--unit-scale)) calc(16px * var(--unit-scale)) rgba(3, 59, 55, 0.22);
}

/* 卡片（pj 原图 706×450），居中放进外框，四周留 20px 边框 */
.card {
  width: calc(716px * var(--unit-scale));
  height: calc(460px * var(--unit-scale));
}

/* 底部内阴影（project-innershadow 原图 1278×490），贴底居中，超出部分被外框裁掉 */
.shadow {
  width: calc(1278px * var(--unit-scale));
  height: calc(490px * var(--unit-scale));
}

/* 卡片右下角箭头：提示「可点进去看」。
   原图 20×38、白色指向右，故宽:高恒为 20:38 —— 只给 height，width: auto 由图片固有比例决定。
   尺寸与 inset 都乘 --unit-scale，和 .card / .project-name 同一基准，改 --unit-scale 时箭头同步缩放；
   想单独调箭头大小改 --arrow-h（设计 px）即可。 */
.arrow {
  --arrow-h: 44px;
  right: calc(24px * var(--unit-scale));
  bottom: calc(24px * var(--unit-scale));
  position: absolute;
  height: calc(var(--arrow-h) * var(--unit-scale));
  width: auto;
  pointer-events: none;
}

/* 卡片底部项目名称：白色、贴底、超长省略，底部渐隐底衬保证可读性 */
.project-name {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: calc(8px * var(--unit-scale)) 12px;
  color: #fff;
  font-weight: 600;
  font-size: calc(28px * var(--unit-scale));
  letter-spacing: 0.02em;
  pointer-events: none;
}

.marquee {
  display: flex;
  width: max-content;
  will-change: transform;
}

/* 第一行整体左移（0 → -50%），第二行整体右移（-50% → 0） */
.marquee-left {
  animation: marqueeLeft 40s linear infinite;
}

.marquee-right {
  animation: marqueeRight 40s linear infinite;
}

/* 悬停暂停，方便查看细节 */
.marquee:hover {
  animation-play-state: paused;
}

@keyframes marqueeLeft {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

@keyframes marqueeRight {
  from {
    transform: translateX(-50%);
  }

  to {
    transform: translateX(0);
  }
}
</style>
