<script setup>
import { cardModules } from '../../composables/useProjectAssets'
import { PROJECT_LINKS } from '../../composables/projectLinks'

// ===== 项目卡网格：与桌面 what-we-do 同源（useProjectAssets 扫描同一目录）=====
// 文件名即项目名；往 src/assets/whatwedo 放新图，两端自动同步出现
const projects = Object.entries(cardModules)
  .sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'))
  .map(([file, url]) => {
    const name = file.split('/').pop().replace(/\.webp$/, '')
    return { src: url, name: `${name}项目`, url: PROJECT_LINKS[name] }
  })

// ===== 四个业务方向：与桌面 what-we-do2 同一份内容（此处为移动端副本，改动需两边同步）=====
const directions = [
  {
    title: '数字教材研发',
    content: '聚焦数字教材前端可视化开发，将传统教材内容转化为具有互动体验的数字学习产品。',
    positioning: '工作室核心业务方向',
    items: [
      { name: '矿井火灾防治技术', img: cardModules['../assets/whatwedo/规程小卫士.webp'], url: PROJECT_LINKS['规程小卫士'] },
      { name: 'PLC应用技术教程', img: cardModules['../assets/whatwedo/小矿师的 PLC 接线物语.webp'], url: PROJECT_LINKS['小矿师的 PLC 接线物语'] },
      { name: '点亮未来-创新创业基础', img: cardModules['../assets/whatwedo/chuangxin.webp'], url: PROJECT_LINKS['chuangxin'] },
    ],
  },
  {
    title: '互联网产品研发',
    content: '参与网站、小程序及互联网产品开发，覆盖需求分析、产品设计、开发实现全过程。',
    positioning: '展示工作室产品开发能力',
    items: [
      { name: '法典AI', img: cardModules['../assets/whatwedo/法典.webp'], url: PROJECT_LINKS['法典'] },
      { name: '重庆邮电大学国际学院官网', img: cardModules['../assets/whatwedo/重庆邮电大学国际学院官网.webp'], url: PROJECT_LINKS['重庆邮电大学国际学院官网'] },
      { name: '校园相关互联网项目', img: cardModules['../assets/whatwedo/重庆邮电大学远东联邦大学联合学院官网.webp'], url: PROJECT_LINKS['重庆邮电大学远东联邦大学联合学院官网'] },
    ],
  },
  {
    title: 'AI创新应用',
    content: '探索 AI 技术在产品设计、内容生产和软件开发中的应用，提高产品创新效率。',
    positioning: '体现工作室拥抱 AI 趋势',
    items: ['AI Agent设计', 'AI辅助开发', '智能应用探索'],
  },
  {
    title: '校企合作项目',
    content: '工作室积极参与学校、企业合作项目，将技术能力应用于真实业务场景。',
    positioning: '体现真实项目来源',
    items: ['智荟通科技合作有限公司', '数字教材方向 AI 小型产品研发', '合肥邮创汇公司', '互联网外包项目', '校内教师项目', '校园数字化建设'],
  },
]

// 点击有链接的项目卡：新标签页打开（无 url 的卡不可点）
function openLink(url) {
  if (url) window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <section id="projects" class="px-5 py-14 box-border" style="background: linear-gradient(180deg, #e2f5f0 0%, #fafafa 40%, #fff8e0 100%)">
    <div class="mb-6 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">项目展示</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">WHAT WE DO</p>
    </div>
    <p class="mx-auto max-w-[560px] text-center text-[13px] leading-relaxed text-[#17514b]">
      从教育数字化到互联网产品，我们持续探索技术应用的新可能。
    </p>

    <!-- 项目卡网格：单列 → 宽屏双列（flex-wrap 自动换行） -->
    <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        v-for="p in projects"
        :key="p.src"
        type="button"
        class="group relative overflow-hidden rounded-2xl border-[3px] border-white bg-white text-left shadow-md ring-1 ring-[#033B37]/25 active:scale-[0.98] transition-transform"
        :class="{ 'cursor-pointer': p.url }"
        @click="openLink(p.url)"
      >
        <img :src="p.src" :alt="p.name" class="aspect-[706/450] w-full object-cover" loading="lazy" decoding="async" />
        <span class="block truncate bg-[#033B37]/85 px-3 py-2 text-[13px] font-semibold text-white">{{ p.name }}</span>
        <span v-if="p.url" class="absolute right-2 bottom-9 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#0A665F]">可打开 ↗</span>
      </button>
    </div>

    <!-- 四个业务方向 -->
    <div class="mt-12 space-y-4">
      <article v-for="d in directions" :key="d.title" class="rounded-2xl border-[3px] border-white bg-white/90 p-5 shadow-md ring-1 ring-[#0A665F]/30">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="text-[18px] font-bold text-[#033B37]">{{ d.title }}</h3>
          <span class="shrink-0 rounded-full border border-[#033B37] px-2.5 py-0.5 text-[12px] text-[#033B37]">{{ d.positioning }}</span>
        </div>
        <p class="mt-2 text-[13px] leading-[1.7] text-[#17514b]">{{ d.content }}</p>

        <!-- carousel 方向：具体项目小卡 -->
        <div v-if="Array.isArray(d.items) && d.items[0]?.name" class="mt-4 space-y-3">
          <div v-for="it in d.items" :key="it.name"
            class="flex items-center gap-3 rounded-xl border border-[#0A665F]/20 bg-white p-2"
            :class="{ 'cursor-pointer': it.url }" @click="openLink(it.url)">
            <img :src="it.img" :alt="it.name" class="h-14 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
            <span class="min-w-0 flex-1 text-[13px] font-medium text-[#033B37]">{{ it.name }}</span>
            <span v-if="it.url" class="text-[12px] font-bold text-[#0A665F]">↗</span>
          </div>
        </div>

        <!-- list 方向：纯文字标签 -->
        <ul v-else class="mt-3 flex flex-wrap gap-2">
          <li v-for="it in d.items" :key="it"
            class="rounded-full bg-[#EAF5F0] px-3 py-1.5 text-[12px] font-medium text-[#0A665F]">{{ it }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>
