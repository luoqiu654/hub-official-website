<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { tryAcquireFlip } from '../composables/useFlipLock'
import { projectImgs } from '../composables/useProjectAssets'
import { PROJECT_LINKS } from '../composables/projectLinks'
import DesignStage from '../components/DesignStage.vue'

// 该页设计画幅 = 参考视口 1707×932（基准下 scale=1、舞台盒=视口 → 与原版一致）。
// 所有 GSAP 位移与卡片落位都按此设计宽高计算；舞台随后整体等比缩放。
const PAGE_W = 1707
const PAGE_H = 932

const router = useRouter()

// ================= 滚动翻页（退出动画：进入 grow.vue） =================
// 向下滚动的交互分两段：
//  ① 小幅度：项目展示.png 随滚动量按比例下移；停止滚动时弹簧回弹，同时形变传导到
//     黄球（轻微压扁）再传导到 4 张项目卡片（短暂小幅随机轨迹混乱，各卡完全异步）；
//  ② 大幅度（累计滚动量超过阈值）：黄球与 4 张卡片一起缩小飞进项目展示.png，
//     展示球"张嘴"吞下后躲到屏幕底下，动画结束导航到 grow.vue（grow.vue 入场动画不动）。
// 向上滚动：回到上一页 what-we-do（保持原有行为）
const PULL_MAX = 26    // 项目展示.png 随滚动被拉下的最大位移（自身高度百分比）
const THRESHOLD = 500  // 累计下滚量达到该值 → 触发"吸入 + 躲藏 + 导航"
const SETTLE_MS = 150  // 最后一次滚动事件后多久判定"停止滚动"

let flipping = false   // 已触发导航（向上返回 / 向下吸入），拦截后续滚动
let acc = 0            // 累计向下滚动量（上限 THRESHOLD）
let settledTimer = null
let entryDone = false  // 入场动画结束后才响应滚动
let floatTween = null  // 卡片上下浮动的无限动画：做"轨迹混乱"时临时打断，结束后重启
let show = null, ball = null, group = null, prjs = null, cards = []
let finals = [], vw = 0, vh = 0, sinkY = 0
let tl = null

