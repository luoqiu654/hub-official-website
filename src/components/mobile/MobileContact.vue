<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { publicUrl } from '../../composables/publicUrl'
import { mountReveal, killReveal } from '../../composables/useMobileReveal'

const sectionRef = ref(null)
let revealTween = null

// 三个联系图标：分别绕外层三个同心圆运动，半径/周期不同 → 速度不同
const iconOrbits = [
  { name: 'email', src: publicUrl('/contact-us/email.webp'), radius: 82, period: 20, start: 0.00, size: 44,
    email: '1950708010@qq.com', alt: '点击复制邮箱' },
  { name: 'redbook', src: publicUrl('/contact-us/redbook.webp'), radius: 112, period: 14, start: 0.33, size: 44,
    link: 'https://www.xiaohongshu.com/user/profile/67c0f46a0000000006010608?xsec_token=AB1ZXpyIYDmmIreEIYUSm6PUBgLFzy2pYYuVBcv79q0kI%3D&xsec_source=pc_search',
    alt: '点击进入官方账号' },
  { name: 'wechat', src: publicUrl('/contact-us/wechat.webp'), radius: 142, period: 17, start: 0.66, size: 44,
    qr: publicUrl('/contact-us/微信群.jpg') },
]
const iconEls = {}
let tweens = []
const rocketEl = ref(null)

function openContactLink(link) { if (link) window.open(link, '_blank', 'noopener,noreferrer') }
const copiedTip = ref('')
let copyTimer = null
function legacyCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
  document.body.appendChild(ta); ta.select()
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
const qrVisible = ref(false)
const qrSrc = ref('')
function openQr(src) { qrSrc.value = src; qrVisible.value = true }
function closeQr() { qrVisible.value = false }
function handleIconClick(ic) {
  if (ic.link) { openContactLink(ic.link); return }
  if (ic.email) { copyEmail(ic.email); return }
  if (ic.qr) { openQr(ic.qr) }
}

// 火箭：飞入最内圆后顺时针绕圈
const R_INNER = 52
const ORBIT_PERIOD = 14
function makeSteer(el) {
  let px = 0, py = 0, init = false
  return (x, y) => {
    if (!init) { px = x; py = y; init = true; return }
    const dx = x - px, dy = y - py
    if (dx * dx + dy * dy > 0.25) {
      gsap.set(el, { rotation: Math.atan2(dy, dx) * 180 / Math.PI })
      px = x; py = y
    }
  }
}
function startRocket(el) {
  const steer = makeSteer(el)
  gsap.set(el, { x: 0, y: -200 })
  gsap.to(el, {
    x: 0, y: -R_INNER, duration: 1.2, ease: 'power2.out', delay: 0.3,
    onUpdate: function() {
      const x = Number(gsap.getProperty(el, 'x')), y = Number(gsap.getProperty(el, 'y'))
      steer(x, y)
    },
    onComplete: () => {
      const ang = { v: -Math.PI / 2 }
      const place = () => {
        const x = R_INNER * Math.cos(ang.v), y = R_INNER * Math.sin(ang.v)
        gsap.set(el, { x, y }); steer(x, y)
      }
      place()
      const tw = gsap.to(ang, { v: -Math.PI / 2 + Math.PI * 2, duration: ORBIT_PERIOD, ease: 'none', repeat: -1, onUpdate: place })
      tweens.push(tw)
    },
  })
}

onMounted(() => {
  revealTween = mountReveal(sectionRef.value)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  iconOrbits.forEach((o) => {
    const el = iconEls[o.name]
    if (!el) return
    const angle = { t: o.start }
    const place = () => {
      const rad = angle.t * Math.PI * 2
      gsap.set(el, { x: o.radius * Math.cos(rad), y: o.radius * Math.sin(rad) })
    }
    place()
    if (!reduced) {
      const tw = gsap.to(angle, { t: o.start + 1, duration: o.period, ease: 'none', repeat: -1, onUpdate: place })
      tweens.push(tw)
    }
  })

  if (rocketEl.value && !reduced) startRocket(rocketEl.value)
})

onUnmounted(() => {
  killReveal(revealTween)
  if (copyTimer) clearTimeout(copyTimer)
  tweens.forEach((t) => t.kill())
  tweens = []
})
</script>

<template>
  <section id="contact" ref="sectionRef" class="px-5 py-14 box-border overflow-hidden" style="background: linear-gradient(180deg, #fafafa 0%, #e4f3ec 100%)">
    <div class="reveal mb-4 text-center">
      <h2 class="text-[26px] font-bold text-[#033B37]">联系我们</h2>
      <p class="mt-1 text-[13px] tracking-widest text-[#2f8a84]">CONTACT US</p>
    </div>

    <!-- 同心圆轨道舞台 -->
    <div class="orbit-stage relative mx-auto mt-2 h-[340px] w-[340px]">
      <svg class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        width="340" height="340" viewBox="0 0 340 340">
        <g fill="none" stroke="#033B37" stroke-width="2" stroke-linecap="round" stroke-dasharray="0 14">
          <circle cx="170" cy="170" r="52" />
          <circle cx="170" cy="170" r="82" />
          <circle cx="170" cy="170" r="112" />
          <circle cx="170" cy="170" r="142" />
        </g>
      </svg>

      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p class="text-[15px] font-bold text-[#033B37]">CQUPTHUB</p>
        <p class="mt-0.5 text-[10px] tracking-widest text-[#0A665F]">CONNECT</p>
      </div>

      <img v-for="ic in iconOrbits" :key="ic.name"
        :src="ic.src" :alt="ic.alt || ''"
        :ref="(el) => (iconEls[ic.name] = el)"
        @click="handleIconClick(ic)"
        class="contact-icon absolute left-1/2 top-1/2 z-10 cursor-pointer active:scale-90 transition-transform"
        :style="{ width: ic.size + 'px', height: ic.size + 'px', marginLeft: -ic.size / 2 + 'px', marginTop: -ic.size / 2 + 'px' }"
      />

      <img ref="rocketEl" src="/grow/rocket.webp" alt=""
        class="absolute left-1/2 top-1/2 z-20 pointer-events-none"
        style="width: 52px; height: 52px; margin-left: -26px; margin-top: -26px" />
    </div>

    <Transition name="tip-fade">
      <div v-if="copiedTip"
        class="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-[13px] text-white whitespace-nowrap">
        {{ copiedTip }}
      </div>
    </Transition>

    <Transition name="qr-fade">
      <div v-if="qrVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 cursor-pointer"
        @click="closeQr">
        <div class="relative pointer-events-auto" @click.stop>
          <img :src="qrSrc" alt="微信群二维码" class="max-w-[80vw] max-h-[70vh] rounded-2xl shadow-2xl">
          <button class="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black text-xl font-bold shadow-lg cursor-pointer"
            @click="closeQr">×</button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.tip-fade-enter-active, .tip-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.tip-fade-enter-from, .tip-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
.qr-fade-enter-active, .qr-fade-leave-active { transition: opacity 0.2s ease; }
.qr-fade-enter-from, .qr-fade-leave-to { opacity: 0; }
</style>
