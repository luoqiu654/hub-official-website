<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { publicUrl } from '../../composables/publicUrl'
import { mountReveal, killReveal } from '../../composables/useMobileReveal'

const sectionRef = ref(null)
let revealTween = null
onMounted(() => { revealTween = mountReveal(sectionRef.value) })
onUnmounted(() => killReveal(revealTween))

// 文案与桌面 about-us / about-us2 保持一致（同一数据事实）
const intro = [
  'CQUPTHUB 是重庆邮电大学学生自发组织的互联网产品实践团队。我们长期专注于数字教材前端可视化开发、教育类互动产品研发、互联网产品设计以及 AI 应用探索。通过真实项目实践，将产品设计、UI 设计、前端开发、后端开发等能力结合，探索互联网技术与教育场景融合的新模式。',
  '我们的团队由一群充满热爱、激情，富有创造力和专业技术的伙伴组成，对数字教材和小游戏开发有深厚的理解和丰富的经验。我们紧跟行业发展趋势，不断探索创新，力求将最新的前端技术融入到我们的作品中，为用户带来卓越的视觉和交互体验。',
]
const history = '我们的前身是 2016 年前的实验室，经过多年发展逐步成型，疫情期间暂停招新后，现由学长张政余重启并持续运营，目前已进入全新发展阶段。'
const statusList = [
  '前端开发需求快速增长',
  '项目数量稳步增加',
  '多项目并行协作需求提升',
  '技术梯队建设需求明显',
]
// 三张特性卡片（图片内已含卡片边框 + 标题 + 插画，原样复用）
const features = [
  publicUrl('/aboutus/feature1.webp'),
  publicUrl('/aboutus/feature2.webp'),
  publicUrl('/aboutus/feature3.webp'),
]
</script>

<template>
  <section id="about" ref="sectionRef" class="px-5 py-14 box-border" style="background: linear-gradient(180deg, #fafafa 0%, #e2f5f0 100%)">
    <!-- 区块标题 -->
    <div class="reveal mb-6 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">关于我们</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">ABOUT US</p>
    </div>

    <!-- 引言 -->
    <blockquote class="reveal mx-auto max-w-[560px] rounded-2xl border border-[#F7D460]/70 bg-[#FFF8E0] px-5 py-4 text-center text-[14px] leading-relaxed font-medium text-[#033B37]">
      “探索技术边界，创造互联网价值；技术连接教育，实践创造未来”
    </blockquote>

    <!-- 特性卡片：图片原样，纵向堆叠 -->
    <div class="reveal mt-8 flex flex-col items-center gap-6">
      <img v-for="src in features" :key="src" :src="src" alt="工作室特性" class="w-full max-w-[520px] h-auto rounded-2xl" loading="lazy" />
    </div>

    <!-- 简介 / 历史 / 现状 -->
    <div class="mt-10 space-y-6">
      <section class="reveal rounded-2xl bg-white/80 p-5 shadow-sm border border-[#0A665F]/15">
        <h3 class="mb-2 text-[18px] font-semibold text-[#033B37]">工作室简介</h3>
        <p v-for="(p, i) in intro" :key="i" class="mt-2 text-[14px] leading-[1.8] text-[#033B37]">{{ p }}</p>
      </section>
      <section class="rounded-2xl bg-white/80 p-5 shadow-sm border border-[#0A665F]/15">
        <h3 class="mb-2 text-[18px] font-semibold text-[#033B37]">工作室历史</h3>
        <p class="text-[14px] leading-[1.8] text-[#033B37]">{{ history }}</p>
      </section>
      <section class="rounded-2xl bg-white/80 p-5 shadow-sm border border-[#0A665F]/15">
        <h3 class="mb-2 text-[18px] font-semibold text-[#033B37]">工作室现状</h3>
        <ul class="space-y-2">
          <li v-for="item in statusList" :key="item" class="flex items-start text-[14px] leading-[1.6] text-[#033B37]">
            <span class="mt-[7px] mr-3 inline-block h-2 w-2 shrink-0 rounded-full bg-[#2f8a84]"></span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- 底部标语 -->
    <p class="mt-8 text-center text-[14px] font-medium tracking-wide text-[#2f8a84]">
      产品探索&nbsp;&nbsp;技术实践&nbsp;&nbsp;AI创新&nbsp;&nbsp;数字教育
    </p>
  </section>
</template>
