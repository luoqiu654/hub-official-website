<script setup>
// 移动端 · 成长体系区块：合并桌面 grow / grow-community / grow-service 三页内容为纵向信息流

// 成长路径（桌面 grow-main 4 张卡片）
const growthSteps = [
  {
    title: '1. 学习成长',
    desc: '了解互联网产品研发流程，掌握岗位基础能力。',
    points: ['产品设计', 'UI设计', '前端开发', 'AI工具应用'],
    tone: 'yellow',
  },
  {
    title: '2. 项目实践',
    desc: '参与真实项目，在实践中提升能力。',
    points: ['数字教材项目', '校园互联网项目', '企业合作项目', '完整流程：需求分析、产品设计、开发实现、项目交付'],
    tone: 'green',
  },
  {
    title: '3. 能力提升',
    desc: '从项目参与者成长为独立贡献者。',
    points: ['项目经验', '作品成果', '团队协作能力'],
    tone: 'yellow',
  },
  {
    title: '4. 核心培养',
    desc: '优秀成员可进一步参与：',
    points: ['项目负责人工作', '团队协作管理', '新人成长指导'],
    tone: 'green',
  },
]
const growCaption = 'CQUPTHUB 帮助成员从技术兴趣出发，通过真实项目实践，逐步成长为具备互联网竞争力的青年人才'

// 成长社区（桌面 grow-community 三张卡）
const community = {
  title: 'HUB实战成长社区',
  subtitle: '我们拥有真实的项目资源',
  process: {
    title: '项目制成长',
    steps: ['加入社区', '能力匹配', '进入项目组', '负责人带教', '完成真实项目', '获得项目履历'],
  },
  gains: {
    title: '成员能获得什么',
    items: ['真实产品开发经历', '完整项目流程体验', '团队协作经验', '简历资产', '产品思维 / 技术能力', '求职竞争力'],
  },
  why: {
    title: '为什么成立社区',
    fields: [
      { tag: '学生', text: '不知道行业需要哪些技术，没有项目经历，简历缺少亮点，不知道如何进入互联网行业。' },
      { tag: 'HUB提供', text: '真实项目 + 团队指导 + 完整流程 + 职业辅导。' },
    ],
  },
  caption: '面向校内外同学的互联网项目实践成长社区 · 真实项目 × 专业带教 × 职业成长',
}

// 求职增值服务（桌面 grow-service 5 张圆卡）
const services = [
  { title: '职业方向规划', label: '帮助：', items: ['分析个人能力', '规划发展路线', '匹配岗位方向'] },
  { title: '秋招陪跑', label: '内容：', items: ['岗位分析', '投递规划', '进度跟踪'] },
  { title: '面试复盘', label: '帮助：', items: ['分析问题', '优化表达', '提升通过率'] },
  { title: '简历精修', label: '服务：', items: ['项目经历优化', '简历结构调整', '岗位匹配优化'] },
  { title: '模拟面试', label: '包含：', items: ['技术面模拟', '产品面模拟'] },
]
const serviceFooter = '面向互联网求职者的职业成长服务 · HUB Career'
</script>

