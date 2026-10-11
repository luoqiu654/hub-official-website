<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { mountReveal, killReveal } from '../../composables/useMobileReveal'

gsap.registerPlugin(ScrollTrigger)

const sectionRef = ref(null)
let revealTween = null
let growCtx = null

// ==================== 成长路径（垂直版轨迹线） ====================
const growthSteps = [
  { title: '1. 学习成长', desc: '了解互联网产品研发流程，掌握岗位基础能力。',
    points: ['产品设计', 'UI设计', '前端开发', 'AI工具应用'], tone: 'yellow' },
  { title: '2. 项目实践', desc: '参与真实项目，在实践中提升能力。',
    points: ['数字教材项目', '校园互联网项目', '企业合作项目', '完整流程：需求分析、产品设计、开发实现、项目交付'], tone: 'green' },
  { title: '3. 能力提升', desc: '从项目参与者成长为独立贡献者。',
    points: ['项目经验', '作品成果', '团队协作能力'], tone: 'yellow' },
  { title: '4. 核心培养', desc: '优秀成员可进一步参与：',
    points: ['项目负责人工作', '团队协作管理', '新人成长指导'], tone: 'green' },
]
// 4 个圆点在垂直轨迹上的 y 位置（相对容器顶部，px）
const DOT_YS = [70, 250, 430, 610]
const growCaption = 'CQUPTHUB 帮助成员从技术兴趣出发，通过真实项目实践，逐步成长为具备互联网竞争力的青年人才'

// ==================== 成长社区 ====================
const community = {
  title: 'HUB实战成长社区',
  subtitle: '我们拥有真实的项目资源',
  process: { title: '项目制成长', steps: ['加入社区', '能力匹配', '进入项目组', '负责人带教', '完成真实项目', '获得项目履历'] },
  gains: { title: '成员能获得什么', items: ['真实产品开发经历', '完整项目流程体验', '团队协作经验', '简历资产', '产品思维 / 技术能力', '求职竞争力'] },
  why: { title: '为什么成立社区', fields: [
    { tag: '学生', text: '不知道行业需要哪些技术，没有项目经历，简历缺少亮点，不知道如何进入互联网行业。' },
    { tag: 'HUB提供', text: '真实项目 + 团队指导 + 完整流程 + 职业辅导。' },
  ]},
  caption: '面向校内外同学的互联网项目实践成长社区 · 真实项目 × 专业带教 × 职业成长',
}
// 社区板块左右翻页：0=HUB培养特色，1=社区成员类型
const communityTab = ref(0)

// ==================== 求职增值服务（纵向圆卡） ====================
const services = [
  { title: '职业方向规划', label: '帮助：', items: ['分析个人能力', '规划发展路线', '匹配岗位方向'], tone: 'green' },
  { title: '秋招陪跑', label: '内容：', items: ['岗位分析', '投递规划', '进度跟踪'], tone: 'green' },
  { title: '面试复盘', label: '帮助：', items: ['分析问题', '优化表达', '提升通过率'], tone: 'green' },
  { title: '简历精修', label: '服务：', items: ['项目经历优化', '简历结构调整', '岗位匹配优化'], tone: 'yellow' },
  { title: '模拟面试', label: '包含：', items: ['技术面模拟', '产品面模拟'], tone: 'yellow' },
]
const serviceFooter = '面向互联网求职者的职业成长服务 · HUB Career'

// ==================== 动画：成长路径垂直轨迹 ====================
function playGrowthAnim() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  const ctx = gsap.context(() => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.grow-path-wrap', start: 'top 70%', once: true },
    })
    // 轨迹线从上到下延伸
    tl.from('.grow-trajectory', { scaleY: 0, transformOrigin: 'top center', duration: 1.2, ease: 'power2.inOut' })
    // 火箭沿轨迹飞
    tl.fromTo('.grow-rocket',
      { y: -40, opacity: 1 },
      { y: 560, duration: 2.0, ease: 'power1.inOut' },
      0.2
    )
    // 4 个圆点依次弹出
    DOT_YS.forEach((_, i) => {
      tl.from(`.grow-dot-${i}`, {
        scale: 0, duration: 0.5, ease: 'back.out(2)',
      }, 0.4 + i * 0.35)
      // 虚线长出
      tl.from(`.grow-dash-${i}`, {
        scaleX: 0, transformOrigin: i % 2 === 0 ? 'right center' : 'left center',
        duration: 0.4, ease: 'power2.out',
      }, 0.6 + i * 0.35)
      // 卡片淡入
      tl.from(`.grow-card-${i}`, {
        opacity: 0, x: i % 2 === 0 ? -20 : 20, duration: 0.5, ease: 'power2.out',
      }, 0.75 + i * 0.35)
    })
  })
  return ctx
}

onMounted(async () => {
  revealTween = mountReveal(sectionRef.value)
  await nextTick()
  growCtx = playGrowthAnim()
})

onUnmounted(() => {
  killReveal(revealTween)
  if (growCtx) growCtx.revert()
})
</script>

