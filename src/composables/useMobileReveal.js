import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// 移动端通用进场动画工具：ScrollTrigger 驱动，进入视口 80% 时触发一次
// 用法：mountReveal(sectionEl, { targets: '.reveal', y: 40, stagger: 0.08 })
// prefers-reduced-motion 时直接显示最终态，不播动画

gsap.registerPlugin(ScrollTrigger)

const reduced = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function mountReveal(sectionEl, opts = {}) {
  if (!sectionEl || reduced) return null

  const {
    targets = '.reveal',
    y = 36,
    opacity = 0,
    duration = 0.7,
    stagger = 0.08,
    ease = 'power3.out',
    start = 'top 80%',
  } = opts

  const els = sectionEl.querySelectorAll(targets)
  if (!els.length) return null

  gsap.set(els, { y, opacity })
  const tween = gsap.to(els, {
    y: 0,
    opacity: 1,
    duration,
    stagger,
    ease,
    scrollTrigger: {
      trigger: sectionEl,
      start,
      once: true,
    },
  })
  return tween
}

export function killReveal(tween) {
  if (tween) tween.kill()
  ScrollTrigger.getAll().forEach((st) => {
    if (st.trigger && st.trigger.isConnected === false) st.kill()
  })
}
