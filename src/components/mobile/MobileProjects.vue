<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { cardModules } from '../../composables/useProjectAssets'
import { PROJECT_LINKS } from '../../composables/projectLinks'
import { mountReveal, killReveal } from '../../composables/useMobileReveal'

const sectionRef = ref(null)
let revealTween = null
let floatTween = null

// ===== 项目卡：与桌面 what-we-do 同源 =====
const projects = Object.entries(cardModules)
  .sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'))
  .map(([file, url]) => {
    const name = file.split('/').pop().replace(/\.webp$/, '')
    return { src: url, name: `${name}项目`, url: PROJECT_LINKS[name] }
  })

// 两行各一半：第一行向左、第二行向右（与桌面 what-we-do 同款双行走马灯）
const rowSplit = Math.ceil(projects.length / 2)
const rowTop = projects.slice(0, rowSplit)
const rowBottom = projects.slice(rowSplit)
// 渲染 2 遍，translateX(-50%) 推进一半宽度 → 无缝循环
const loop = (arr) => [...arr, ...arr]
const topUnits = loop(rowTop)
const bottomUnits = loop(rowBottom)

// ===== 四个业务方向：与桌面 what-we-do2 同内容 =====
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

// ===== 项目详情模态框 =====
const activeProject = ref(null)
const openProject = (p) => { activeProject.value = p }
const closeProject = () => { activeProject.value = null }
const openLink = (url) => { if (url) window.open(url, '_blank', 'noopener') }

// ===== 方向卡展开/收起（可扩展可选择）=====
const expandedDir = ref(null)
const toggleDir = (i) => { expandedDir.value = expandedDir.value === i ? null : i }
const isCarousel = (items) => Array.isArray(items) && items[0]?.name

onMounted(() => {
  revealTween = mountReveal(sectionRef.value)
  // 方向卡持续上下浮动（复刻桌面 what-we-do2 卡片浮动效果）
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduced && sectionRef.value) {
    const cards = sectionRef.value.querySelectorAll('.dir-card')
    if (cards.length) {
      floatTween = gsap.to(cards, {
        y: -6,
        duration: 1.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.15,
      })
    }
  }
})

onUnmounted(() => {
  killReveal(revealTween)
  if (floatTween) floatTween.kill()
})
</script>

