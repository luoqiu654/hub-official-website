<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { publicUrl } from '../../composables/publicUrl'
import { mountReveal, killReveal } from '../../composables/useMobileReveal'
import peopleData from '../../views/destination/data.json'

/* ============================================================
 * 【调试路径】成员去向 连续拖拽 & 惯性参数
 *   DISC_TILT          圆盘倾斜角度（deg）
 *   DRAG_SENSITIVITY   拖拽灵敏度：每 px 位移对应多少个槽位
 *   INERTIA_FACTOR     惯性系数：松手速度 × 此值 = 额外滑行槽位
 *   MAX_INERTIA        最大惯性滑行槽位数
 *   SNAP_DURATION      松手后吸附到整数的动画时长（s）
 *   ARC_START/END      弧线起止角，控制弧线弯曲度
 * ============================================================ */
const DISC_TILT = 0            // 水平圆弧，不倾斜
const DRAG_SENSITIVITY = 0.006
const INERTIA_FACTOR = 0.08
const MAX_INERTIA = 3
const SNAP_DURATION = 0.5

const sectionRef = ref(null)
let revealTween = null

const people = peopleData.map((p) => ({ ...p, logo: publicUrl(p.logo) }))
const N = people.length

// ===== 弧线轮播参数 =====
const ARC_START = -114
const ARC_END = -54
const SLOTS = 5
const STEP = (ARC_END - ARC_START) / SLOTS
const MID = (SLOTS - 1) / 2
const CX = 50
const CY = 155
const R = 80

// 连续显示索引（浮点数）：拖拽时直接修改，松手后动画吸附到整数
const displayIndex = ref(0)
const currentIndex = computed(() => {
  const v = Math.round(displayIndex.value)
  return ((v % N) + N) % N
})
const isDragging = ref(false)

const arcPoint = (deg) => {
  const a = (deg * Math.PI) / 180
  return { left: CX + R * Math.cos(a), top: CY + R * Math.sin(a) }
}

// 基于连续 displayIndex 计算每张卡的位置（slot 为浮点数，实现平滑拖拽）
const arcCards = computed(() => {
  return people.map((p, i) => {
    let slot = i - displayIndex.value
    // 循环修正：取最短路径
    if (slot > N / 2) slot -= N
    if (slot < -N / 2) slot += N
    const angle = ARC_START + (slot + MID) * STEP
    const { left, top } = arcPoint(angle)
    const absSlot = Math.abs(slot)
    const visible = slot >= -MID - 0.5 && slot <= MID + 0.5
    const feat = absSlot < 0.5
    // 连续缩放/透明度：基于 slot 绝对值平滑过渡
    const scale = Math.max(0.35, 1 - absSlot * 0.22)
    const opacity = Math.max(0, 1 - absSlot * 0.32)
    const zIndex = feat ? 10 : Math.round(10 - absSlot * 3)
    return { ...p, index: i, slot, left, top, scale, opacity, zIndex, visible, feat }
  })
})

const featured = computed(() => people[currentIndex.value] || people[0])

// ===== 连续拖拽核心 =====
let dragStartX = 0
let dragStartIndex = 0
let lastX = 0
let lastT = 0
let velocity = 0
let snapTween = null

