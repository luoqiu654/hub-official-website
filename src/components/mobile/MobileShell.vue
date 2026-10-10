<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MobileHome from './MobileHome.vue'
import MobileAbout from './MobileAbout.vue'
import MobileProjects from './MobileProjects.vue'
import MobileGrow from './MobileGrow.vue'
import MobileDestinations from './MobileDestinations.vue'
import MobileContact from './MobileContact.vue'

const route = useRoute()

// 栏目定义：DOM 锚点 + 导航名（桌面 10 页合并为 6 个移动栏目）
const sections = [
  { id: 'home', label: '首页' },
  { id: 'about', label: '关于我们' },
  { id: 'projects', label: '项目展示' },
  { id: 'grow', label: '成长体系' },
  { id: 'destinations', label: '成员去向' },
  { id: 'contact', label: '联系我们' },
]

// 桌面路由名 → 移动栏目：深链（从桌面/直接 URL 进入）时滚到对应区块
const routeToSection = {
  home: 'home',
  aboutus: 'about',
  aboutus2: 'about',
  whatwedo: 'projects',
  whatwedo2: 'projects',
  grow: 'grow',
  'grow-community': 'grow',
  'grow-service': 'grow',
  destination: 'destinations',
  contact: 'contact',
}

// 滚动行为：尊重系统减少动效偏好
function scrollTo(id) {
  const el = document.getElementById(id)
  if (!el) return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

// 导航点击：只滚动、不改变路由（避免与 vue-router 的 hash 历史冲突）
function goTo(id) {
  activeId.value = id
  scrollTo(id)
}

// 深链处理：挂载时若当前路由不是首页，滚到对应栏目；后续路由变化时同样处理
const handledDeepLink = ref(false)
watch(
  () => route.name,
  (name) => {
    if (!name || handledDeepLink.value) return
    const target = routeToSection[name]
    if (target) {
      handledDeepLink.value = true
      // 等区块渲染后再滚
      requestAnimationFrame(() => scrollTo(target))
    }
  },
  { immediate: true }
)

// scrollspy：进入视野中心的栏目高亮
const activeId = ref('home')
let observer = null
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeId.value = entry.target.id
      })
    },
    { rootMargin: '-38% 0px -52% 0px', threshold: 0 }
  )
  sections.forEach((s) => {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  })
})
onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <!-- 移动端长页外壳：正常文档流滚动（body 滚动），顶部吸顶导航 -->
  <div class="mobile-shell box-border">
    <!-- 吸顶导航 -->
    <header
      class="sticky top-0 z-40 flex items-center gap-3 border-b border-[#0A665F]/15 bg-[#F7F4EC]/95 px-4 py-2.5 backdrop-blur"
      style="padding-top: max(env(safe-area-inset-top), 10px);"
    >
      <img src="/index/logo.webp" alt="CQUPTHUB" class="h-8 w-8 shrink-0 object-contain" />
      <span class="shrink-0 text-[15px] font-bold text-[#033B37]">CQUPTHUB</span>
      <!-- 栏目导航：窄屏横向滚动，不换行 -->
      <nav class="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="栏目导航">
        <button
          v-for="s in sections"
          :key="s.id"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
          :class="activeId === s.id ? 'bg-[#0A665F] text-white' : 'text-[#033B37] hover:bg-[#0A665F]/10'"
          @click="goTo(s.id)"
        >
          {{ s.label }}
        </button>
      </nav>
    </header>

    <!-- 六个栏目内容 -->
    <main>
      <MobileHome />
      <MobileAbout />
      <MobileProjects />
      <MobileGrow />
      <MobileDestinations />
      <MobileContact />
    </main>

    <footer class="px-5 py-6 text-center text-[12px] text-[#17514b]" style="padding-bottom: max(env(safe-area-inset-bottom), 24px);">
      © {{ new Date().getFullYear() }} CQUPTHUB · 重庆邮电大学工作室
    </footer>
  </div>
</template>

<style scoped>
.mobile-shell {
  /* 触屏滚动顺滑；正文 14px 起步，避免任何页面级横向滚动 */
  -webkit-overflow-scrolling: touch;
  overflow-x: hidden;
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
