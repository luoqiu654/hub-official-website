<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import DesignStage from '../../components/DesignStage.vue'
import { publicUrl } from '../../composables/publicUrl'
import peopleData from './data.json'

const router = useRouter()

// data.json 里的 logo 是字符串形式的 public 资源路径。JSON 不参与 Vite 的资源改写，
// 所以统一在读取时补上 base，否则部署到子目录时 "/destination/xxx.webp" 会 404。
const people = peopleData.map((p) => ({ ...p, logo: publicUrl(p.logo) }))

// —— 弧线轮播：向下滚动，名字沿弧线滑动并精确卡在 5 个固定槽位，中间槽位高亮 ——
const ARC_START = -56 // 弧线起始角(deg)
const ARC_END = 28 // 弧线结束角(deg)
const ARC_R = 0.82 // 半径：相对盒子半宽/半高(1=贴边)
const CX = 35 // 圆心 X(0=盒子左缘，100=右缘)
const CY = 57 // 圆心 Y(0=盒子顶缘，100=底缘)
const SLOTS = 5 // 弧线上固定的槽位数(同时显示的名字数)
const N = people.length // 名字总数
const STEP = (ARC_END - ARC_START) / SLOTS // 相邻槽位的角度步长
const STEP_PX = 100 // 每滚动该像素 → 前进/后退一个槽位
const MID = (SLOTS - 1) / 2 // 中间槽位索引(0 起，SLOTS=5 时=2)
const earthEl = ref(null) // earth 外壳，用于捕获其内部的滚轮
const displayOffset = ref(0) // 当前显示的步数(浮点，由 quickTo 平滑驱动)
const animOffset = { v: 0 } // GSAP 动画代理值
let targetStep = 0 // 目标整数步数(滚轮驱动)
let accScroll = 0 // 累计滚动像素，跨过 STEP_PX 触发一步
let toOffset = null // gsap.quickTo 句柄

// 弧线上某个角度 → 百分比坐标(相对 earth 盒子)。名字与两端箭头共用同一条公式，
// 箭头因此必然落在同一条弧线上，改 ARC_* 参数时两者一起动。
const arcPoint = (deg) => {
  const a = (deg * Math.PI) / 180
  return { left: CX + 50 * ARC_R * Math.cos(a), top: CY + 50 * ARC_R * Math.sin(a) }
}

// 弧线两端的箭头：一前一后卡在名字串的两侧，标明名字从这里进入 / 离开。
// 名字串占据的区间是 [ARC_START, ARC_START + (SLOTS-1)×STEP]，箭头各向外让出 ARROW_LEAD。
// ARROW_LEAD 取 0.75 个槽位而不是一整个：再往外视觉上虽更松，但弧线下端会被屏幕切掉 ——
// earth 整体下沉 7/24 高度，ARC_END 处（top≈76.2%）已经落到 932px 视口之外，
// 箭头放那儿就完全看不见了。0.75 槽位既让开了两端淡出的名字，又稳稳落在视口内。
// up-arrow / down-arrow 两张图的图元是 95° 左右的 V 形，尖端方向由 alpha 通道量得：
// up ≈ -149.3°(左上)、down ≈ +120.0°(左下)。跟本页面弧线在这两处的切线差 6~9°
// （图是按另一套弧线参数导出的），所以不直接沿用图里烘好的角度，而是按当前弧线算出
// 该转多少：CSS rotate() 以屏幕坐标顺时针为正 → 旋转角 = 目标方向角 - 图元自身尖端角。
const UP_TIP = -149.3
const DOWN_TIP = 120
const ARROW_LEAD = STEP * 0.75
// 弧线在角度 a 处、沿「名字前进方向」的切线单位向量是 (-sin a, cos a)，屏幕坐标 y 向下。
// 头箭头朝后（名字从这里进场），尾箭头朝前（名字从这里离场）。
const tangentDeg = (deg, forward) => {
  const a = (deg * Math.PI) / 180
  const [dx, dy] = forward ? [-Math.sin(a), Math.cos(a)] : [Math.sin(a), -Math.cos(a)]
  return (Math.atan2(dy, dx) * 180) / Math.PI
}
const arcArrows = (() => {
  const headDeg = ARC_START - ARROW_LEAD
  const tailDeg = ARC_START + (SLOTS - 1) * STEP + ARROW_LEAD
  return {
    head: { ...arcPoint(headDeg), rot: tangentDeg(headDeg, false) - UP_TIP },
    tail: { ...arcPoint(tailDeg), rot: tangentDeg(tailDeg, true) - DOWN_TIP },
  }
})()