const onTouchStart = (e) => {
  if (snapTween) { snapTween.kill(); snapTween = null }
  // 拖拽前归一化，避免 displayIndex 累积过大导致循环修正失效
  displayIndex.value = ((displayIndex.value % N) + N) % N
  isDragging.value = true
  dragStartX = e.touches[0].clientX
  dragStartIndex = displayIndex.value
  lastX = dragStartX
  lastT = Date.now()
  velocity = 0
}
const onTouchMove = (e) => {
  if (!isDragging.value) return
  const x = e.touches[0].clientX
  const now = Date.now()
  const dt = now - lastT
  if (dt > 0) velocity = (x - lastX) / dt  // px/ms
  lastX = x
  lastT = now
  // 右滑→index 减小（上一个），左滑→index 增大（下一个）
  displayIndex.value = dragStartIndex - (x - dragStartX) * DRAG_SENSITIVITY
}
const onTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  // 惯性目标 = 当前位置 + 速度 × 惯性系数（限制最大惯性）
  const inertia = Math.max(-MAX_INERTIA, Math.min(MAX_INERTIA, -velocity * INERTIA_FACTOR * 10))
  const target = Math.round(displayIndex.value + inertia)
  snapTween = gsap.to(displayIndex, {
    value: target,
    duration: SNAP_DURATION,
    ease: 'power3.out',
    onComplete: () => {
      // 吸附完成后归一化到 [0,N)，防止多圈滑动后循环修正失效
      displayIndex.value = ((displayIndex.value % N) + N) % N
      snapTween = null
    },
  })
}

// 箭头/点击切换：动画到目标索引
const goTo = (target) => {
  if (snapTween) snapTween.kill()
  // 找最短路径
  let delta = target - displayIndex.value
  if (delta > N / 2) delta -= N
  if (delta < -N / 2) delta += N
  snapTween = gsap.to(displayIndex, {
    value: displayIndex.value + delta,
    duration: 0.4,
    ease: 'power2.out',
    onComplete: () => {
      displayIndex.value = ((displayIndex.value % N) + N) % N
      snapTween = null
    },
  })
}
const goPrev = () => goTo(Math.round(displayIndex.value) - 1)
const goNext = () => goTo(Math.round(displayIndex.value) + 1)

onMounted(() => {
  revealTween = mountReveal(sectionRef.value)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced) {
    gsap.fromTo('.m-rocket',
      { x: '-50vw', y: '20vh', rotation: -30, opacity: 0 },
      { x: 0, y: 0, rotation: 0, opacity: 0.85, duration: 1.6, ease: 'power2.out', delay: 0.4 }
    )
    gsap.to('.m-rocket', {
      y: -8, rotation: 3, duration: 2.0, ease: 'sine.inOut',
      yoyo: true, repeat: -1, delay: 2.0,
    })
  }
})

onUnmounted(() => {
  killReveal(revealTween)
  if (snapTween) snapTween.kill()
  gsap.killTweensOf('.m-rocket')
})
</script>

