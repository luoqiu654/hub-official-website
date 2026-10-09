<script setup>
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import gsap from 'gsap'
import { playGrowEntrance, resetGrowScene } from '../../composables/useGrowScene'
import { vw, vh } from '../../composables/useDesignScale'

// ================= 共享场景布局 =================
// bg / bg-hub / 成长体系.png / DEVELOPMENT.png / db-vl / feature 是 grow 下所有子路由
// 共享的场景。入场动画只在首次进入 /grow 时播放一次；
// 子路由切换时场景保持静止（不重播任何动画），只做静默复位。
// 子路由的内容（卡片、火箭、标题、中心轴等）各自负责；滚动交互由 useGrowScene 提供。
const route = useRoute()

// feature.webp 的缩放基准 = grow 参考视口(1707×932)，参考屏恒为 1.0。
// 场景内元素（feature/webp、memberType、卡片）都按这个参考缩放；参考屏不缩小、更小屏才同比缩小。
const GROW_REF_W = 1707
const GROW_REF_H = 932
const growScale = computed(() => Math.min(vw.value / GROW_REF_W, vh.value / GROW_REF_H))

// 子路由切换：场景动画与切换隔离，只静默复位状态 + 复位飞出屏外的元素
watch(() => route.path, () => {
  resetGrowScene()
  // feature 在 grow 下所有子路由都显示（含 service）
  gsap.set('.feature', { opacity: 1 })
})

onMounted(async () => {
  // bg.webp 是百分比 translate（-translate-y-3/4），百分比相对元素自身高度解析。
  // 图片未加载时 <img> 高度为 0，translate 会塌缩成 0 → 入场动画走位且和删掉该 class 一样错位。
  // 因此先等图片解码、拿到真实盒高度，再开始入场动画。
  const bg = document.querySelector('.bg')
  if (bg && !bg.complete) { try { await bg.decode() } catch {} }
  playGrowEntrance()
})

onUnmounted(() => {
  gsap.killTweensOf(['.bg', '.grow-toss-a', '.grow-toss-b', '.feature', '.db-vl'])
})
</script>

<template>
    <div class="grow bg-no-repeat aspect-square">
        <img src="/grow/bg.webp" class="bg -translate-y-3/4">
        <img src="/grow/bg-hub.webp" class="fixed z-0 top-0 -translate-y-1/4 -translate-x-1/8">
        <!-- 成长体系 / DEVELOPMENT：与 feature 同一套做法 —— 外层 wrap 承载 growScale
             （individual scale，GSAP 不碰它），内层 img 保留设计基准缩放 0.5，GSAP 只动内层的 y/rotation。
             两个缩放分属不同元素 → 相乘，而不是互相覆盖：GSAP 一旦在同一个元素上写 transform，
             会把它读到的 translate/scale 折叠进自己的 matrix 再把属性置 none，之后 Vue 再改 scale
             就会被 GSAP 的 transform 盖掉（这正是 feature 要套一层 wrap 的原因）。
             原来写死的 scale-[0.5] 不随视口变化：参考屏 1707×932 下 growScale=1 → 与旧版完全一致，
             更小的屏才同比缩小，不再比卡片 / feature 明显偏大。
             位置（bottom / left / -translate-x-1/2）一并挪到 wrap：wrap 收缩包裹 img，
             盒子与原来 img 的盒子完全重合，缩放绕中心 → 视觉位置与缩放前一致。
             -translate-x-1/2 在这里是 Tailwind v4 的 translate 属性，按规范先于 scale 应用，
             所以水平居中与 growScale 无关（换成 transform: translate 会被 scale 缩放、屏越小越偏右）。
             wrap 必须写 w-max：div 是非替换元素，fixed + left:50% 时会按「可用宽 = 100% − 50%」
             收缩（屏 < 2×图宽时把图压窄，而原来的 img 是替换元素、直接用固有宽不会被压）。 -->
        <div class="grow-toss-a-wrap w-max fixed bottom-[27px] left-1/2 -translate-x-1/2" :style="{ scale: growScale }">
            <img src="/grow/成长体系.webp" class="grow-toss-a scale-[0.5]">
        </div>
        <div class="grow-toss-b-wrap w-max fixed bottom-[-8vh] left-1/2 -translate-x-1/2" :style="{ scale: growScale }">
            <img src="/grow/DEVELOPMENT.webp" class="grow-toss-b scale-[0.5]">
        </div>
        <!-- 子路由内容：grow 主路由（成长体系主体）/ 分路由（飞出后的页面） -->
        <router-view v-slot="{ Component }">
            <component :is="Component" class="absolute inset-0" />
        </router-view>
        <!-- feature.webp 随场景缩放：.feature-wrap 定位于视口 + 承载 growScale（individual scale，GSAP 不动它），
             内层 .feature 只做入场 GSAP transform。二者分属不同元素 → 不叠加成双重缩放。
             参考屏 growScale=1.0 → 与原先 1080 基准值一致不变；更小屏随场景同比缩小 -->
        <div class="feature-wrap fixed top-1/3 right-[-5vw]" :style="{ scale: growScale }">
            <img src="/grow/feature.webp" class="feature">
        </div>
    </div>
</template>
