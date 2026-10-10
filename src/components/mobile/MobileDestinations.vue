<script setup>
import { publicUrl } from '../../composables/publicUrl'
// 与桌面 destination 页引用同一份数据：任何成员变更两端自动同步
import peopleData from '../../views/destination/data.json'

// data.json 里的 logo 是字符串形式的 public 路径，需显式走 publicUrl 适配子目录部署
const members = peopleData.map((m) => ({ ...m, logo: publicUrl(m.logo) }))

// 成员卡上要展示的字段：标签 → data.json 里的 key（与桌面信息卡同口径）
const fields = [
  { label: '年级', key: 'grade' },
  { label: '岗位', key: 'position' },
  { label: '公司', key: 'company' },
  { label: '城市', key: 'base' },
  { label: '工作室角色', key: 'studioRole' },
]
</script>

<template>
  <section id="destinations" class="px-5 py-14 box-border" style="background: linear-gradient(180deg, #eaf5f0 0%, #fafafa 100%)">
    <div class="mb-6 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">成员去向</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">DESTINATION</p>
    </div>

    <div class="mx-auto max-w-[560px] space-y-4">
      <article v-for="m in members" :key="m.name"
        class="flex gap-4 rounded-2xl border-[3px] border-white bg-white/90 p-4 shadow-md ring-1 ring-[#033B37]/20">
        <img :src="m.logo" :alt="m.company || m.name" class="h-16 w-16 shrink-0 rounded-xl border border-[#0A665F]/20 object-cover" loading="lazy" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2">
            <h3 class="text-[17px] font-bold text-[#033B37]">{{ m.name }}</h3>
            <span class="text-[12px] font-medium text-[#2f8a84]">{{ m.grade }}</span>
            <span v-if="m.note" class="rounded-full bg-[#F7D460] px-2 py-0.5 text-[11px] font-bold text-[#917109]">{{ m.note }}</span>
          </div>
          <dl class="mt-2 space-y-1">
            <div v-for="f in fields" :key="f.key" class="flex gap-2 text-[13px] leading-[1.5]">
              <dt class="w-20 shrink-0 text-[#0A665F]">{{ f.label }}</dt>
              <dd class="min-w-0 text-[#033B37]">{{ m[f.key] || '—' }}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  </section>
</template>
