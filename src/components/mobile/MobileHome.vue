<script setup>
// 移动端 · 首页区块：HTML 标题替代图片内文字（title.webp 仅作品牌贴纸装饰）
const slogan = '探索技术边界，创造互联网价值；技术连接教育，实践创造未来'
const tags = ['产品探索', '技术实践', 'AI创新', '数字教育']
</script>

<template>
  <section id="home" class="min-h-[100svh] flex flex-col items-center justify-center px-5 py-14 box-border"
    style="background: linear-gradient(180deg, #e4f3ec 0%, #fafafa 55%, #e2f5f0 100%)">
    <!-- 品牌贴纸：原图即标题视觉，缩小后仅作装饰 -->
    <img src="/index/title.webp" alt="重庆邮电大学工作室 CQUPTHUB" class="w-full max-w-[420px] h-auto rounded-3xl" />

    <!-- HTML 标语：手机端可读、可选中 -->
    <p class="mt-6 text-center text-[15px] leading-relaxed font-medium text-[#033B37]">
      {{ slogan }}
    </p>

    <!-- 标签行 -->
    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <span v-for="t in tags" :key="t"
        class="rounded-full border border-[#0A665F]/40 bg-white px-3 py-1 text-[13px] text-[#0A665F]">
        {{ t }}
      </span>
    </div>

    <!-- 吉祥物插画：装饰性图片原样复用 -->
    <img src="/index/girl.webp" alt="HUB 吉祥物" class="mt-8 w-40 h-auto drop-shadow-md" />

    <!-- 进入 CTA：滚动到「关于我们」区块（不走路由，避免 hash 冲突） -->
    <button type="button"
      class="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#0A665F] px-8 text-[15px] font-semibold text-white shadow-md active:scale-95 transition-transform"
      @click="document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
      进入官网
    </button>
  </section>
</template>
