<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { publicUrl } from '../../composables/publicUrl'
import { mountReveal, killReveal } from '../../composables/useMobileReveal'
import peopleData from '../../views/destination/data.json'

const sectionRef = ref(null)
let revealTween = null

// 与桌面 destination 同源数据
const people = peopleData.map((p) => ({ ...p, logo: publicUrl(p.logo) }))
const N = people.length

// ===== 弧线轮播参数（移动端适配版：向上凸的横向弧线）=====
const ARC_START = -114  // 弧线起始角(deg)
const ARC_END = -54     // 弧线结束角(deg)
const SLOTS = 5         // 同时显示的槽位数
const STEP = (ARC_END - ARC_START) / SLOTS  // 相邻槽位角度步长 = 12°
const MID = (SLOTS - 1) / 2  // 中间槽位索引 = 2，对应角度 -90°（弧线最高点）
const CX = 50           // 圆心 X(%)
const CY = 155          // 圆心 Y(%) —— 圆心在容器下方，形成向上凸的弧线
const R = 80            // 半径(%) 相对容器宽度

const currentIndex = ref(0)  // 当前高亮成员索引
const animAngle = { v: 0 }   // GSAP 动画代理值（平滑追赶）
let angleTween = null

// 弧线上某角度 → 百分比坐标
const arcPoint = (deg) => {
  const a = (deg * Math.PI) / 180
  return {
    left: CX + R * Math.cos(a),
    top: CY + R * Math.sin(a),
  }
}

// 每个成员的显示状态：角度、位置、缩放、透明度
const arcCards = computed(() => {
  return people.map((p, i) => {
    // 相对当前高亮的槽位偏移，处理循环（N=7 时 i=6,current=0 → slot=-1）
    let slot = i - currentIndex.value
    if (slot > N / 2) slot -= N
    if (slot < -N / 2) slot += N
    const angle = ARC_START + (slot + MID) * STEP
    const { left, top } = arcPoint(angle)
    const visible = slot >= -MID && slot <= MID
    const feat = slot === 0
    const near = Math.abs(slot) === 1
    const end = Math.abs(slot) === 2
    const scale = feat ? 1 : near ? 0.75 : end ? 0.55 : 0.4
    const opacity = feat ? 1 : near ? 0.6 : end ? 0.3 : 0
    const zIndex = feat ? 10 : near ? 5 : 1
    return { ...p, index: i, slot, left, top, scale, opacity, zIndex, visible, feat }
  })
})

// 高亮成员
const featured = computed(() => people[currentIndex.value] || people[0])

// 切换
const stepBy = (delta) => {
  const next = (currentIndex.value + delta + N) % N
  currentIndex.value = next
  // 平滑动画：用 GSAP 驱动一个代理值，实际位置由 computed 响应式更新
  // 这里直接靠 Vue 响应式 + CSS transition 实现平滑
}
const goPrev = () => stepBy(-1)
const goNext = () => stepBy(1)

// 触摸滑动
let touchStartX = 0
const onTouchStart = (e) => { touchStartX = e.touches[0].clientX }
const onTouchEnd = (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) > 40) stepBy(dx > 0 ? -1 : 1)
}

onMounted(() => {
  revealTween = mountReveal(sectionRef.value)
  // 火箭装饰：从底部飞出（复刻桌面 destination 火箭入场）
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced) {
    gsap.fromTo('.m-rocket',
      { x: '-60vw', y: '30vh', rotation: -20 },
      { x: 0, y: 0, rotation: 0, duration: 1.8, ease: 'power2.out', delay: 0.3 }
    )
    // 火箭到位后轻微晃动
    gsap.to('.m-rocket', {
      y: -6, rotation: 2, duration: 1.5, ease: 'sine.inOut',
      yoyo: true, repeat: -1, delay: 2.1,
    })
  }
})

onUnmounted(() => {
  killReveal(revealTween)
  if (angleTween) angleTween.kill()
  gsap.killTweensOf('.m-rocket')
})
</script>

<template>
  <section id="destinations" ref="sectionRef" class="px-0 py-14 box-border overflow-hidden" style="background: linear-gradient(180deg, #eaf5f0 0%, #fafafa 100%)">
    <div class="reveal mb-4 px-5 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">成员去向</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">DESTINATIONS</p>
    </div>

    <!-- ===== 弧线轮播：复刻桌面 destination 弧线效果 ===== -->
    <div class="arc-stage relative mx-auto mt-2 h-[300px] w-full max-w-[420px] select-none overflow-visible"
      @touchstart="onTouchStart" @touchend="onTouchEnd">

      <!-- 地球背景装饰（弧线后方） -->
      <img src="/destination/earth.webp" alt=""
        class="pointer-events-none absolute left-1/2 top-[62%] h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 opacity-25" />

      <!-- 成员卡：沿弧线绝对定位 -->
      <div v-for="c in arcCards" :key="c.name"
        class="arc-card absolute"
        :style="{
          left: c.left + '%',
          top: c.top + '%',
          transform: `translate(-50%, -50%) scale(${c.scale})`,
          opacity: c.opacity,
          zIndex: c.zIndex,
          pointerEvents: c.visible ? 'auto' : 'none',
        }"
        @click="c.feat ? null : stepBy(c.slot > 0 ? 1 : -1)">
        <div class="flex flex-col items-center">
          <!-- 公司 logo -->
          <div class="relative h-14 w-14 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
            <img :src="c.logo" :alt="c.company" class="h-8 w-8 object-contain" loading="lazy" />
            <span v-if="c.note" class="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#52C41A] px-1.5 py-0.5 text-[9px] font-bold text-white">
              {{ c.note }}
            </span>
          </div>
          <!-- 名字 -->
          <p class="mt-1.5 whitespace-nowrap text-[13px] font-bold" :class="c.feat ? 'text-[#033B37]' : 'text-[#0A665F]'">
            {{ c.name }}
          </p>
          <p class="whitespace-nowrap text-[10px] text-[#6B7280]">{{ c.grade }} · {{ c.position }}</p>
        </div>
      </div>

      <!-- 左右切换箭头 -->
      <button type="button" class="arc-arrow left" aria-label="上一个" @click="goPrev">‹</button>
      <button type="button" class="arc-arrow right" aria-label="下一个" @click="goNext">›</button>

      <!-- 火箭装饰 -->
      <img src="/destination/rocket.webp" alt=""
        class="m-rocket pointer-events-none absolute -right-2 top-4 h-16 w-auto opacity-80" />
    </div>

    <!-- ===== 高亮成员详情卡 ===== -->
    <div class="reveal mx-auto mt-4 w-full max-w-[360px] px-5">
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

    <!-- 槽位指示器 -->
    <div class="mt-4 flex justify-center gap-1.5">
      <span v-for="(_, i) in people" :key="i"
        class="dest-dot h-1.5 rounded-full transition-all duration-300"
        :class="i === currentIndex ? 'w-5 bg-[#0A665F]' : 'w-1.5 bg-[#0A665F]/30'"></span>
    </div>
  </section>
</template>

<style scoped>
/* 弧线轮播卡片：CSS transition 实现平滑滑动 */
.arc-card {
  transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.4s ease;
  will-change: left, top, transform, opacity;
}

/* 切换箭头 */
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