// 停止滚动：展示球弹簧回弹 + 形变传导链（黄球轻微压扁 → 卡片短暂随机轨迹混乱）
function springBack() {
  acc = 0
  gsap.to(show, { yPercent: REST_Y, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' })
  gsap.to(ball, { scaleX: 1.07, scaleY: 0.93, duration: 0.12, ease: 'power2.out', transformOrigin: '50% 50%', overwrite: 'auto' })
  gsap.to(ball, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', delay: 0.12, transformOrigin: '50% 50%', overwrite: 'auto' })
  chaosCards()
}

// 4 张卡片短暂的无规则转圈：每张卡围绕自己的落位点快速绕 2~3 个不规则的小圈
// （轨道半径、方向、起点、每点抖动全部随机 → 各卡完全异步）；卡片本体只微微振动
// （≤4°），不跟着轨迹旋转。整段混乱控制在 1 秒左右
function chaosCards() {
  // 卡片落位数据未就绪（HMR/重挂载时 cards 与 finals 尚未对齐）时跳过，避免读越界崩溃
  if (!finals.length || finals.length !== cards.length) return
  if (floatTween) { floatTween.kill(); floatTween = null }
  gsap.killTweensOf(cards) // 清掉上一轮未完成的混乱动画
  let remaining = cards.length
  cards.forEach((card, i) => {
    const xAmp = (1 + Math.random() * 1) * vw / 100 // 横向轨道半径 1~2vw（小幅散开）
    const yAmp = xAmp * 0.6                          // 纵向轨道略扁，防止卡片飞出屏幕
    const circles = 2 + Math.floor(Math.random() * 2) // 2~3 圈
    const ptsPerCircle = 6
    const N = circles * ptsPerCircle
    const dir = Math.random() < 0.5 ? 1 : -1          // 顺时针 / 逆时针
    const start = Math.random() * Math.PI * 2         // 起点角度各不相同
    const keyframes = []
    for (let k = 1; k <= N; k++) {
      const th = start + dir * k * ((2 * Math.PI) / ptsPerCircle)
      const wob = 1 + (Math.random() * 2 - 1) * 0.35 // 每点半径抖动 ±35% → 轨迹不规则
      keyframes.push({
        x: finals[i].x + Math.cos(th) * xAmp * wob,
        y: finals[i].y + Math.sin(th) * yAmp * wob,
        rotation: Math.sin(th) * 4, // 只沿轨道微微振动（≤4°），本体不转圈
        duration: 0.02 + Math.random() * 0.03, // 每段 0.02~0.05s，转圈频率高
        ease: 'sine.inOut',
      })
    }
    const dStart = Math.random() * 0.1 // 出发延迟各不相同 → 完全异步
    const total = keyframes.reduce((s, k) => s + k.duration, 0)
    gsap.to(card, { keyframes, delay: dStart, overwrite: 'auto' })
    gsap.to(card, {
      x: finals[i].x, y: finals[i].y, rotation: 0,
      duration: 0.25 + Math.random() * 0.2,
      delay: dStart + total + Math.random() * 0.08,
      ease: 'bounce.out',
      overwrite: 'auto',
      onComplete: () => { if (--remaining === 0 && !flipping) restartFloat() },
    })
  })
}

// 混乱结束：恢复 4 张卡片同步的上下浮动
function restartFloat() {
  if (!finals.length || finals.length !== cards.length) return
  floatTween = gsap.to(cards, {
    y: i => finals[i].y - (1.4 * vh) / 100,
    duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1,
  })
}

// 大幅度下滚：黄球与 4 张卡片被吸进项目展示.png，展示球躲到屏幕底下 → 导航 grow.vue
function absorbAndGo() {
  flipping = true
  clearTimeout(settledTimer)
  if (floatTween) { floatTween.kill(); floatTween = null }
  gsap.killTweensOf([show, ball, group, prjs, ...cards])
  // 展示球"张嘴"迎球：略微上抬 + 张阔变扁
  gsap.to(show, {
    yPercent: REST_Y - 4, scaleX: 1.18, scaleY: 0.8, duration: 0.18,
    ease: 'power2.out', transformOrigin: '50% 100%', overwrite: 'auto',
  })
  // 黄球 + 4 张卡片一起收缩进项目展示.png：收缩点（球底部中心）与展示球体内的中心重合。
  // 展示球绘制在上层（模板中放在 ballGroup 之后），5 个元素缩进它体内时被遮挡，
  // 看起来是"躲进展示球后面"，随后展示球整体沉底吞掉
  gsap.to(group, {
    y: sinkY, scale: 0.05, duration: 0.45, ease: 'power2.in',
    transformOrigin: '50% 100%', overwrite: 'auto',
  })
  // 展示球吞下后整体躲到屏幕底下，动画结束进入 grow.vue
  gsap.to(show, {
    yPercent: 100, scaleX: 1, scaleY: 1, duration: 0.5,
    ease: 'power3.in', delay: 0.45, overwrite: 'auto',
    onComplete: () => router.push('/grow'),
  })
}

// 滚动主逻辑：向上回上一页 what-we-do；向下进入交互流程
function onWheel(e) {
  if (activeModal.value) return // 模态框打开时禁用滚动翻页
  if (flipping || !entryDone) return
  if (e.deltaY < 0) { // 向上滚动：回到上一页 what-we-do
    if (!tryAcquireFlip()) return
    flipping = true
    router.push('/whatwedo')
    return
  }
  if (!e.deltaY) return
  acc = Math.min(acc + e.deltaY, THRESHOLD)
  // 项目展示.png 随滚动量按比例下移
  gsap.to(show, {
    yPercent: REST_Y + (acc / THRESHOLD) * PULL_MAX,
    duration: 0.25, ease: 'power2.out', overwrite: 'auto',
  })
  if (acc >= THRESHOLD) { // 下滚到一定程度 → 吸入 + 躲藏 + 导航
    if (!tryAcquireFlip()) return
    clearTimeout(settledTimer)
    absorbAndGo()
    return
  }
  clearTimeout(settledTimer)
  settledTimer = setTimeout(springBack, SETTLE_MS)
}

const yellowBall = ref(null) // 核心业务黄球：从屏幕上方自由落体落下
const ballGroup = ref(null)  // 黄球 + 项目卡片的公共容器：负责整体位移，卡片不受球体挤压变形影响
const projects = ref(null)   // 4 张项目卡片层：相撞时从球心弹出（由极小放大到实际大小）
const showBall = ref(null)   // 项目展示球：从底部屏外冲出，把黄球弹起
const cardEls = ref([])      // 4 张卡片元素：弹出时先小幅轨迹混乱，再错位上下跳落回原位

// v-for 函数 ref：逐个收集卡片元素
const setCardRef = (el) => { if (el) cardEls.value.push(el) }

// 4 张卡片相对黄球球心的锚点位置：左、右、左上、右上
// 锚点只提供 left/top；相对锚点的偏移（相当于原 CSS translate）由 GSAP 挂载后按卡片实际尺寸计算，
// 与动画走同一条 transform 通道，避免 CSS translate 与 GSAP x/y 互相覆盖导致卡片挤在一起
const projectPos = [
  { left: '45%', top: '70%' },   // 左
  { left: '65%', top: '70%' },   // 右
  { left: '55%', top: '70%' },   // 左上
  { left: '55%', top: '70%' },   // 右上
]

// 项目图片由 useProjectAssets 统一扫描 src/assets/whatwedo 下全部 *.webp 得到：
// 文件名 → URL 映射，按文件名取用（这里直接 import projectImgs）

const intrduction=[
    {
        title: '数字教材研发',
        content: '聚焦数字教材前端可视化开发，将传统教材内容转化为具有互动体验的数字学习产品。',
        positioning: '工作室核心业务方向',
        listLabel: '展示项目',
        listKind: 'carousel',
        items: [
            { name: '矿井火灾防治技术', img: projectImgs['规程小卫士.webp'], url: PROJECT_LINKS['规程小卫士'] },
            { name: 'PLC应用技术教程', img: projectImgs['小矿师的 PLC 接线物语.webp'], url: PROJECT_LINKS['小矿师的 PLC 接线物语'] },
            { name: '点亮未来-创新创业基础', img: projectImgs['chuangxin.webp'], url: PROJECT_LINKS['chuangxin'] },
        ],
    },
    {
        title: '互联网产品研发',
        content: '参与网站、小程序及互联网产品开发，覆盖需求分析、产品设计、开发实现全过程。',
        positioning: '展示工作室产品开发能力',
        listLabel: '展示项目',
        listKind: 'carousel',
        items: [
            { name: '法典AI', img: projectImgs['法典.webp'], url: PROJECT_LINKS['法典'] },
            { name: '重庆邮电大学国际学院官网', img: projectImgs['重庆邮电大学国际学院官网.webp'], url: PROJECT_LINKS['重庆邮电大学国际学院官网'] },
            { name: '校园相关互联网项目', img: projectImgs['重庆邮电大学远东联邦大学联合学院官网.webp'], url: PROJECT_LINKS['重庆邮电大学远东联邦大学联合学院官网'] },
        ],
    },
    {
        title: 'AI创新应用',
        content: '探索 AI 技术在产品设计、内容生产和软件开发中的应用，提高产品创新效率。',
        positioning: '体现工作室拥抱 AI 趋势',
        listLabel: '方向',
        listKind: 'list',
        items: ['AI Agent设计', 'AI辅助开发', '智能应用探索'],
    },
    {
        title: '校企合作项目',
        content: '工作室积极参与学校、企业合作项目，将技术能力应用于真实业务场景。',
        positioning: '体现真实项目来源',
        listLabel: '合作来源',
        listKind: 'list',
        items: ['智荟通科技合作有限公司', '数字教材方向 AI 小型产品研发', '合肥邮创汇公司', '互联网外包项目', '校内教师项目', '校园数字化建设'],
    },
]

// ===== 项目详情模态框 =====
// activeModal 记录当前点击的分类卡片对象（null = 关闭）；ESC 由 onKey 监听器处理
const activeModal = ref(null)
const cur = ref(0) // 项目轮播当前索引
const openModal = (p) => { activeModal.value = p; cur.value = 0 }
const closeModal = () => { activeModal.value = null }
const prevCard = () => { const n = activeModal.value?.items.length || 1; cur.value = (cur.value - 1 + n) % n }
const nextCard = () => { const n = activeModal.value?.items.length || 1; cur.value = (cur.value + 1) % n }
// 点击有跳转链接的项目卡：新标签页打开（无 url 的卡不可点）
const openProject = (it) => { if (it?.url) window.open(it.url, '_blank', 'noopener') }
// 每张卡在封面流轮播里的角色：中间高亮靠前，左右两张靠后缩小
const carPos = (i) => {
  const n = activeModal.value?.items.length || 1
  if (i === cur.value) return 'active'
  if (i === (cur.value - 1 + n) % n) return 'left'
  return 'right'
}
function onKey(e) {
  if (e.key === 'Escape') closeModal()
}

// 展示球的落定位置：translate-y-5/12（自身高度的 41.667% 藏进屏幕下方）
const REST_Y = 41.667

onMounted(() => {
  window.removeEventListener('wheel', onWheel) // 先移除再添加，防止 HMR 重跑 setup 时监听器重复
  window.addEventListener('wheel', onWheel, { passive: true })
  window.removeEventListener('keydown', onKey)
  window.addEventListener('keydown', onKey)
  group = ballGroup.value
  ball = yellowBall.value
  show = showBall.value
  prjs = projects.value
  cards = cardEls.value
  if (!group || !ball || !show || cards.length !== 4) return

  vw = PAGE_W
  vh = PAGE_H

  // 每张卡片的最终落位（替代原 CSS translate 定位）：按卡片实际尺寸 + 3vw/12vw 间距计算
  finals = cards.map((card, i) => {
    const gap3 = (3 * vw) / 100   // 对应原 3vw
    const gap12 = (12 * vw) / 100 // 对应原 12vw
    return {
      x: i % 2 === 0 ? -(card.offsetWidth + gap3) : gap3,               // 偶数左卡向左拉出，奇数右卡向右
      y: i >= 2 ? -(card.offsetHeight + gap12) : -card.offsetHeight / 2, // 上排两卡向上拉高，下排垂直居中
    }
  })

  // 吸入终点：收缩点（球底部中心）落在项目展示.png 体内 —— 取展示球"张嘴"后
  // （yPercent = REST_Y-4、压扁 0.8 倍、收缩原点在其底部中心）的视觉中心，
  // 5 个元素整体缩进展示球里
  const h = show.offsetHeight
  const swallowY = vh + (h * (REST_Y - 4)) / 100 - h * 0.4 // 展示球张嘴时的视觉中心（屏幕坐标）
  sinkY = swallowY - vh / 2 - ball.offsetHeight / 2        // 球底部中心（收缩原点）与它重合

  // 每张卡片弹出瞬间的"轨迹混乱"偏离量：在最终落位上各自朝不同方向小幅错开 + 轻微旋转，随后落回原位
  const chaosOff = [
    { x: (-4 * vw) / 100, y: (5 * vh) / 100, r: 2.5 },  // 左卡：向左下偏
    { x: (4 * vw) / 100, y: (-3 * vh) / 100, r: -2 },   // 右卡：向右上偏
    { x: (-3 * vw) / 100, y: (-4 * vh) / 100, r: -3 },  // 左上卡：向左上偏
    { x: (5 * vw) / 100, y: (4 * vh) / 100, r: 2 },     // 右上卡：向右下偏
  ]
  // 相撞点：黄球底部恰好压住展示球顶（展示球落定后露出的顶部边缘）
  const contact = vh - show.offsetHeight + (show.offsetHeight * REST_Y) / 100
  const impactY = contact - ball.offsetHeight / 2 - vh / 2 // 相对屏幕中心的偏移(px)

  // 初始站位：黄球藏在屏幕上方，展示球整体藏在屏幕下方
  // 位移全挂在公共容器 ballGroup 上（球与卡片一体移动）；挤压变形只作用于球本身
  gsap.set(group, { xPercent: -50, yPercent: -50, y: -PAGE_H * 0.7 })
  gsap.set(show, { xPercent: -50, yPercent: 100, scaleX: 1, scaleY: 1 })
  // 4 张卡片初始缩成一点，藏在球心，相撞时才弹出；卡片先落定在最终位置上（x/y 由 GSAP 管理）
  gsap.set(prjs, { scale: 0.01, transformOrigin: '50% 50%' })
  gsap.set(cards, { x: i => finals[i].x, y: i => finals[i].y, rotation: 0 })

  tl = gsap.timeline()

  // ① 黄球自由落体（加速下落），1.45s 到达相撞点
  tl.to(group, { y: impactY, duration: 1.4, ease: 'power2.in' }, 0.05)

  // ② 展示球从底部屏外冲出，与黄球同时到达相撞点
  tl.to(show, { yPercent: REST_Y, duration: 0.55, ease: 'power4.out' }, 0.9)

  // ③ 相撞：两个球同时压扁（接触面贴平、宽向变鼓），黄球底部为原点、展示球顶部为原点
  tl.to(group, { y: impactY + vh / 100, duration: 0.09, ease: 'power2.out' }, 1.45)
  tl.to(ball, { scaleX: 1.28, scaleY: 0.72, duration: 0.09, ease: 'power2.out', transformOrigin: '50% 100%' }, 1.45)
  tl.to(show, { scaleX: 1.25, scaleY: 0.78, duration: 0.09, ease: 'power2.out', transformOrigin: '50% 0%' }, 1.45)

  // ④ 蓄力回弹：黄球纵向拉长向上弹，展示球被撞得往下一沉
  tl.to(group, { y: impactY - (7 * vh) / 100, duration: 0.09, ease: 'power2.in' }, 1.54)
  tl.to(ball, { scaleX: 0.84, scaleY: 1.2, duration: 0.09, ease: 'power2.in' }, 1.54)
  tl.to(show, { yPercent: 44.5, scaleX: 0.94, scaleY: 1.06, duration: 0.09, ease: 'power2.in' }, 1.54)

  // ⑤ 黄球弹回屏幕正中央（拉伸逐渐恢复原形）；展示球回弹落定（带一点果冻回弹）
  //    相撞瞬间：4 张项目卡片从球心弹出 —— 整层由极小放大到实际大小，同时每张卡片
  //    朝各自不同的方向小幅偏移 + 旋转（轨迹混乱）
  tl.to(group, { y: 0, duration: 0.55, ease: 'power3.out' }, 1.63)
  tl.to(ball, { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'power3.out' }, 1.63)
  tl.to(show, { yPercent: REST_Y, scaleX: 1, scaleY: 1, duration: 0.3, ease: 'back.out(1.6)' }, 1.63)
  tl.to(prjs, { scale: 1, duration: 0.45, ease: 'back.out(1.5)' }, 1.45)
  tl.to(cards, {
    x: i => finals[i].x + chaosOff[i].x,
    y: i => finals[i].y + chaosOff[i].y,
    rotation: i => chaosOff[i].r,
    duration: 0.45,
    ease: 'power3.out',
  }, 1.45)

  // ⑤-1 卡片错位落回原位：逐卡延迟（stagger）+ 上下跳动（bounce），最终全部归位
  tl.to(cards, {
    x: i => finals[i].x,
    y: i => finals[i].y,
    rotation: 0,
    duration: 0.55,
    ease: 'bounce.out',
    stagger: 0.12,
  }, 1.9)

  // ⑥ 黄球落定：小幅上下抖动后收敛到屏幕正中央（只晃黄球本体，卡片已各自归位）
  tl.to(ball, { y: (2.4 * vh) / 100, duration: 0.14, ease: 'power1.in' }, 2.18)
  tl.to(ball, { y: (0.4 * vh) / 100, duration: 0.14, ease: 'power2.out' }, 2.32)
  tl.to(ball, { y: 0, duration: 0.1, ease: 'power2.out' }, 2.46)

  // ⑦ 卡片回弹落定后，4 张卡片同步做一致的上下浮动（浮动中心、幅度、相位完全相同）
  //    起点必须放在最后一张卡片回弹结束之后（1.9 + 0.55 + 3×0.12 = 2.81s）：
  //    若在 2.45 提前开始，浮动动画会捕获到卡片回弹中途的位置作为起始值（GSAP 首帧渲染时取值），
  //    且不能放进时间线 —— 滚动交互的"轨迹混乱"需要临时打断它，结束后再重启
  floatTween = gsap.to(cards, {
    y: i => finals[i].y - (1.4 * vh) / 100,
    duration: 0.7,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 2.82,
    onStart: () => { entryDone = true }, // 入场动画结束，开始响应滚动
  })
})

onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
  if (settledTimer) clearTimeout(settledTimer)
  if (tl) tl.kill()
  if (floatTween) floatTween.kill()
  gsap.killTweensOf([ball, show, group, prjs, ...cards])
})
</script>

<template>
    <div class="what-we-do2 bg-cover relative h-full overflow-hidden">
        <!-- 设计舞台：画幅 1707×932（基准视口）。舞台成为 fixed/absolute 元素的包含块，
             元素在舞台内按设计坐标定位并整体等比缩放；vw/vh/cqw 这类解析到真实视口的单位
             已换算成设计 px（基准下 scale=1）。铺底 bg 留在舞台外做全屏 cover（方案 A）。 -->
        <DesignStage :design-w="1707" :design-h="932">
            <img src="/bg-light.webp" class="bg-light pointer-events-none absolute scale-[3] top-[-160%]">
            <!-- 公共容器：黄球 + 4 张项目卡片一体位移（下落、相撞、回弹），挤压只作用于球本身 -->
            <div ref="ballGroup" class="fixed left-1/2 top-1/2">
                <div ref="yellowBall" class="core-business relative aspect-square w-[170.7px]">
                    <img src="/whatwedo2/yellowball.webp" alt="" class="w-full h-full">
                    <p class="absolute inset-0 flex items-center justify-center leading-none text-[#917109] font-bold text-[34.1px]">核心业务</p>
                </div>
                <!-- 卡片层：铺满设计画幅、锚定球心（球心 = 舞台中心），初始缩成一点，相撞时从球心弹出 -->
                <div ref="projects" class="absolute pointer-events-none"
                    style="left:-853.5px; top:-466px; width:1707px; height:932px;">
                    <div v-for="(p, i) in intrduction" :key="i" :ref="setCardRef" class="project absolute aspect-722/492 w-[22%] pointer-events-auto cursor-pointer"
                        :style="projectPos[i]" @click="openModal(p)">
                        <img src="/whatwedo2/project-frame.webp" class="absolute inset-0 w-full h-full">
                        <div class="absolute inset-0 flex flex-col items-center justify-center px-[42.7px] text-center">
                            <p class="font-bold text-[#033B37] text-[30.7px] border-[#033B37] border-solid border rounded-full px-3">{{ p.title }}</p>
                            <p class="mt-[13.7px] text-[#17514b] leading-relaxed text-[18.8px] text-left">{{ p.content }}</p>
                        </div>
                    </div>
                </div>
            </div>
            <!-- 项目展示球放最后：绘制在球与卡片之上（fixed 定位，DOM 顺序决定层序）。
                 退出时 5 个元素缩进它体内，收缩过程被展示球遮挡，看起来是"躲进展示球后面" -->
            <img ref="showBall" src="/whatwedo2/项目展示.webp"
                class="aspect-square w-[466px] fixed bottom-0 left-1/2">
        </DesignStage>

        <!-- 项目详情模态框：手写（点击遮罩 / ESC 关闭，内容留占位） -->
        <Teleport to="body">
            <Transition name="modal-mask">
                <div v-if="activeModal" class="modal-mask" @click.self="closeModal">
                    <div class="modal-box">
                        <button class="modal-close" aria-label="关闭" @click="closeModal">✕</button>
                        <h3 class="modal-title">{{ activeModal.title }}</h3>
                        <div class="modal-content">
                            <p class="modal-pos">定位：{{ activeModal.positioning }}</p>
                            <p class="modal-intro">{{ activeModal.content }}</p>

                            <!-- 展示项目：三卡轮播，左右箭头切换 -->
                            <template v-if="activeModal.listKind === 'carousel'">
                                <div class="carousel">
                                    <button class="car-arrow prev" aria-label="上一个" @click="prevCard">
                                        <img src="/index/arrow.webp" alt="上一个" />
                                    </button>
                                    <div class="car-viewport">
                                        <!-- 封面流：三张瘦长卡全部可见，中间高亮靠前，两侧缩小靠后 -->
                                        <div class="car-stage">
                                            <div v-for="(it, i) in activeModal.items" :key="i" class="car-card"
                                                :class="[`car-card--${carPos(i)}`, { 'car-link': it.url }]"
                                                @click="openProject(it)">
                                                <img :src="it.img" alt="" class="car-img" />
                                                <!-- 卡片底部内阴影：与 what-we-do 的 .unit 一样用 project-innershadow.webp，超出部分被裁掉 -->
                                                <img src="/whatwedo/project-innershadow.webp" alt=""
                                                    class="car-shadow pointer-events-none absolute w-[200%] max-w-none bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2" />
                                                <p class="car-name">{{ it.name }}</p>
                                                <!-- 右下角全屏箭头（原图 48×48）：提示「点了会新标签页打开完整项目」。
                                                     跟在 .car-name 之后，与它同一层 —— 侧边两张靠后卡的 ::after 暗罩会
                                                     把箭头一并压暗，和项目名的处理保持一致；pointer-events-none 让点击照常落到卡片上 -->
                                                <img v-if="it.url" src="/whatwedo2/fullscreenarrow.webp" alt=""
                                                    class="car-fs-arrow" />
                                            </div>
                                        </div>
                                    </div>
                                    <button class="car-arrow next" aria-label="下一个" @click="nextCard">
                                        <img src="/index/arrow.webp" alt="下一个" />
                                    </button>
                                </div>
                            </template>

                            <!-- 方向 / 合作来源：纯文字列表 -->
                            <template v-else>
                                <p class="modal-list-label">{{ activeModal.listLabel }}</p>
                                <ul class="modal-list">
                                    <li v-for="(it, i) in activeModal.items" :key="i">{{ it }}</li>
                                </ul>
                            </template>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
    .what-we-do2{
        background-image: url('/whatwedo2/bg.webp');
    }

    /* ===== 项目详情模态框 ===== */
    .modal-mask {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
    }
    /* 遮罩淡入淡出 + 弹窗缩放 */
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
        transform: scale(0.95);
        opacity: 0;
    }
    .modal-box {
        position: relative;
        width: 800px;
        height: 591px;
        border-radius: 28px;
        background: rgba(235, 245, 240, 1);
        /* 5px 白色外描边 + 1px 青色内边界 + 投影 */
        border: 5px solid #fff;
        box-shadow:
            2px 5px 5px rgba(0, 0, 0, 0.25),
            inset 0 0 0 1px rgba(10, 102, 95, 1);
        padding: 48px 56px;
        box-sizing: border-box;
        overflow: hidden;
    }

    .modal-title {
        color: #033B37;
        font-weight: 700;
        font-size: 34px;
        text-align: center;
        line-height: 1.2;
    }

    .modal-content {
        color: #17514b;
        margin-top: 12px;
        flex: 1;
        font-size: 18px;
        line-height: 1.8;
    }

    .modal-pos, .modal-intro {
        margin-bottom: 17px;
        text-align: center;
        margin-left: auto;
        margin-right: auto;
        font-size: 18px;
        font-weight: 400;
        letter-spacing: 2px;
        line-height: 26.52px;
        color: rgba(3, 59, 55, 1);
        width: 75%;
    }

    .modal-intro {
        text-align: left;
        margin-top: 2px;
    }

    .modal-list-label {
        color: #0A665F;
        font-weight: 700;
        font-size: 18px;
        margin-top: 8px;
        margin-bottom: 6px;
        text-align: center;
    }

    /* 三卡项目轮播 */
    .carousel {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .car-viewport {
        flex: 1;
        overflow: hidden;
    }
    .car-stage {
        position: relative;
        height: 335px;
    }
    .car-card {
        /* 卡片圆角 + 白色外描边宽度：内描边圆角由此自动推导 */
        --card-radius: 26px;
        --card-border: 5px;
        position: absolute;
        top: 50%;
        left: 50%;
        width: 235px;
        height: 330px;
        border-radius: var(--card-radius);
        overflow: hidden;
        background: #fff;
        /* 5px 白色外描边 */
        border: var(--card-border) solid #fff;
        transition: transform 0.5s ease, opacity 0.5s ease;
    }
    /* 带跳转链接的项目卡：可点击 */
    .car-card.car-link {
        cursor: pointer;
    }
    /* 1px 青色内描边：用真实元素盖在内容图之上（inset 阴影会被铺满的图片遮住） */
    .car-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: calc(var(--card-radius) - var(--card-border)); /* 贴合内缘：外圆角 - 外描边 */
        border: 1px solid rgba(10, 102, 95, 1);
        pointer-events: none;
        z-index: 5;
    }
    /* 中间高亮卡：居中、靠前、全尺寸 */
    .car-card--active {
        transform: translate(-50%, -50%) translateX(0) scale(1);
        z-index: 3;
        opacity: 1;
    }
    /* 两张靠后卡：左右两侧缩小置后、略微拉近，让中间卡部分盖住它们 */
    .car-card--left {
        transform: translate(-50%, -50%) translateX(-150px) scale(0.68);
        z-index: 2;
        opacity: 0.6;
    }
    .car-card--right {
        transform: translate(-50%, -50%) translateX(150px) scale(0.68);
        z-index: 2;
        opacity: 0.6;
    }
    /* 左右两张靠后卡叠加一层暗色遮罩 */
    .car-card--left::after,
    .car-card--right::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        pointer-events: none;
    }
    .car-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .car-name {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 12px 14px;
        color: #fff;
        font-weight: 600;
        font-size: 16px;
    }
    /* 右下角全屏箭头：白色双向斜箭头，示意「点开看完整项目」。
       原图 48×48 正方形，故宽高相等；尺寸写成一个变量，想调大小改 --fs-arrow 即可。
       inset 与 .car-name 的 padding 对齐，两者同处卡片右下角 */
    .car-fs-arrow {
        --fs-arrow: 20px;
        position: absolute;
        right: 12px;
        bottom: 12px;
        width: var(--fs-arrow);
        height: var(--fs-arrow);
        pointer-events: none;
    }

    .car-arrow {
        flex: 0 0 auto;
        width: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
    }
    .car-arrow img {
        width: 100%;
        height: auto;
        display: block;
        pointer-events: none;
    }
    /* arrow.webp 指向下方：左箭头顺时针转 90°，右箭头逆时针转 90° */
    .car-arrow.prev img {
        transform: rotate(90deg);
    }
    .car-arrow.next img {
        transform: rotate(-90deg);
    }

    /* 方向 / 合作来源文字列表 */
    .modal-list {
        margin-top: 4px;
        padding-left: 20px;
        font-size: 18px;
        line-height: 1.9;
        text-align: center;
    }

    .modal-close {
        position: absolute;
        top: 20px;
        right: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid rgba(10, 102, 95, 0.4);
        color: #0A665F;
        background: transparent;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
    }
    .modal-close:hover { background: rgba(10, 102, 95, 0.12); }
</style>