// 弧线两端箭头：点击 = 后退 / 前进一个名字。刻意复用滚轮那条链路 ——
// 只改整数目标步数 targetStep，再交给同一个 quickTo 去平滑追赶，
// 于是点击与滚动走完全相同的动画，名字同样精确卡在槽位上；
// 两者操作的是同一个 targetStep，交替使用也不会互相打架。
// toOffset 要到 onMounted 才建好，故做空值保护。
const stepBy = (delta) => {
  targetStep += delta
  toOffset?.(targetStep)
}

const arcLabels = computed(() => {
  const o = displayOffset.value
  const items = people.map((p, i) => {
    const u = ((((i + o) % N) + N) % N) // 0..N-1，向下滚动 → u 递增 → 沿弧线下滑
    const { left, top } = arcPoint(ARC_START + u * STEP)
    return {
      name: p.name,
      grade: p.grade,
      index: i,
      u,
      left,
      top,
      visible: u < SLOTS, // 前 SLOTS 个可见，其余隐藏
    }
  })
  // 分段：中间高亮(1)，紧邻高亮的两侧同款但 opacity 0.5，两端 0.2。
  for (const it of items) {
    const feat = it.visible && it.u >= MID - 0.5 && it.u < MID + 0.5 // 中间槽位
    const end = it.visible && (it.u < 0.5 || it.u >= SLOTS - 1.5) // 两端槽位
    const near = it.visible && !feat && !end // 紧邻高亮的两侧
    it.featured = feat
    it.near = near
    it.end = end
    it.opacity = feat ? 1 : near ? 0.5 : end ? 0.2 : 0
  }
  return items
})

// 高亮(中间槽位)对应的那个人：驱动 rocket 上的信息卡与头像。
const featuredPerson = computed(() => {
  const feat = arcLabels.value.find((it) => it.featured)
  if (!feat) return people[0]
  return people[feat.index] || people[0]
})

// 信息卡上要展示的字段：标签 → data.json 里的 key，用 v-for 渲染。
const fields = [
  { label: '去向：', key: 'company' },
  { label: '岗位：', key: 'position' },
  { label: 'base地：', key: 'base' },
  { label: '工作室职位：', key: 'studioRole' },
]

// destination 页：往上滚动（达到阈值）回到上一页 /grow/service。
// 回到 service 是顶层路由切换，其翻页过渡由 App 的 page-in 过渡统一处理。
const THRESHOLD = 500 // 累计上滚量达到该值 → 回上一页
let unbindWheel = null
let unbindEarthWheel = null
let accUp = 0

// —— 火箭下滚交互：小幅沿入场反向飞出又缓慢回位；大幅径直出界并进入 /contact-us ——
const DIR_X = 112 // 入场行进方向(视口坐标)：右·上；沿该方向继续向外即出界
const DIR_Y = -48
const NUDGE_FRAC = 2 // 小幅阶段最多沿入场轨迹走的比例
const EXIT_THRESHOLD = 800 // 累计下滚达到该值 → 径直出界
let accDown = 0 // 累计下滚量(小幅回弹/出界共用)
let downTimer = null // 停下后触发"缓慢回位"的防抖
let nudgeTween = null // 当前火箭位移 tween(回弹/出界)
let escaping = false // 出界进行中，屏蔽后续滚动

