<script setup>
import { ref } from 'vue'
import { publicUrl } from '../../composables/publicUrl'

// 联系渠道（与桌面 contact-us 同源数据：邮箱 / 小红书 / 微信群二维码）
const channels = [
  {
    name: 'email',
    label: '电子邮箱',
    value: '1950708010@qq.com',
    src: publicUrl('/contact-us/email.webp'),
    email: '1950708010@qq.com',
    desc: '点击复制邮箱',
  },
  {
    name: 'redbook',
    label: '小红书',
    value: '@HUB官方账号',
    src: publicUrl('/contact-us/redbook.webp'),
    link: 'https://www.xiaohongshu.com/user/profile/67c0f46a0000000006010608?xsec_token=AB1ZXpyIYDmmIreEIYUSm6PUBgLFzy2pYYuVBcv79q0kI%3D&xsec_source=pc_search',
    desc: '点击进入官方账号',
  },
  {
    name: 'wechat',
    label: '微信群',
    value: '扫码加入工作室微信群',
    src: publicUrl('/contact-us/wechat.webp'),
    qr: publicUrl('/contact-us/微信群.jpg'),
    desc: '点击查看二维码',
  },
]

// 复制邮箱（含非安全上下文兜底）
const copiedTip = ref('')
let copyTimer = null
function legacyCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch {}
  document.body.removeChild(ta)
}
async function copyEmail(email) {
  let ok = true
  try { await navigator.clipboard.writeText(email) } catch { ok = false }
  if (!ok) legacyCopy(email)
  copiedTip.value = '复制邮箱成功'
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copiedTip.value = '' }, 1600)
}

// 微信群二维码弹层
const qrVisible = ref(false)
const qrSrc = ref('')
function handleClick(c) {
  if (c.link) { window.open(c.link, '_blank', 'noopener,noreferrer'); return }
  if (c.email) { copyEmail(c.email); return }
  if (c.qr) { qrSrc.value = c.qr; qrVisible.value = true }
}
</script>

<template>
  <section id="contact" class="px-5 py-14 box-border" style="background: linear-gradient(180deg, #fafafa 0%, #e4f3ec 100%)">
    <div class="mb-6 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">联系我们</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">CONTACT</p>
    </div>

    <div class="mx-auto max-w-[560px] space-y-4">
      <button
        v-for="c in channels"
        :key="c.name"
        type="button"
        class="flex w-full items-center gap-4 rounded-2xl border-[3px] border-white bg-white/90 p-4 text-left shadow-md ring-1 ring-[#033B37]/20 active:scale-[0.98] transition-transform"
        @click="handleClick(c)"
      >
        <img :src="c.src" :alt="c.label" class="h-12 w-12 shrink-0 object-contain" loading="lazy" />
        <span class="min-w-0 flex-1">
          <span class="block text-[15px] font-bold text-[#033B37]">{{ c.label }}</span>
          <span class="mt-0.5 block truncate text-[13px] text-[#17514b]">{{ c.desc }}</span>
        </span>
        <span class="shrink-0 rounded-full bg-[#EAF5F0] px-3 py-1 text-[12px] font-bold text-[#0A665F]">点击</span>
      </button>
    </div>

    <p class="mt-8 text-center text-[13px] text-[#0A665F]">CQUPTHUB · 重庆邮电大学工作室</p>

    <!-- 复制成功提示 -->
    <div v-if="copiedTip"
      class="fixed left-1/2 top-14 z-50 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white whitespace-nowrap">
      {{ copiedTip }}
    </div>

    <!-- 微信群二维码弹层：点遮罩关闭 -->
    <Transition name="qr-fade">
      <div v-if="qrVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
        @click="qrVisible = false">
        <div class="relative max-w-[80vw] rounded-2xl bg-white p-4 shadow-2xl" @click.stop>
          <img :src="qrSrc" alt="微信群二维码" class="max-h-[60vh] w-auto rounded-xl" />
          <button type="button"
            class="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-[#033B37] shadow-md"
            aria-label="关闭二维码" @click="qrVisible = false">×</button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.qr-fade-enter-active, .qr-fade-leave-active { transition: opacity 0.2s ease; }
.qr-fade-enter-from, .qr-fade-leave-to { opacity: 0; }
</style>
