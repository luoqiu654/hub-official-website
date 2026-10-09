<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { tryAcquireFlip } from '../composables/useFlipLock'
import DesignStage from '../components/DesignStage.vue'

const router = useRouter()

// 顶部导航项
const navItems = ['关于我们', '项目展示', '成长体系', '成员去向', '联系我们']

// 各导航项对应的路由
const targetMap = {
  关于我们: '/aboutus',
  项目展示: '/whatwedo',
  成长体系: '/grow',
  成员去向: '/destination',
  联系我们: '/contact-us',
}

// 点击导航：跳转到对应页面（过渡动画由 App.vue 的翻页过渡统一处理）
function onNav(item) {
  const path = targetMap[item]
  if (path) router.push(path)
}

// 点击底部下拉箭头：跳转到关于我们
function goAbout() {
  router.push('/aboutus')
}

// 向下滚动：翻到关于我们页
let flipping = false
function onWheel(e) {
  if (flipping || e.deltaY <= 0) return
  // 全局翻页锁：单次滚动的动量会被后续新挂载的页面接连捕获，这里在过渡期间拒绝再次翻页
  if (!tryAcquireFlip()) return
  flipping = true
  router.push('/aboutus')
}

onMounted(() => {
  window.removeEventListener('wheel', onWheel) // 先移除再添加，防止 HMR 重跑 setup 时监听器重复
  window.addEventListener('wheel', onWheel, { passive: true })
  // —— 舞台层(在 DesignStage 内,定位/尺寸紧跟设计坐标系缩放)——
  // bar、star 先从底部弹出（弹簧效果），girl 随后弹出。yPercent/scale 为百分比/相对值,随舞台等比缩放,无需按视口换算。
  gsap.from(['.bar', '.star'], {
    yPercent: 130,
    duration: 0.8,
    ease: 'back.out(1.7)',
    stagger: 0.15,
  })
  gsap.from('.girl', {
    yPercent: 130,
    scale: 0.4,
    duration: 0.9,
    ease: 'back.out(1.7)',
    delay: 0.75,
  })
  // title 最后出现：从星空中由小变大弹出
  gsap.from('.title-img', {
    scale: 0.15,
    duration: 0.7,
    ease: 'back.out(2)',
    delay: 1.7,
    transformOrigin: 'center center',
  })
  // —— 视口层(导航栏,在 DesignStage 之外、贴真实视口,用真实 px 计算)——
  // 两个三角从右往左飞入，身后拉出一条直线（线从右向左生长）
  gsap.fromTo(
    '.header-triangle',
    { x: window.innerWidth },
    { x: 0, duration: 1.2, ease: 'power2.inOut', delay: 0.5 }
  )
  gsap.fromTo(
    '.header-line',
    { scaleX: 0 },
    {
      scaleX: 1,
      duration: 1.2,
      ease: 'power2.inOut',
      delay: 0.5,
      transformOrigin: 'right center',
    }
  )
})

onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden bg-[#e4f3ec]">
    <!-- 铺底背景：最低层，填满真实视口、object-cover 遮盖等比留白边条 -->
    <img
      src="/index/bg.webp"
      class="fixed inset-0 z-0 h-full w-full object-cover"
    />

    <!-- 顶部白色导航栏：贴真实视口，z-90 最顶层。作为 chrome 层，
         必须始终在场景/下拉箭头之上，避免任何美术元素遮挡导航按钮。 -->
    <header
      class="fixed top-0 left-0 z-0 flex h-16 w-full items-center justify-between bg-white px-10 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <img src="/index/logo.webp" class="h-14 w-auto -translate-y-1" />
      <nav
        class="flex -translate-y-1 items-center gap-9 text-[15px] font-medium text-[#033B37]"
      >
        <a
          v-for="item in navItems"
          :key="item"
          class="cursor-pointer transition-colors duration-200 hover:text-[#2f9e77]"
          @click="onNav(item)"
        >
          {{ item }}
        </a>
      </nav>
      <!-- 两个三角并排作为箭头头部，直线作为箭杆，中轴线对齐 -->
      <div class="header-triangle absolute bottom-1 left-0 z-10 flex">
        <img src="/index/triangle.webp" class="h-3.5 w-auto" />
        <img src="/index/triangle.webp" class="h-3.5 w-auto" />
      </div>
      <div
        class="header-line absolute bottom-2.5 left-0 right-0 h-0.5 bg-black"
      ></div>
    </header>

    <!-- 场景：原生 2880×2048 设计画幅，整体纳入 DesignStage 等比缩放。
         美术元素以固定 px 定位在设计坐标系内，随舞台同步缩放 ⇒ 视口变化不再错位。
         z-60：位于导航栏(z-90)之下、铺底背景之上；
         pointer-events-none 让点击穿透到场景，保证滚动翻页不被舞台拦截。 -->
    <DesignStage :design-w="2880" :design-h="2048" class="pointer-events-none z-60">
      <img
        src="/index/title.webp"
        class="title-img pointer-events-none absolute inset-0 z-70 h-full w-full"
      />
      <img
        src="/index/star.webp"
        class="star pointer-events-none absolute inset-0 z-60 h-full w-full"
      />
      <img
        src="/index/girl.webp"
        class="girl pointer-events-none absolute z-50 top-[32px] right-[-429px]"
      />
      <img
        src="/index/bar.webp"
        class="bar pointer-events-none absolute right-[-396px] z-60 h-full w-full"
      />
    </DesignStage>

    <!--
      底部下拉箭头：作为首页子元素（absolute），会被首页 overflow-hidden 裁剪，
      首页上滑时它随之移动，超出首页范围的部分自动隐藏（保持白色）。
      贴真实视口、z-70（压在场景之上），点击不穿透。
    -->
    <div
      class="absolute bottom-0 left-1/2 z-70 w-[170vw] -translate-x-1/2 translate-y-[45%] cursor-pointer"
      role="button"
      aria-label="前往关于我们"
      @click="goAbout"
    >
      <img src="/index/dropdown.webp" class="h-auto w-full" />
      <!-- 箭头：dropdown.png 屏幕可见部分（顶部 25%）的中央 -->
      <img
        src="/index/arrow.webp"
        class="absolute left-1/2 top-[38.5%] h-auto w-[10vw] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  </div>
</template>