onMounted(() => {
  // 火箭：从地球（左下角）飞出 → 抵达后原地缓慢上下晃动。
  // 位置类留在 .rocket（外层），飞出/晃动分别作用于内层元素，避免 transform 互相干扰。
  // 刻意不进 gsap.context：否则组件卸载时 gsapCtx.revert() 会把 .rocket-fly 拉回进场前(0,0)，
  // 造成"火箭飞出后瞬间弹回原位"。让火箭保留离开时的最后一帧状态(已出界=屏幕外)即可。
  const FLY = 2.2 // 飞出时长
  const DELAY = 0.4 // 出场前的停顿
  gsap
    .timeline({ delay: DELAY })
    .fromTo(
      '.rocket-fly',
      { x: '-112vw', y: '48vh' }, // 起始：藏在地球（左下角）
      { x: 0, y: 0, duration: FLY, ease: 'power2.out' }, // 飞抵静止位
    )
  gsap.to('.rocket-bob', {
    y: -16, // 轻微上下晃动
    duration: 1.7,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: DELAY + FLY, // 飞抵后才开始悬浮
  })

  // 用 quickTo 平滑追赶目标步数：滚动只改整数目标，名字滑动结束后精确卡在槽位。
  toOffset = gsap.quickTo(animOffset, 'v', {
    duration: 0.5,
    ease: 'power2.out',
    onUpdate: () => { displayOffset.value = animOffset.v },
  })

  const onEarthWheel = (e) => {
    accScroll += e.deltaY // 向下为正 → 前进一个槽位
    while (accScroll >= STEP_PX) { targetStep += 1; accScroll -= STEP_PX }
    while (accScroll <= -STEP_PX) { targetStep -= 1; accScroll += STEP_PX }
    toOffset(targetStep)
  }
  const earthNode = earthEl.value
  earthNode?.addEventListener('wheel', onEarthWheel, { passive: true })
  unbindEarthWheel = () => earthNode?.removeEventListener('wheel', onEarthWheel)

  // 火箭回位：先缓慢起步吸收方向反转(缓冲)，再快速回程，最后减速降落。
  const settle = () => {
    clearTimeout(downTimer)
    accDown = 0
    nudgeTween?.kill()
    nudgeTween = gsap.to('.rocket-fly', { x: 0, y: 0, duration: 1.6, ease: 'power2.inOut', overwrite: 'auto' })
  }
  // 火箭出界：沿入场行进方向(右上)飞出屏幕，完成后进入 /contact-us。
  const launch = () => {
    if (escaping) return
    escaping = true
    clearTimeout(downTimer)
    nudgeTween?.kill()
    nudgeTween = gsap.to('.rocket-fly', {
      x: '130vw',
      y: '-60vh',
      duration: 0.7,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => router.push('/contact-us'),
    })
  }

  function onWheel(e) {
    if (!e.deltaY) return
    if (escaping) return
    // 地球区域内统一交给名字轮播，不触发火箭 / 翻页。
    if (earthEl.value?.contains(e.target)) return
    if (e.deltaY > 0) {
      // 下滚：火箭沿入场行进方向(右上)飞出。累计未达阈值 → 限幅小幅飞出、停下后缓慢回位；
      // 累计达到阈值 → 径直出界并进入 contact-us。
      accDown += e.deltaY
      if (accDown >= EXIT_THRESHOLD) { launch(); return }
      const frac = Math.min(accDown / EXIT_THRESHOLD, 1)
      nudgeTween?.kill()
      nudgeTween = gsap.to('.rocket-fly', {
        x: DIR_X * NUDGE_FRAC * frac,
        y: DIR_Y * NUDGE_FRAC * frac,
        duration: 0.18,
        ease: 'power1.out',
        overwrite: 'auto',
      })
      clearTimeout(downTimer)
      downTimer = setTimeout(settle, 220)
      return
    }
    // 上滚：达到阈值回上一页。
    accUp = Math.min(accUp - e.deltaY, THRESHOLD)
    if (accUp >= THRESHOLD) {
      window.removeEventListener('wheel', onWheel)
      router.push('/grow/service')
    }
  }
  window.addEventListener('wheel', onWheel, { passive: true })
  unbindWheel = () => window.removeEventListener('wheel', onWheel)
})

onUnmounted(() => {
  // 不做 gsapCtx.revert()：火箭一旦离轨出界就锁定在屏幕外(130vw,-60vh)，
  // 保留最后一帧位置，卸载时不至于被回退到进场前的(0,0)而"瞬间弹回原位"。
  if (toOffset?.tween) toOffset.tween.kill()
  gsap.killTweensOf(['.rocket-fly', '.rocket-bob'])
  if (unbindEarthWheel) unbindEarthWheel()
  if (unbindWheel) unbindWheel()
  clearTimeout(downTimer)
  nudgeTween?.kill()
})
</script>