<template>
  <section id="grow" class="px-5 py-14 box-border" style="background: linear-gradient(180deg, #fff8e0 0%, #fafafa 45%, #eaf5f0 100%)">
    <div class="mb-6 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">成长体系</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">GROWTH</p>
    </div>

    <!-- 一、成长路径 -->
    <div class="mb-12">
      <h3 class="mb-3 text-[18px] font-semibold text-[#033B37]">成长路径</h3>
      <p class="mb-4 text-[13px] leading-relaxed text-[#17514b]">在真实项目中成长，将能力转化为未来职业竞争力</p>
      <div class="space-y-3">
        <article v-for="s in growthSteps" :key="s.title"
          class="rounded-2xl border-[3px] border-white p-4 shadow-md ring-1"
          :class="s.tone === 'yellow' ? 'bg-[#FFF8E0] ring-[#F7D460]' : 'bg-[#EBF5F0] ring-[#0A665E]'">
          <h4 class="text-[16px] font-bold" :class="s.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">{{ s.title }}</h4>
          <p class="mt-1 text-[13px] font-medium leading-relaxed" :class="s.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">{{ s.desc }}</p>
          <ul class="mt-2 space-y-1">
            <li v-for="pt in s.points" :key="pt" class="flex items-start text-[13px] leading-[1.6]"
              :class="s.tone === 'yellow' ? 'text-[#917109]' : 'text-[#033B37]'">
              <span class="mr-2 text-[#2f8a84]">•</span><span>{{ pt }}</span>
            </li>
          </ul>
        </article>
      </div>
      <p class="mt-4 text-center text-[13px] leading-relaxed text-[#033B37]">{{ growCaption }}</p>
    </div>

    <!-- 二、实战成长社区 -->
    <div class="mb-12">
      <h3 class="mb-1 text-[18px] font-semibold text-[#033B37]">{{ community.title }}</h3>
      <p class="mb-4 text-[13px] text-[#0A665F]">{{ community.subtitle }}</p>

      <article class="mb-3 rounded-2xl border-[3px] border-white bg-[#EBF5F0]/80 p-4 shadow-md ring-1 ring-[#0A665F]/30">
        <h4 class="text-[16px] font-bold text-[#033B37]">{{ community.process.title }}</h4>
        <p class="mt-2 text-[13px] font-medium text-[#033B37]">流程：</p>
        <ol class="mt-1 space-y-1.5">
          <li v-for="(st, i) in community.process.steps" :key="st" class="flex items-start text-[13px] leading-[1.6] text-[#033B37]">
            <span class="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A665F] text-[11px] font-bold text-white">{{ i + 1 }}</span>
            <span>{{ st }}</span>
          </li>
        </ol>
      </article>

      <article class="mb-3 rounded-2xl border-[3px] border-white bg-[#FFF8E0]/80 p-4 shadow-md ring-1 ring-[#F7D460]">
        <h4 class="text-[16px] font-bold text-[#917109]">{{ community.gains.title }}</h4>
        <ul class="mt-2 space-y-1.5">
          <li v-for="g in community.gains.items" :key="g" class="text-[13px] leading-[1.6] text-[#917109]">「{{ g }}」</li>
        </ul>
      </article>

      <article class="rounded-2xl border-[3px] border-white bg-[#EBF5F0]/80 p-4 shadow-md ring-1 ring-[#0A665F]/30">
        <h4 class="text-[16px] font-bold text-[#033B37]">{{ community.why.title }}</h4>
        <div v-for="f in community.why.fields" :key="f.tag" class="mt-3">
          <span class="text-[14px] font-bold text-[#0A665F]">{{ f.tag }}：</span>
          <p class="mt-1 text-[13px] leading-[1.7] text-[#033B37]">{{ f.text }}</p>
        </div>
      </article>

      <p class="mt-4 text-center text-[13px] text-[#033B37]">{{ community.caption }}</p>
    </div>

    <!-- 三、求职增值服务 -->
    <div>
      <h3 class="mb-4 text-[18px] font-semibold text-[#033B37]">求职增值服务</h3>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article v-for="sv in services" :key="sv.title"
          class="rounded-2xl border-[3px] border-white p-4 shadow-md ring-1"
          :class="sv.title === '简历精修' || sv.title === '模拟面试' ? 'bg-[#FFF8E0] ring-[#F7D460]' : 'bg-[#EBF5F0] ring-[#0A665F]/30'">
          <h4 class="text-[16px] font-bold" :class="sv.title === '简历精修' || sv.title === '模拟面试' ? 'text-[#917109]' : 'text-[#033B37]'">{{ sv.title }}</h4>
          <p class="mt-2 text-[13px] font-medium text-[#033B37]">{{ sv.label }}</p>
          <ul class="mt-1 space-y-1">
            <li v-for="it in sv.items" :key="it" class="flex items-start text-[13px] leading-[1.6] text-[#033B37]">
              <span class="mr-2 text-[#2f8a84]">•</span><span>{{ it }}</span>
            </li>
          </ul>
        </article>
      </div>
      <p class="mt-4 text-center text-[13px] text-[#033B37]">{{ serviceFooter }}</p>
    </div>
  </section>
</template>
