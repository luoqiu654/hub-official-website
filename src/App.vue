<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import gsap from 'gsap'
import { isMobile } from './composables/useIsMobile'
import MobileShell from './components/mobile/MobileShell.vue'

const route = useRoute()

// 滚动翻页顺序：数值越大越靠下。用于判断「前进(向下翻页，内容向上滑)」还是「后退(向上翻页，内容向下滑)」
const PAGE_ORDER = {
  home: 0, aboutus: 1, aboutus2: 2, whatwedo: 3, whatwedo2: 4,
  grow: 5, 'grow-community': 6, 'grow-service': 7, destination: 8, contact: 9,
}
const idx = (name) => (name in PAGE_ORDER ? PAGE_ORDER[name] : 999)

// 记录本次跳转方向：目标页在序列中的序号 小于 来源页 → 后退（向下翻页）
const dir = ref('forward')
// 记录当前正在离开的页名：用于给首页等做与全局不同的专属退出动画
// （路由先变、Transition 再触发 leave，故用 watch 的 from 提前捕获来源页）
const leavingName = ref(null)
watch(
  () => route.name,
  (to, from) => {
    leavingName.value = from ?? null
    dir.value = idx(to) >= idx(from) ? 'forward' : 'back'
  }
)

// —— 弧形翻页：页面沿一条「上抛」的弧线滑动，而非直上直下 ——
// 前进（向下滚，内容向上滑）：新页从屏幕底部沿弧线升起，旧页沿弧线升出屏顶。
// 后退（向上滚，内容向下滑）：方向镜像。
// 弧线 = 竖向位移 + 横向中途鼓出（抛物线）× 外倾（rotation），在整段动画中作为整体关键帧同时推进，
// xPercent / rotation 都在中途达到峰值再回落，这样曲线才真正「弯」得起来，肉眼一眼可辨。
const DUR = 0.9
// 前进入场：从屏底(100%)升起；BACK 后进入场：从屏顶(-100%)落下
const FWD = { y0: 100, yMid: 50, yEnd: 0, rot0: 5, rotMid: 10, rotEnd: 0 }
const BACK = { y0: -100, yMid: -50, yEnd: 0, rot0: -5, rotMid: -10, rotEnd: 0 }
// 横向鼓出量（%）：前进向左鼓(-)，后退向右鼓(+)。鼓出方向与页面「绕屏幕中心上抛」的旋向一致。
const BULGE_X = 9

// 统一处理页面内 bg-light 光晕的淡入/淡出：让所有带光晕的页面行为一致。
// 进场：弧形过渡期间光晕保持透明(避免大面积光晕随页面位移造成"全屏闪烁")，
//        等翻页落定(0.9s)后才浮现 —— 即 what-we-do2 的淡入方式。
// 出场：光晕随页面滑出的同时淡出。先进场、后出场，符合"后进先出"的翻页时序。
function fadeBgLight(pageEl, mode) {
  pageEl?.querySelectorAll('.bg-light').forEach((glow) => {
    if (mode === 'enter') {
      const target = Number(getComputedStyle(glow).opacity) || 1 // 尊重 opacity-85 等原地层的设定
      gsap.set(glow, { opacity: 0 })
      gsap.to(glow, { opacity: target, duration: 0.6, ease: 'power1.out', delay: DUR })
    } else {
      // 出场：若快速连续翻页使淡入尚未完成，先清掉再淡出，避免两次目标叠加
      gsap.killTweensOf(glow)
      gsap.to(glow, { opacity: 0, duration: 0.5, ease: 'power1.inOut' })
    }
  })
}

