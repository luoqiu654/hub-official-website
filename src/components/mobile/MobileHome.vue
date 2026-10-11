<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'

// 移动端首页：复刻桌面端 index.vue 的进场动画序列
// bg.webp 铺底（校园插画），bar/star 装饰层从底部弹出，girl 吉祥物弹出，title 品牌贴纸缩放弹出
const slogan = '探索技术边界，创造互联网价值；技术连接教育，实践创造未来'
const tags = ['产品探索', '技术实践', 'AI创新', '数字教育']

const sectionRef = ref(null)
let ctx = null

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  ctx = gsap.context(() => {
    // bar / star：从底部弹出（弹簧），与桌面端 index.vue:48-53 同款
    gsap.from(['.m-bar', '.m-star'], {
      yPercent: 130,
      duration: 0.8,
      ease: 'back.out(1.7)',
      stagger: 0.15,
    })
    // girl：从底部 + 缩小弹出，delay 0.75
    gsap.from('.m-girl', {
      yPercent: 130,
      scale: 0.4,
      duration: 0.9,
      ease: 'back.out(1.7)',
      delay: 0.75,
    })
    // title：从极小缩放弹出，delay 1.7（桌面端同款 back.out(2)）
    gsap.from('.m-title', {
      scale: 0.15,
      duration: 0.7,
      ease: 'back.out(2)',
      delay: 1.7,
      transformOrigin: 'center center',
    })
    // slogan / 标签 / CTA：在 title 之后依次淡入
    gsap.from('.m-fade', {
      opacity: 0,
      y: 24,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.12,
      delay: 2.0,
    })
  }, sectionRef)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <section id="home" ref="sectionRef"
    class="relative min-h-[100svh] overflow-hidden">
    <!-- 铺底背景：桌面同款校园插画，object-cover 填满竖屏 -->
    <img src="/index/bg.webp" alt=""
      class="absolute inset-0 h-full w-full object-cover" />

    <!-- 装饰层：bar / star，pointer-events-none 不拦截点击 -->
    <img src="/index/bar.webp" alt=""
      class="m-bar pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90" />
    <img src="/index/star.webp" alt=""
      class="m-star pointer-events-none absolute inset-0 h-full w-full object-cover" />

    <!-- 内容层：垂直流，title → slogan → 标签 → CTA；girl 浮在右下角 -->
    <div class="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-28 pt-16">
      <!-- 品牌贴纸：缩小后居中，scale 动画 -->
      <img src="/index/title.webp" alt="重庆邮电大学工作室 CQUPTHUB"
        class="m-title w-full max-w-[320px] h-auto drop-shadow-lg" />

      <!-- HTML 标语：可读可选中 -->
      <p class="m-fade mt-5 text-center text-[15px] leading-relaxed font-medium text-[#033B37] drop-shadow-sm">
        {{ slogan }}
      </p>

      <!-- 标签行 -->
      <div class="m-fade mt-4 flex flex-wrap justify-center gap-2">
        <span v-for="t in tags" :key="t"
          class="rounded-full border border-[#0A665F]/40 bg-white/85 px-3 py-1 text-[13px] text-[#0A665F] backdrop-blur-sm">
          {{ t }}
        </span>
      </div>

      <!-- 进入官网 CTA -->
      <button type="button"
        class="m-fade mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#0A665F] px-8 text-[15px] font-semibold text-white shadow-lg active:scale-95 transition-transform"
        @click="document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
        进入官网
      </button>
    </div>

    <!-- 吉祥物：absolute 右下角，从底部弹出 -->
    <img src="/index/girl.webp" alt="HUB 吉祥物"
      class="m-girl pointer-events-none absolute bottom-0 right-0 z-20 w-[42vw] max-w-[200px] h-auto drop-shadow-xl" />
  </section>
</template>