<template>
  <div class="destination">
    <!-- 铺底背景：全屏 fixed，舞台外，永远填满真实视口。场景元素放舞台内，
         按 1707×932（基准视口）设计坐标等比缩放——基准下 scale=1、舞台盒=视口，
         场景元素不改内部 CSS 即与原版完全一致；缩放后整体等比、无偏差。 -->
    <img src="/destination/bg.webp" class="fixed top-[-150px] right-[-150px] z-0">
    <DesignStage :design-w="1707" :design-h="932" class="z-10">
      <div ref="earthEl" class="earth fixed z-1 bottom-0 left-0 scale-[0.8] -translate-x-5/12 translate-y-7/24">
        <img src="/destination/earth.webp" alt="" class="block pointer-events-none select-none">
        <div class="absolute inset-0">
          <!-- 弧线两端的箭头：在名字之前，若与首尾淡出的名字重叠，让名字压在上层。
               用 button 而不是裸 img：可点击 + 键盘可达（与 what-we-do2 的 .car-arrow 一致）。
               --rot 由弧线切线算出（见 <script>），CSS 里连同居中偏移一起应用 -->
          <button
            type="button"
            class="arc-arrow arc-arrow--up"
            aria-label="上一个"
            :style="{ left: `${arcArrows.head.left}%`, top: `${arcArrows.head.top}%`, '--rot': `${arcArrows.head.rot}deg` }"
            @click="stepBy(-1)"
          >
            <img src="/destination/up-arrow.webp" alt="" />
          </button>
          <button
            type="button"
            class="arc-arrow arc-arrow--down"
            aria-label="下一个"
            :style="{ left: `${arcArrows.tail.left}%`, top: `${arcArrows.tail.top}%`, '--rot': `${arcArrows.tail.rot}deg` }"
            @click="stepBy(1)"
          >
            <img src="/destination/down-arrow.webp" alt="" />
          </button>
          <span
            v-for="l in arcLabels"
            :key="l.name"
            class="arc-name"
            :class="{ 'arc-name--featured': l.featured, 'arc-name--near': l.near, 'arc-name--end': l.end }"
            :style="{ left: `${l.left}%`, top: `${l.top}%`, transform: 'translate(-50%, -50%)', opacity: l.visible ? l.opacity : 0 }"
          >{{ l.name }} {{ l.grade }}</span>
        </div>
      </div>
      <div class="rocket fixed scale-[0.6] translate-x-1/5 -translate-y-1/6">
        <div class="rocket-fly">
          <div class="rocket-bob">
            <img src="/destination/rocket.webp" alt="" class="block">
            <Transition name="card-fade" mode="out-in">
              <div class="rocket-card" :key="featuredPerson.name">
                <div class="rc-row" v-for="f in fields" :key="f.key">
                  <span class="rc-key">{{ f.label }}</span>
                  <span class="rc-val">{{ featuredPerson[f.key] || '—' }}</span>
                </div>
              </div>
            </Transition>
            <Transition name="card-fade" mode="out-in">
              <img v-if="featuredPerson.logo" :key="featuredPerson.name" :src="featuredPerson.logo" class="tencent">
            </Transition>
          </div>
        </div>
      </div>
      <img src="/destination/triangle.webp" class="fixed scale-[0.6] left-1/2 top-5/12 origin-center -rotate-3 -translate-x-2/1">
    </DesignStage>
  </div>
</template>

<style scoped>
/* 弧线两端的箭头：与名字共用同一条弧线（位置由 arcPoint() 算，见 <script>）。
   两张原图都是 302×302 的正方形画布，图元只占中间一小块（up 49×63、down 63×49），
   所以 width 要按「画布 ÷ 图元」放大，画出来的图元才有 --glyph-h 这么高；
   而图元中心相对画布中心又偏了 (--off)，必须用 translate 补回来 ——
   否则 translate(-50%,-50%) 居中的是画布，箭头会整体偏掉一小截。
   rotate(--rot) 由 JS 按弧线切线给出，写在 translate 之后：CSS 变换从右往左作用于
   局部坐标，于是「先绕图元中心自转、再把图元中心平移到位」；transform-origin 因此
   必须钉在图元中心（而不是画布中心），否则自转会把图元甩离弧线。
   要调箭头大小只改 --glyph-h（图元自身高度，px）。 */
