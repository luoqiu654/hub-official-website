<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { tryAcquireFlip } from '../composables/useFlipLock'
import { publicUrl } from '../composables/publicUrl'
import DesignStage from '../components/DesignStage.vue'

// 三张特性卡片（图片内已含卡片边框 + 标题 + 插画）
// 字符串形式写在 <script> 里，Vite 不会改写，需显式走 publicUrl 以适配子目录部署
const features = [
  publicUrl('/aboutus/feature1.webp'),
  publicUrl('/aboutus/feature2.webp'),
  publicUrl('/aboutus/feature3.webp'),
]

const router = useRouter()

// 向下滚动：翻页进入 about-us2（不再移动 bg-light，由 App.vue 的弧形过渡接管）
// 向上滚动：整页淡出，返回首页
let sliding = false
function onWheel(e) {
  if (sliding || !e.deltaY) return
  // 全局翻页锁：单次滚动的动量会被后续新挂载的页面接连捕获，这里在过渡期间拒绝再次翻页
  if (!tryAcquireFlip()) return
  sliding = true
  if (e.deltaY > 0) {
    router.push('/aboutus2')
  } else {
    // 先移除入场动画的 fill 效果（否则会覆盖 gsap 的 opacity），再让整页淡出
    const root = document.querySelector('.fade-in')
    if (root) root.style.animation = 'none'
    gsap.to(root, {
      opacity: 0,
      duration: 0.6,
      ease: 'power1.inOut',
      onComplete: () => router.push('/'),
    })
  }
}

onMounted(() => window.addEventListener('wheel', onWheel, { passive: true }))
onUnmounted(() => window.removeEventListener('wheel', onWheel))
</script>

<template>
  <!-- 顶部近白的基底背景 -->
  <div class="fade-in relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#fafafa]">
    <!-- 设计舞台：画幅 2880×2048（原生构图，与首页一致）。舞台成为 %/fixed 元素的包含块，
         内部按设计坐标定位并整体等比缩放；cqw 已换算为设计 px（2880 宽 → 1cqw=28.8px）。
         渐变铺底放 #bg 槽（舞台外、铺满真实视口，不随舞台缩放）→ 缩放下无留白边条。 -->
    <DesignStage :design-w="2880" :design-h="2048">
      <template #bg>
        <!-- 基础纵向渐变：白 → 浅薄荷，铺满真实视口 -->
        <div
          class="absolute inset-0 w-full"
          style="background: linear-gradient(180deg, #fafafa 0%, #fafafa 34%, #f2f7f5 62%, #e2f5f0 100%)"
        ></div>
      </template>
      <!-- 薄荷渐变光晕：absolute 于设计画布内，翻页时随页面一起移动，不会在切换时突然出现 -->
      <img
        src="/bg-light.webp"
        class="bg-light pointer-events-none absolute left-[-85%] top-[-80%] z-[1] w-[270%] max-w-none opacity-85"
      />
      <!-- 背景淡印 CQUPT HUB -->
      <img
        src="/aboutus/bg-text.webp"
        class="absolute left-1/2 top-1/2 z-[1] w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2"
      />

      <!-- 标题层：黄色圆点垫底，文字叠其上 -->
      <img
        src="/aboutus/earth.webp"
        class="absolute left-1/2 top-[21.6%] z-[5] w-[6.8%] -translate-x-1/2 -translate-y-1/2"
      />
      <!-- 关于我们 -->
      <img
        src="/aboutus/title-zh.webp"
        class="absolute left-[50.26%] top-[16.8%] z-[10] w-[16.7%] -translate-x-1/2 -translate-y-1/2"
      />
      <!-- ABOUT US -->
      <img
        src="/aboutus/title.webp"
        class="absolute left-[50.17%] top-[23%] z-[10] w-[10.07%] -translate-x-1/2 -translate-y-1/2"
      />

      <!-- 引言 -->
      <blockquote
        class="absolute left-1/2 top-[33.8%] z-[10] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[32.5px] font-medium text-[#033B37]"
      >
        <span class="absolute -left-[4.6%] -top-[63.4px] text-[89.3px]">“</span>
        <span class="absolute -right-[4.6%] -top-[63.4px] text-[89.3px]">”</span>
        探索技术边界，创造互联网价值；技术连接教育，实践创造未来
      </blockquote>

      <!-- 三张特性卡片 -->
      <img
        v-for="(src, i) in features"
        :key="src"
        :src="src"
        class="absolute z-[10] w-[23.11%] top-[48.32%] transition-all duration-300 ease-out hover:top-[46.3%]"
        :style="{
          left: `${[11.94, 39.58, 67.22][i]}%`,
        }"
      />

      <!-- 底部标语 -->
      <p
        class="absolute left-1/2 bottom-[3.4%] z-[10] -translate-x-1/2 whitespace-nowrap text-[26.5px] font-medium tracking-wide text-[#2f8a84]"
      >
        产品探索&nbsp;&nbsp;技术实践&nbsp;&nbsp;AI创新&nbsp;&nbsp;数字教育
      </p>
    </DesignStage>
  </div>
</template>

<style scoped>
/* 整页入场淡入已由 App.vue 的弧形过渡统一接管，这里不再单独做 .fade-in 动画 */
</style>
 