<template>
  <section id="destinations" ref="sectionRef" class="px-0 py-14 box-border overflow-hidden" style="background: linear-gradient(180deg, #eaf5f0 0%, #fafafa 100%)">
    <div class="reveal mb-4 px-5 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">成员去向</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">DESTINATIONS</p>
    </div>

    <!-- 倾斜舞台：整体 rotate，成员卡 counter-rotate 保持正立 -->
    <div class="disc-wrap relative mx-auto mt-2 w-full max-w-[440px] select-none"
      :style="{ transform: `rotate(${DISC_TILT}deg)` }">

      <div class="arc-stage relative h-[300px] w-full overflow-visible touch-pan-y"
        @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">

        <!-- 地球背景（弧线后方） -->
        <img src="/destination/earth.webp" alt=""
          class="pointer-events-none absolute left-1/2 top-[62%] h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 opacity-20" />

        <!-- 成员卡：沿弧线连续定位 -->
        <div v-for="c in arcCards" :key="c.name"
          class="arc-card absolute"
          :class="{ 'arc-card-featured': c.feat }"
          :style="{
            left: c.left + '%',
            top: c.top + '%',
            transform: `translate(-50%, -50%) scale(${c.scale}) rotate(${-DISC_TILT}deg)`,
            opacity: c.opacity,
            zIndex: c.zIndex,
            pointerEvents: c.visible ? 'auto' : 'none',
          }"
          @click="c.feat ? null : goTo(c.index)">
          <div class="flex flex-col items-center">
            <div class="relative h-14 w-14 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
              <img :src="c.logo" :alt="c.company" class="h-8 w-8 object-contain" loading="lazy" />
              <span v-if="c.note" class="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#52C41A] px-1.5 py-0.5 text-[9px] font-bold text-white">
                {{ c.note }}
              </span>
            </div>
            <p class="mt-1.5 whitespace-nowrap text-[13px] font-bold" :class="c.feat ? 'text-[#033B37]' : 'text-[#0A665F]'">
              {{ c.name }}
            </p>
            <p class="whitespace-nowrap text-[10px] text-[#6B7280]">{{ c.grade }} · {{ c.position }}</p>
          </div>
        </div>

        <!-- 左右箭头 -->
        <button type="button" class="arc-arrow left" aria-label="上一个" @click="goPrev">‹</button>
        <button type="button" class="arc-arrow right" aria-label="下一个" @click="goNext">›</button>

        <!-- 火箭装饰 -->
        <img src="/destination/rocket.webp" alt=""
          class="m-rocket pointer-events-none absolute -right-1 top-2 h-14 w-auto"
          :style="{ transform: `rotate(${-DISC_TILT}deg)` }" />
      </div>
    </div>

    <!-- 高亮成员详情卡（不随圆盘倾斜） -->
    <div class="reveal mx-auto mt-5 w-full max-w-[360px] px-5">
      <div class="rounded-2xl border-[3px] border-white bg-white/95 p-5 shadow-lg ring-1 ring-[#033B37]/20">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF5F0]">
            <img :src="featured.logo" :alt="featured.company" class="h-7 w-7 object-contain" />
          </div>
          <div class="min-w-0">
            <h3 class="text-[18px] font-bold text-[#033B37]">{{ featured.name }}</h3>
            <p class="text-[12px] text-[#6B7280]">{{ featured.grade }} · {{ featured.studioRole }}</p>
          </div>
          <span v-if="featured.note" class="ml-auto shrink-0 rounded-full bg-[#52C41A]/15 px-2.5 py-1 text-[11px] font-bold text-[#389E0D]">
            {{ featured.note }}
          </span>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-[#F4F9F7] p-3">
            <p class="text-[11px] text-[#6B7280]">去向</p>
            <p class="mt-0.5 text-[14px] font-semibold text-[#033B37]">{{ featured.company }}</p>
          </div>
          <div class="rounded-xl bg-[#F4F9F7] p-3">
            <p class="text-[11px] text-[#6B7280]">岗位</p>
            <p class="mt-0.5 text-[14px] font-semibold text-[#033B37]">{{ featured.position }}</p>
          </div>
          <div class="rounded-xl bg-[#F4F9F7] p-3">
            <p class="text-[11px] text-[#6B7280]">Base 地</p>
            <p class="mt-0.5 text-[14px] font-semibold text-[#033B37]">{{ featured.base }}</p>
          </div>
          <div class="rounded-xl bg-[#F4F9F7] p-3">
            <p class="text-[11px] text-[#6B7280]">工作室职位</p>
            <p class="mt-0.5 text-[14px] font-semibold text-[#033B37]">{{ featured.studioRole }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 指示器 -->
    <div class="mt-4 flex justify-center gap-1.5">
      <span v-for="(_, i) in people" :key="i"
        class="dest-dot h-1.5 rounded-full transition-all duration-300"
        :class="i === currentIndex ? 'w-5 bg-[#0A665F]' : 'w-1.5 bg-[#0A665F]/30'"></span>
    </div>
  </section>
</template>

<style scoped>
.arc-card {
  transition: opacity 0.15s ease;
  will-change: left, top, transform, opacity;
}
.arc-arrow {
  position: absolute;
  top: 45%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(10, 102, 95, 0.3);
  background: rgba(255, 255, 255, 0.9);
  color: #0A665F;
  font-size: 22px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  line-height: 1;
  padding: 0;
}
.arc-arrow.left { left: 8px; }
.arc-arrow.right { right: 8px; }
.arc-arrow:active { transform: translateY(-50%) scale(0.9); }
</style>