// 入场：新页沿弧线滑入 + 淡入（透明度随弧线同步）
function onEnter(el, done) {
  fadeBgLight(el, 'enter')
  // 首页（home）专属进入：纯垂直下移进屏。首页在最顶层，进入恒为「后退」方向
  // （从 aboutus 上滑回来），故从屏顶(-100%)向下落到原位 —— 与 aboutus 下移出屏一上一下填满屏幕，
  // 不做横向鼓出、外倾，保持直线滑动。
  if (route.name === 'home') {
    gsap.set(el, { yPercent: -100, xPercent: 0, rotation: 0, opacity: 1 })
    gsap.to(el, {
      yPercent: 0, duration: DUR, ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(el, { clearProps: 'transform,opacity' })
        done()
      },
    })
    return
  }
  const P = dir.value === 'back' ? BACK : FWD
  const mid = {
    yPercent: P.yMid, xPercent: dir.value === 'back' ? BULGE_X : -BULGE_X, rotation: P.rotMid, opacity: 0.6,
  }
  gsap.set(el, { yPercent: P.y0, xPercent: 0, rotation: P.rot0, opacity: 0 })
  const tl = gsap.timeline({
    onComplete: () => {
      // 去除 GSAP 留下的内联 transform/opacity：若非 none，会让本页变成其
      // position:fixed 子元素的包含块（fixed 元素改为相对本页而非视口定位）。
      // grow 等页根是 aspect-square（比视口高），fixed 元素会因此错位。
      gsap.set(el, { clearProps: 'transform,opacity' })
      done()
    },
  })
  tl.to(el, {
    keyframes: [
      { yPercent: P.y0, xPercent: 0, rotation: P.rot0, opacity: 0 },
      mid,
      { yPercent: P.yEnd, xPercent: 0, rotation: P.rotEnd, opacity: 1 },
    ],
    duration: DUR, ease: 'power2.inOut',
  }, 0)
}

// 出场：旧页沿弧线滑出，只滑不淡出 —— 让首页底部下拉箭头全程保持白色，且被首页 overflow-hidden 裁剪
function onLeave(el, done) {
  fadeBgLight(el, 'leave')
  // 首页（home）专属退出：纯垂直上移出屏顶，不做横向鼓出、外倾 —— 内容直线滑动，
  // 底部下拉箭头随首页一起被 overflow-hidden 裁掉（保持白色）。
  if (leavingName.value === 'home') {
    gsap.set(el, { yPercent: 0, xPercent: 0, rotation: 0 })
    gsap.to(el, {
      yPercent: dir.value === 'back' ? 100 : -100,
      duration: DUR, ease: 'power2.in',
      onComplete: () => {
        gsap.set(el, { clearProps: 'transform,opacity' })
        done()
      },
    })
    return
  }
  // 出场方向 = 入场相反：前进时旧页升出屏顶(-100%)，后退时旧页沉下屏底(+100%)
  const yEnd = dir.value === 'back' ? 100 : -100
  const yMid = dir.value === 'back' ? 50 : -50
  const rotEnd = dir.value === 'back' ? 5 : -5
  const rotMid = dir.value === 'back' ? 10 : -10
  const mid = {
    yPercent: yMid, xPercent: dir.value === 'back' ? -BULGE_X : BULGE_X, rotation: rotMid,
  }
  gsap.set(el, { yPercent: 0, xPercent: 0, rotation: 0 })
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(el, { clearProps: 'transform,opacity' })
      done()
    },
  })
  tl.to(el, {
    keyframes: [
      { yPercent: 0, xPercent: 0, rotation: 0 },
      mid,
      { yPercent: yEnd, xPercent: 0, rotation: rotEnd },
    ],
    duration: DUR, ease: 'power2.in',
  }, 0)
}
</script>

<template>
  <!-- 双轨渲染：移动端（手机 + 平板大类）走独立长页 MobileShell；桌面保持原有 deck 零改动 -->
  <MobileShell v-if="isMobile" />
  <!-- 同屏容器：让多页绝对定位叠放，向上「翻页」不撑出滚动条 -->
  <div v-else class="relative h-screen w-screen overflow-hidden">
    <router-view v-slot="{ Component }">
      <transition :css="false" @enter="onEnter" @leave="onLeave">
        <!-- 用真实 <div> 包装层承载 key：每个顶层页面有独立容器节点，进/离动画各作用在不同节点上，
             避免 Vue 过渡复用同一元素，导致「进入的首页元素被套上离场页的下移动画(0→+100)再弹回」。
             key 取顶层匹配路径 route.matched[0].path：这样 grow 下的子路由(如 /grow/community、/grow/service)
             都归到顶层 /grow，彼此切换时不重挂 Grow、不重播其 bg 入场动画；转到其它顶层页才触发整页过渡。 -->
        <div :key="route.matched[0]?.path" class="absolute inset-0">
          <component :is="Component" />
        </div>
      </transition>
    </router-view>
  </div>
</template>