.arc-arrow {
  --glyph-h: 44px;
  position: absolute;
  border: 0;
  padding: 0;
  background: transparent;
  line-height: 0;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;
}

.arc-arrow:hover {
  opacity: 0.7;
}

.arc-arrow:focus-visible {
  opacity: 0.7;
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 4px;
}

/* 图元铺满按钮盒；点击落到 button 上，别让 img 抢走事件目标 */
.arc-arrow img {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
}

/* up：图元 49×63，中心偏画布中心 (+8.5,+7.5)px = (+2.81%,+2.48%) */
.arc-arrow--up {
  width: calc(var(--glyph-h) * 302 / 63);
  transform-origin: 52.81% 52.48%;
  transform: translate(calc(-50% - 2.81%), calc(-50% - 2.48%)) rotate(var(--rot, 0deg));
}

/* down：图元 63×49，中心偏画布中心 (+7.5,-8.5)px = (+2.48%,-2.81%) */
.arc-arrow--down {
  width: calc(var(--glyph-h) * 302 / 49);
  transform-origin: 52.48% 47.19%;
  transform: translate(calc(-50% - 2.48%), calc(-50% + 2.81%)) rotate(var(--rot, 0deg));
}

/* 圆弧上的名字：沿弧线切线方向，轻微发光贴合太空氛围 */
.arc-name {
  position: absolute;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.92);
  font-size: 26px; /* 地球外层 scale 0.8，视觉约 21px */
  font-weight: 500;
  letter-spacing: 2px;
  pointer-events: none;
  user-select: none;
  transition: opacity 0.35s ease; /* 滑入滑出时淡入淡出 */
}

/* 高亮在固定弧线位置上的那个名字（随轮播变化） */
.arc-name--featured {
  width: 155px;
  height: 48px;
  opacity: 1;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: 2px;
  line-height: 47.74px;
  color: rgba(255, 248, 224, 1);
  text-shadow:
      0 0 10px rgba(0, 0, 0, 0.5),
      0 0 18px rgba(44, 195, 255, 0.55);
}

/* 紧邻高亮的两侧名字：同款样式，透明度 0.5 */
.arc-name--near {
  width: 155px;
  height: 48px;
  opacity: 0.5;
  font-size: 36px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 47.74px;
  color: white;
}

/* 弧线两端的名字：淡化、略窄 */
.arc-name--end {
  width: 148px;
  height: 48px;
  opacity: 0.2;
  font-size: 36px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 47.74px;
  color: white;
}

/* 火箭上的「去向信息卡」：跟着火箭容器一起缩放。
   正文全部为深青 rgba(3,59,55,1)，行高固定 47.74；标签 36/500，值 24/400。 */
.rocket-card {
  position: absolute;
  left: 290px;
  top: 353px;
  width: 700.8px;
  min-height: 256.42px;
  box-sizing: border-box;
  padding: 30px 24px;
  opacity: 1;
  color: rgba(3, 59, 55, 1);
  font-size: 30px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 77.74px;
  transform: rotate(-14deg); /* 整体倾斜 */
}

/* 标签与值内联排在同一行，只有触碰到卡片右边界才自然换行 */
.rc-row {
  line-height: 77.74px;
}

.rc-key {
  font-size: 56px;
  font-weight: 500;
  letter-spacing: 2px;
  color: rgba(3, 59, 55, 1);
  margin-right: 6px;
}

.rc-val {
  font-size: 40px;
  font-weight: 400;
  letter-spacing: 2px;
  color: rgba(3, 59, 55, 1);
}

/* 腾讯 头像：位于卡片右侧、相对 .rocket 定位，用圆形边界裁剪 */
.tencent {
  position: absolute;
  left: 950px;  /* 卡片右缘(~991)偏右处 */
  top: 331px;    /* 与卡片垂直大致居中 */
  width: 300px;
  height: 300px;
  box-sizing: border-box;
  object-fit: cover;
  transform: rotate(-14deg);
  border-radius: 50%;        /* 圆边界裁剪 */
  border: 10px solid #0A665F; /* 深青外边界 */
}

/* 高亮名字切换时，卡片与头像的快速淡入淡出 */
.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 0.18s ease;
}
.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
}
</style>