<template>
  <section id="projects" ref="sectionRef" class="px-0 py-14 box-border overflow-hidden" style="background: linear-gradient(180deg, #e2f5f0 0%, #fafafa 40%, #fff8e0 100%)">
    <div class="reveal mb-6 px-5 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">项目展示</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">WHAT WE DO</p>
    </div>
    <p class="mx-auto mb-6 max-w-[560px] px-5 text-center text-[13px] leading-relaxed text-[#17514b]">
      从教育数字化到互联网产品，我们持续探索技术应用的新可能。
    </p>

    <!-- ===== 双行走马灯：复刻桌面 what-we-do 动态流动效果 ===== -->
    <div class="marquee-wrap relative py-3">
      <!-- 第一行：向左无限滚动 -->
      <div class="marquee-track mb-3">
        <div class="marquee-row marquee-left">
          <button v-for="(p, i) in topUnits" :key="'t'+i" type="button"
            class="marquee-card shrink-0" @click="openProject(p)">
            <img :src="p.src" :alt="p.name" class="h-full w-full object-cover" loading="lazy" />
            <span class="marquee-name">{{ p.name }}</span>
          </button>
        </div>
      </div>
      <!-- 第二行：向右无限滚动 -->
      <div class="marquee-track">
        <div class="marquee-row marquee-right">
          <button v-for="(p, i) in bottomUnits" :key="'b'+i" type="button"
            class="marquee-card shrink-0" @click="openProject(p)">
            <img :src="p.src" :alt="p.name" class="h-full w-full object-cover" loading="lazy" />
            <span class="marquee-name">{{ p.name }}</span>
          </button>
        </div>
      </div>
      <!-- 两侧渐隐遮罩 -->
      <div class="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#fafafa] to-transparent"></div>
      <div class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#fafafa] to-transparent"></div>
    </div>

    <!-- ===== 四个业务方向：浮动卡片 + 点击展开 ===== -->
    <div class="mt-10 space-y-4 px-5">
      <article v-for="(d, i) in directions" :key="d.title"
        class="dir-card reveal rounded-2xl border-[3px] border-white bg-white/90 shadow-md ring-1 ring-[#0A665F]/30 overflow-hidden"
        @click="toggleDir(i)">
        <div class="flex items-baseline justify-between gap-2 p-5 pb-3">
          <h3 class="text-[18px] font-bold text-[#033B37]">{{ d.title }}</h3>
          <span class="shrink-0 rounded-full border border-[#033B37] px-2.5 py-0.5 text-[12px] text-[#033B37]">{{ d.positioning }}</span>
        </div>
        <p class="px-5 pb-3 text-[13px] leading-[1.7] text-[#17514b]">{{ d.content }}</p>
        <div class="flex items-center justify-center pb-3 text-[12px] text-[#0A665F]">
          <span>{{ expandedDir === i ? '收起 ▲' : '展开详情 ▼' }}</span>
        </div>
        <!-- 展开内容 -->
        <Transition name="dir-expand">
          <div v-if="expandedDir === i" class="border-t border-[#0A665F]/15 px-5 py-4">
            <template v-if="isCarousel(d.items)">
              <div class="space-y-3">
                <div v-for="it in d.items" :key="it.name"
                  class="flex items-center gap-3 rounded-xl border border-[#0A665F]/20 bg-white p-2"
                  :class="{ 'cursor-pointer': it.url }" @click.stop="openLink(it.url)">
                  <img :src="it.img" :alt="it.name" class="h-14 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <span class="min-w-0 flex-1 text-[13px] font-medium text-[#033B37]">{{ it.name }}</span>
                  <span v-if="it.url" class="text-[12px] font-bold text-[#0A665F]">↗</span>
                </div>
              </div>
            </template>
            <ul v-else class="flex flex-wrap gap-2">
              <li v-for="it in d.items" :key="it"
                class="rounded-full bg-[#EAF5F0] px-3 py-1.5 text-[12px] font-medium text-[#0A665F]">{{ it }}</li>
            </ul>
          </div>
        </Transition>
      </article>
    </div>

    <!-- ===== 项目详情模态框 ===== -->
    <Teleport to="body">
      <Transition name="modal-mask">
        <div v-if="activeProject" class="modal-mask" @click.self="closeProject">
          <div class="modal-box">
            <button class="modal-close" aria-label="关闭" @click="closeProject">✕</button>
            <img :src="activeProject.src" :alt="activeProject.name" class="modal-img" />
            <h3 class="modal-title">{{ activeProject.name }}</h3>
            <button v-if="activeProject.url" type="button" class="modal-open-btn" @click="openLink(activeProject.url)">
              打开项目 ↗
            </button>
            <p v-else class="modal-note">该项目暂无外部链接</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
/* ===== 双行走马灯（复刻桌面 what-we-do）===== */
.marquee-track {
  overflow: hidden;
  width: 100%;
  -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
  mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
}
.marquee-row {
  display: flex;
  width: max-content;
  gap: 12px;
  will-change: transform;
}
.marquee-left {
  animation: marqueeLeft 45s linear infinite;
}
.marquee-right {
  animation: marqueeRight 45s linear infinite;
}
.marquee-track:hover .marquee-row,
.marquee-track:active .marquee-row {
  animation-play-state: paused;
}
@keyframes marqueeLeft {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes marqueeRight {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}

/* 走马灯卡片：移动端缩小版（桌面 706×450，移动端约 160×102） */
.marquee-card {
  position: relative;
  width: 160px;
  height: 102px;
  border-radius: 14px;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(3, 59, 55, 0.18);
  padding: 0;
  background: #fff;
  cursor: pointer;
  flex-shrink: 0;
}
.marquee-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(to top, rgba(3,59,55,0.9), transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

/* ===== 方向卡展开过渡 ===== */
.dir-expand-enter-active,
.dir-expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}
.dir-expand-enter-from,
.dir-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.dir-expand-enter-to,
.dir-expand-leave-from {
  max-height: 400px;
  opacity: 1;
}

/* ===== 项目详情模态框 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal-mask-enter-active,
.modal-mask-leave-active {
  transition: opacity 0.2s ease;
}
.modal-mask-enter-from,
.modal-mask-leave-to {
  opacity: 0;
}
.modal-mask-enter-active .modal-box,
.modal-mask-leave-active .modal-box {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.modal-mask-enter-from .modal-box,
.modal-mask-leave-to .modal-box {
  transform: scale(0.9);
  opacity: 0;
}
.modal-box {
  position: relative;
  width: 100%;
  max-width: 360px;
  border-radius: 20px;
  background: #EBF5F0;
  border: 4px solid #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px #0A665F;
  padding: 20px;
  box-sizing: border-box;
}
.modal-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(10,102,95,0.4);
  color: #0A665F;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  z-index: 2;
}
.modal-img {
  width: 100%;
  aspect-ratio: 706/450;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid #fff;
}
.modal-title {
  margin-top: 14px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #033B37;
}
.modal-open-btn {
  display: block;
  margin: 14px auto 0;
  padding: 10px 28px;
  border-radius: 999px;
  background: #0A665F;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
.modal-note {
  margin-top: 14px;
  text-align: center;
  font-size: 13px;
  color: #6B7280;
}
</style>