<template>
  <section id="grow" ref="sectionRef" class="px-5 py-14 box-border" style="background: linear-gradient(180deg, #fff8e0 0%, #fafafa 45%, #eaf5f0 100%)">
    <div class="reveal mb-6 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">成长体系</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">GROWTH</p>
    </div>

    <!-- ========== 一、成长路径（垂直轨迹线） ========== -->
    <div class="mb-14">
      <h3 class="mb-4 text-[18px] font-semibold text-[#033B37]">成长路径</h3>

      <div class="grow-path-wrap relative mx-auto" style="height: 720px; max-width: 420px">
        <!-- 垂直轨迹线 -->
        <div class="grow-trajectory absolute left-1/2 top-0 -translate-x-1/2 w-[3px] rounded-full"
          style="height: 660px; background: linear-gradient(180deg, #F7D460 0%, #0A665F 100%)"></div>

        <!-- 火箭沿轨迹飞 -->
        <img src="/grow/rocket.webp" alt="" class="grow-rocket absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
          style="width: 36px; height: 36px; top: 0" />

        <!-- 4 个阶段：圆点 + 虚线 + 卡片 -->
        <template v-for="(s, i) in growthSteps" :key="s.title">
          <!-- 圆点 -->
          <div :class="['grow-dot-' + i, 'absolute left-1/2 -translate-x-1/2 z-10 rounded-full border-[3px] border-white shadow-md']"
            :style="{ top: DOT_YS[i] + 'px', width: '22px', height: '22px', background: s.tone === 'yellow' ? '#F7D460' : '#0A665F' }"></div>

          <!-- 水平虚线（黄向左、绿向右） -->
          <div :class="['grow-dash-' + i, 'absolute top-0 h-[2px]']"
            :style="{
              top: (DOT_YS[i] + 10) + 'px',
              width: 'calc(50% - 30px)',
              left: i % 2 === 0 ? '0' : 'calc(50% + 30px)',
              background: 'repeating-linear-gradient(90deg, ' + (s.tone === 'yellow' ? '#F7D460' : '#0A665F') + ' 0 6px, transparent 6px 12px)',
            }"></div>

          <!-- 卡片（左/右交替） -->
          <article :class="[
              'grow-card-' + i, 'absolute top-0 rounded-2xl border-[3px] border-white p-3 shadow-md ring-1',
              s.tone === 'yellow' ? 'bg-[#FFF8E0] ring-[#F7D460]' : 'bg-[#EBF5F0] ring-[#0A665E]'
            ]"
            :style="{
              top: (DOT_YS[i] - 30) + 'px',
              width: 'calc(50% - 36px)',
              left: i % 2 === 0 ? '0' : 'calc(50% + 24px)',
            }">
            <h4 class="text-[14px] font-bold" :class="s.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">{{ s.title }}</h4>
            <p class="mt-1 text-[11.5px] font-medium leading-relaxed" :class="s.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">{{ s.desc }}</p>
            <ul class="mt-1.5 space-y-0.5">
              <li v-for="pt in s.points" :key="pt" class="flex items-start text-[11px] leading-[1.5]"
                :class="s.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">
                <span class="mr-1.5">•</span><span>{{ pt }}</span>
              </li>
            </ul>
          </article>
        </template>
      </div>
    </div>

    <!-- ========== 二、实战成长社区 ========== -->
    <div class="mb-14">
      <h3 class="mb-1 text-[18px] font-semibold text-[#033B37]">{{ community.title }}</h3>
      <p class="mb-4 text-[13px] text-[#0A665F]">{{ community.subtitle }}</p>

      <article class="reveal mb-3 rounded-2xl border-[3px] border-white bg-[#EBF5F0]/80 p-4 shadow-md ring-1 ring-[#0A665F]/30">
        <h4 class="text-[16px] font-bold text-[#033B37]">{{ community.process.title }}</h4>
        <p class="mt-2 text-[13px] font-medium text-[#033B37]">流程：</p>
        <ol class="mt-1 space-y-1.5">
          <li v-for="(st, i) in community.process.steps" :key="st" class="flex items-start text-[13px] leading-[1.6] text-[#033B37]">
            <span class="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A665F] text-[11px] font-bold text-white">{{ i + 1 }}</span>
            <span>{{ st }}</span>
          </li>
        </ol>
      </article>

      <article class="reveal mb-3 rounded-2xl border-[3px] border-white bg-[#FFF8E0]/80 p-4 shadow-md ring-1 ring-[#F7D460]">
        <h4 class="text-[16px] font-bold text-[#917109]">{{ community.gains.title }}</h4>
        <ul class="mt-2 space-y-1.5">
          <li v-for="g in community.gains.items" :key="g" class="text-[13px] leading-[1.6] text-[#917109]">「{{ g }}」</li>
        </ul>
      </article>

      <article class="reveal rounded-2xl border-[3px] border-white bg-[#EBF5F0]/80 p-4 shadow-md ring-1 ring-[#0A665F]/30">
        <h4 class="text-[16px] font-bold text-[#033B37]">{{ community.why.title }}</h4>
        <div v-for="f in community.why.fields" :key="f.tag" class="mt-3">
          <span class="text-[14px] font-bold text-[#0A665F]">{{ f.tag }}：</span>
          <p class="mt-1 text-[13px] leading-[1.7] text-[#033B37]">{{ f.text }}</p>
        </div>
      </article>

      <!-- 左右翻页：HUB培养特色 | 社区成员类型 -->
      <div class="reveal relative mt-4">
        <!-- Tab 按钮 -->
        <div class="mb-3 flex gap-2">
          <button type="button"
            class="flex-1 rounded-full py-2 text-[13px] font-semibold transition-all cursor-pointer"
            :class="communityTab === 0 ? 'bg-[#0A665F] text-white shadow-md' : 'bg-white/70 text-[#0A665F] ring-1 ring-[#0A665F]/30'"
            @click="communityTab = 0">HUB 培养特色</button>
          <button type="button"
            class="flex-1 rounded-full py-2 text-[13px] font-semibold transition-all cursor-pointer"
            :class="communityTab === 1 ? 'bg-[#0A665F] text-white shadow-md' : 'bg-white/70 text-[#0A665F] ring-1 ring-[#0A665F]/30'"
            @click="communityTab = 1">社区成员类型</button>
        </div>

        <!-- 翻页内容 -->
        <div class="overflow-hidden rounded-2xl border-[3px] border-white bg-white/80 shadow-md">
          <div class="flex transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(-${communityTab * 100}%)` }">
            <!-- 第1页：HUB培养特色 -->
            <div class="w-full shrink-0 p-4">
              <h4 class="text-[15px] font-bold text-[#033B37]">HUB 培养特色</h4>
              <p class="mt-2 text-[12.5px] leading-relaxed text-[#033B37]">{{ growCaption }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="rounded-full bg-[#0A665F]/10 px-3 py-1 text-[11px] font-medium text-[#0A665F]">项目负责人工作</span>
                <span class="rounded-full bg-[#0A665F]/10 px-3 py-1 text-[11px] font-medium text-[#0A665F]">团队协作管理</span>
                <span class="rounded-full bg-[#0A665F]/10 px-3 py-1 text-[11px] font-medium text-[#0A665F]">新人成长指导</span>
              </div>
            </div>
            <!-- 第2页：社区成员类型 -->
            <div class="w-full shrink-0 p-4">
              <img src="/grow-community/memberType.webp" alt="社区成员类型"
                class="w-full object-contain" style="max-height: 320px" />
            </div>
          </div>
        </div>

        <!-- 桌宠放一边装饰（右下角，不遮挡内容） -->
        <img src="/aboutus2/bg-girl.webp" alt="HUB桌宠"
          class="pointer-events-none absolute -bottom-2 -right-2 h-16 w-16 object-contain opacity-80 drop-shadow-md" />
      </div>

      <p class="mt-4 text-center text-[12px] text-[#033B37]">{{ community.caption }}</p>
    </div>

    <!-- ========== 三、求职增值服务（纵向圆卡） ========== -->
    <div>
      <h3 class="mb-4 text-[18px] font-semibold text-[#033B37]">求职增值服务</h3>

      <div class="relative flex flex-col items-center">
        <template v-for="(sv, i) in services" :key="sv.title">
          <!-- 圆形服务卡 -->
          <div class="reveal relative flex items-center justify-center rounded-full border-[4px] border-white shadow-lg"
            :class="sv.tone === 'yellow' ? 'bg-[#FFF8E0]' : 'bg-[#EBF5F0]'"
            :style="{
              width: i === services.length - 1 ? '180px' : '210px',
              height: i === services.length - 1 ? '180px' : '210px',
              boxShadow: sv.tone === 'yellow'
                ? 'inset 0 0 0 1px #F7D460, 2px 5px 8px rgba(0,0,0,0.2)'
                : 'inset 0 0 0 1px #0A665F, 2px 5px 8px rgba(0,0,0,0.2)',
            }">
            <!-- 装饰小圆点 -->
            <span class="absolute right-6 top-6 h-4 w-4 rounded-full"
              :style="{ background: sv.tone === 'yellow' ? '#F7D460' : '#0A665F', opacity: 0.6 }"></span>
            <div class="px-6 text-center">
              <h4 class="text-[15px] font-bold" :class="sv.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">{{ sv.title }}</h4>
              <p class="mt-1.5 text-[11.5px] font-medium" :class="sv.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">{{ sv.label }}</p>
              <ul class="mt-1 space-y-0.5">
                <li v-for="it in sv.items" :key="it" class="text-[11px] leading-[1.5]"
                  :class="sv.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">• {{ it }}</li>
              </ul>
            </div>
          </div>
          <!-- 三角形连接（指向下一个圆） -->
          <div v-if="i < services.length - 1" class="my-1 flex justify-center" style="height: 28px">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <polygon points="14,28 0,4 28,4" :fill="sv.tone === 'yellow' ? '#B57850' : '#53918D'" />
            </svg>
          </div>
        </template>
      </div>

      <p class="mt-5 text-center text-[13px] text-[#033B37]">{{ serviceFooter }}</p>
    </div>
  </section>
</template>
