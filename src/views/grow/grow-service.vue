<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { bindGrowWheel } from '../../composables/useGrowScene'

const router = useRouter()

// ================= grow 服务页整组缩放 =================
// grow 族是「铺满视口」的高画布设计(vw/vh 定位 + 固定 px 圆),与全局 1920×1080 设计基准不同。
// 圆与三角是几何相连的整组:必须用同一原点统一缩放,否则三角顶点会脱离圆缘。
// 缩放基准取设计参考视口(1707×932),使参考屏恒为 1.0 → 参考屏构图不变,更小的屏才等比缩小。
const GROW_REF_W = 1707
const GROW_REF_H = 932
const svcScale = ref(1)
let resizeTimer = null
function computeScale() {
  svcScale.value = Math.min(window.innerWidth / GROW_REF_W, window.innerHeight / GROW_REF_H)
}
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(computeScale, 300)
}

// ================= grow 分路由（服务/展望 service） =================
// 场景动画与滚动交互由 useGrowScene 共享：
//   - 小幅滚动：场景按比例拉动 + 回弹
//   - 大幅下滚：猛回弹后切回首页 /
//   - 大幅上滚：回到 /grow/community
// 本页内容：三张职业方向规划圆形服务卡片，以「秋招陪跑」为水平中心整组水平居中；
//   各卡间距 504px（中心到中心），纵向各自按设计稿位置（114 / 190 / 120）。
//   - 职业方向规划：标题 + 帮助：列表整体在圆内正中间
//   - 秋招陪跑：标题/装饰圆点/列表按设计稿相对圆坐标绝对定位（左侧式排版）
//   - 面试复盘：与秋招陪跑同理，位于其右侧

let unbindWheel = null

onMounted(() => {
  computeScale()
  window.addEventListener('resize', onResize)
  unbindWheel = bindGrowWheel({
    onUp: () => router.push('/grow/community'),
    onDown: () => router.push('/destination'), // 下滚到 destination：顶层路由切换，由 App 的 page-in 翻页过渡
    flyOut: null,
    backDramatic: true, // 回退到 /grow/community 是 grow 内部切换，播与前进一样的弹簧 + toss
  })
  // 整页进入动画：5 圆 + 4 三角形按横向位置从左到右，逐个先后淡入。
  // 用各元素中心 x 排序（左→右），每个错开 0.15s，各自 opacity 0→1。
  const items = gsap.utils.toArray('.svc-circle, .svc-tri, .svc-tri2, .svc-tri3, .svc-tri4')
    .sort((a, b) => {
      const ax = a.getBoundingClientRect()
      const bx = b.getBoundingClientRect()
      return (ax.left + ax.width / 2) - (bx.left + bx.width / 2)
    })
  items.forEach((el, i) => {
    gsap.from(el, {
      opacity: 0,
      duration: 0.7,
      delay: 0.15 + i * 0.15,
      ease: 'power1.out',
    })
  })
  // 右下角女孩：从底部看不见的位置弹起；摇晃与弹起末段重叠（弹起结束前就开始摆）。
  // 跳起打在 .girl-wrap（viewport 轴），旋转打在 .girl-img，两者各自独立、可并行。
  gsap.set('.girl-img', { transformOrigin: 'center bottom' })
  const girlTl = gsap.timeline()
  girlTl.fromTo('.girl-wrap',
    { y: 700 },                   // 从视口下方（看不见的位置）弹起
    { y: 0, duration: 2.0, ease: 'elastic.out(1, 0.6)' }, // 落地弹性弹跳
    0
  )
  // 摇晃在弹起结束前 0.25s 开始（0.75 处插入，与 1s 弹性末段重叠）
  girlTl.add(swayGirl(), 0.75)
})

// 女孩左右摇晃：与弹起末段重叠，绕底部中心旋转，振幅逐次衰减，最后停在 0°（回到你设定的位置）
function swayGirl() {
  gsap.timeline({ defaults: { ease: 'power1.inOut' } })
    .to('.girl-img', { rotation: 6, duration: 0.3 })
    .to('.girl-img', { rotation: -6, duration: 0.5 })
    .to('.girl-img', { rotation: 4, duration: 0.45 })
    .to('.girl-img', { rotation: -2.5, duration: 0.45 })
    .to('.girl-img', { rotation: 0, duration: 0.4 })
}

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
  if (unbindWheel) unbindWheel()
  gsap.killTweensOf(['.grow-service', '.svc-circle', '.girl-img', '.girl-wrap'])
})
</script>

<template>
  <div class="grow-service">
    <!-- 装饰图：index/girl 放在右下角。
         外层 div 负责定位+缩放（Tailwind 默认中心原点），内层 img 负责跳起 + 绕底部中心旋转，
         使旋转原点不牵动缩放锚点——之前女孩消失就是 scale 在 center 算、旋转却换到 bottom 原点，
         同一元素被重新按 bottom 缩放偏出了屏幕。
         尺寸随 svcScale 缩放（参考屏 0.35×1.0 不变，更小屏随场景同比缩小） -->
    <div class="girl-wrap fixed z-5 right-[-540px] bottom-[-790px]">
      <!-- 缩放与 GSAP transform 分层:girl-wrap 只做视口定位 + 弹起(GSAP y),girl-scale 单独承载
           随场景缩放(0.35×svcScale),girl-img 做旋转。缩放与 transform 不在同一元素上叠加,
           避免 1366 下出现 GSAP 0.35 × 内联 0.28 的双重缩放(曾把 girl 压到 151px) -->
      <div class="girl-scale" :style="{ scale: 0.35 * svcScale }">
        <img src="/index/girl.webp" class="girl-img">
      </div>
    </div>
    <!-- 装饰图：stars 原样保留在本页（同 community：fixed 左缘 -8vw、scale 0.5、top 6vh） -->
    <img src="/grow-community/stars.webp" class="fixed scale-[0.5] left-[-8vw] top-[6vh] z-1">
    <!-- 装饰图：memberType 原样保留在本页（同 community：fixed 右缘 -9vw、scale 0.5、垂直对齐 12vh） -->
    <img src="/grow-community/memberType.webp" class="mt-type fixed scale-[0.5] right-[-9vw] top-[12vh] z-2">
    <!-- 正上方页标题（文本3）：居中，字号/阴影同 community 页标题（不随场景缩放，同 grow-main 标题） -->
    <h1 class="svc-pagetitle">求职增值服务</h1>
    <!-- 服务卡整组（圆+三角+说明文字）：几何相连用同一原点统一缩放（transform-origin:50% 0 锚定顶部中心），
         三角顶点随圆同步缩放不脱离；坐标 calc(50vw→50%) 使定位相对舞台中心而非真实视口 -->
    <div class="svc-stage" :style="{ scale: svcScale, transformOrigin: '50% 0' }">
    <!-- 等腰三角形：顶点在职业方向规划（圆1）中间偏右下，底边在简历精修（黄圆）里偏左上；
         三角形中轴方向大致沿两圆心连线方向（圆1 中心 → 黄圆中心，右下方），挡在圆下面 -->
    <svg class="svc-tri" viewBox="10 0 207 251" width="207" height="251">
      <polygon points="0,0 207,169 93,251" fill="#53918D"/>
    </svg>
    <!-- 等腰三角形2：顶点在简历精修（黄圆），底边在秋招陪跑；
         方向沿两圆心连线（简历精修 → 秋招陪跑，右上方），同样挡在圆下面 -->
    <svg class="svc-tri2" viewBox="0 0 247 199" width="247" height="199">
      <polygon points="0,199 247,107 173,0" fill="#B57850"/>
    </svg>
    <!-- 等腰三角形3：顶点在秋招陪跑，底边在模拟面试；
         方向沿两圆心连线（秋招陪跑 → 模拟面试，右下方），绿色，同样挡在圆下面 -->
    <svg class="svc-tri3" viewBox="0 0 159 193" width="159" height="193">
      <polygon points="0,0 159,121 50,193" fill="#53918D"/>
    </svg>
    <!-- 等腰三角形4：顶点在模拟面试，底边在面试复盘；
         方向沿两圆心连线（模拟面试 → 面试复盘，右上方），棕色，同样挡在圆下面 -->
    <svg class="svc-tri4" viewBox="0 0 298 305" width="298" height="305">
      <polygon points="0,305 298,90 204,0" fill="#B57850"/>
    </svg>
    <!-- 标题下方副标题：居中，字号/阴影同 community 页副标题 -->
    <!-- <p class="svc-pagesubtitle">我们的未来商业模式</p> -->
    <!-- 职业方向规划圆形服务卡片（最左）：
         269×269 圆；整组以「秋招陪跑」为水平中心排布，本卡位于其左侧 504px；
         标题 + 帮助：列表整体在圆内正中间 -->
    <div class="svc-circle">
      <!-- 装饰小圆点（圆形2）：与卡片同色，静态摆设 -->
      <span class="svc-dot"></span>
      <h4 class="svc-title">职业方向规划</h4>
      <div class="svc-content">
        <p class="svc-label">帮助：</p>
        <ul class="svc-list">
          <li>分析个人能力</li>
          <li>规划发展路线</li>
          <li>匹配岗位方向</li>
        </ul>
      </div>
    </div>

    <!-- 秋招陪跑服务卡片（横向居中）：
         269×269 圆，水平中心对齐视口（left: calc(50% - 134.5px)）；
         标题在左上方、装饰小圆点在右侧、三项列表在下方（相对圆原点定位） -->
    <div class="svc-circle svc-circle-recruit">
      <!-- 装饰小圆点（圆形2）：设计原坐标 757/250；棕色圆上同色不可见，改用标题同款深绿作点缀 -->
      <span class="svc-dot"></span>
      <h4 class="svc-title">秋招陪跑</h4>
      <div class="svc-content">
        <p class="svc-label">内容：</p>
        <ul class="svc-list">
          <li>岗位分析</li>
          <li>投递规划</li>
          <li>进度跟踪</li>
        </ul>
      </div>
    </div>

    <!-- 面试复盘服务卡片（第三张，最右）：与秋招陪跑同理，仅换位置与文案 -->
    <div class="svc-circle svc-circle-recruit svc-circle-interview">
      <!-- 装饰小圆点（同理）：复用秋招陪跑圆内布局 -->
      <span class="svc-dot"></span>
      <h4 class="svc-title">面试复盘</h4>
      <div class="svc-content">
        <p class="svc-label">帮助：</p>
        <ul class="svc-list">
          <li>分析问题</li>
          <li>优化表达</li>
          <li>提升通过率</li>
        </ul>
      </div>
    </div>

    <!-- 简历精修服务卡片（左下方）：位于左边两绿圆中间下方
         结构与绿圆完全一致（套用 .svc-circle），仅换颜色（黄底/内黄边/917109）与位置 -->
    <div class="svc-circle svc-resume">
      <!-- 装饰小圆点：与绿圆一致 -->
      <span class="svc-dot"></span>
      <h4 class="svc-title">简历精修</h4>
      <div class="svc-content">
        <p class="svc-label">服务：</p>
        <ul class="svc-list">
          <li>项目经历优化</li>
          <li>简历结构调整</li>
          <li>岗位匹配优化</li>
        </ul>
      </div>
    </div>

    <!-- 模拟面试卡片（下方右侧）：位于右边两绿圆中间下面偏左；样式同黄圆简历精修，仅圆偏小 -->
    <div class="svc-circle svc-resume svc-mock">
      <!-- 装饰小圆点：与黄圆一致 -->
      <span class="svc-dot left-147px top-40px"></span>
      <h4 class="svc-title">模拟面试</h4>
      <div class="svc-content">
        <p class="svc-label">包含：</p>
        <ul class="svc-list">
          <li>技术面模拟</li>
          <li>产品面模拟</li>
        </ul>
      </div>
    </div>

    <!-- 两黄圆中间偏下的说明文字：横向居中 -->
    <p class="svc-footer">面向互联网求职者的职业成长服务<br/>HUB Career</p>
    </div>
  </div>
</template>

<style scoped>
.grow-service {
  height: 100%;
}
/* 服务卡整组的缩放舞台：铺满本页（=grow 高画布：宽=视口宽、高=视口宽）。
   圆/三角坐标用 50% 相对舞台居中（舞台宽=视口宽 ⇒ 50%=50vw，数值不变）；
   整组按 svcScale 统一缩放（同一个原点），圆与三角的连线保持相切 */
.svc-stage {
  position: absolute;
  inset: 0;
}
/* 等腰三角形：顶点在圆1（职业方向规划）中间偏右下，底边在黄圆（简历精修）里偏左上；
   中轴方向沿两圆心连线；DOM 序排在前 + z-index:0，挡在所有圆卡片下面 */
.svc-tri {
  position: absolute;
  left: calc(50% - 510px);
  top: 250px;
  width: 207px;
  height: 251px;
  z-index: 0;
}
/* 等腰三角形2：顶点在黄圆（简历精修），底边在秋招陪跑；中轴沿两圆心连线（右上），挡在圆下面 */
.svc-tri2 {
  position: absolute;
  left: calc(50% - 267px);
  top: 280px;
  width: 247px;
  height: 199px;
  z-index: 0;
}
/* 等腰三角形3：顶点在秋招陪跑，底边在模拟面试；中轴沿两圆心连线（右下），绿色，挡在圆下面 */
.svc-tri3 {
  position: absolute;
  left: calc(50% + 34px);
  top: 346px;
  width: 159px;
  height: 193px;
  z-index: 0;
}
/* 等腰三角形4：顶点在模拟面试，底边在面试复盘；中轴沿两圆心连线（右上），棕色，挡在圆下面 */
.svc-tri4 {
  position: absolute;
  left: calc(50% + 205px);
  top: 209px;
  width: 298px;
  height: 305px;
  z-index: 0;
}
.svc-circle {
  position: absolute;
  left: calc(50% - 678.5px);
  top: 64px;
  width: 269px;
  height: 269px;
  border-radius: 50%;
  box-sizing: border-box; /* 保证加白边框后外径仍为 269 */
  background: rgba(235, 245, 240, 1);
  /* 双圈描边：外白边（偏宽）+ 内 0A665F 细边（与 grow-community 卡片一致） */
  border: 4px solid #ffffff;
  box-shadow: inset 0 0 0 1px #0A665F, 2px 5px 5px rgba(0, 0, 0, 0.25);
  /* 内容整体在圆内正中间 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(3, 59, 55, 1);
}
/* 装饰小圆点：设计原坐标 279/174 减去圆左上角 82/114 */
.svc-dot {
  position: absolute;
  left: 172px;
  top: 50px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #F7D460;
  z-index: 0;
}
.svc-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 2px;
  line-height: 31.82px;
  color: rgba(3, 59, 55, 1);
  text-align: center;
  z-index: 2;
}
.svc-content {
  margin-top: 18px; /* 标题与「帮助：」之间的间距 */
  font-size: 20px;
  letter-spacing: 2px;
  line-height: 26.52px;
  color: rgba(3, 59, 55, 1);
}
.svc-label {
  font-weight: 500;
  text-align: left; /* 与下方列表的圆点列左对齐 */
}
.svc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.svc-list li {
  font-weight: 400;
  text-align: left;
}
.svc-list li::before {
  content: '•';
  margin-right: 8px;
  color: rgba(3, 59, 55, 1);
}
/* =============== 秋招陪跑卡片（第二张，按设计稿相对圆坐标定位） =============== */
.svc-circle-recruit {
  left: calc(50% - 134.5px);
  top: 160px;
  background: #EBF5F0;
  display: block; /* 取消卡片1的居中 flex，改由子元素按设计稿绝对定位 */
}
/* 装饰小圆点：设计原坐标 757/250 − 圆左上角 586/190 = 171/60。
   但该坐标会落在标题「秋招陪跑」字形后(约~184px)，点被文字盖住；
   右移到 ~188，让点作为标题右侧的点缀露出来（其余几何均按设计稿） */
.svc-circle-recruit .svc-dot {
  left: 168px;
  top: 60px;
  background: #F7D460; /* 改用标题同色作点缀（设计稿同色在棕色圆上不可见） */
}
/* 标题：设计原坐标 668/250 − 586/190 = 82/60，文字左对齐 */
.svc-circle-recruit .svc-title {
  position: absolute;
  left: 82px;
  top: 60px;
  text-align: left;
}
/* 三项列表：设计原坐标 643/301 − 586/190 = 57/111，宽 156 */
.svc-circle-recruit .svc-content {
  position: absolute;
  left: 57px;
  top: 111px;
  margin-top: 0; /* 覆盖卡片1的 margin-top:18 */
  width: 156px;
}
/* 面试复盘卡片（第三张，最右）：与秋招陪跑同理，仅覆盖圆的位置；
   （0,2,0）特异性高于 .svc-circle-recruit，覆盖其 left/top */
.svc-circle.svc-circle-interview {
  left: calc(50% + 369.5px);
  top: 70px;
}
/* =============== 简历精修卡片（左下方，黄色圆） =============== */
/* 结构与绿圆完全一致（套用 .svc-circle 的尺寸/白边/居中排版），仅覆盖颜色与位置 */
.svc-resume {
  left: calc(50% - 452px);
  top: 380px;
  background: #FFF8E0;                 /* 黄底，覆盖绿底 */
  box-shadow: inset 0 0 0 1px #F7D460, /* 内 F7D460 细边，覆盖内绿边 */
              2px 5px 5px rgba(0, 0, 0, 0.25);
}
/* 文字统一 917109：覆盖绿圆的深绿（.svc-title / .svc-content / 圆点 ::before） */
.svc-resume .svc-title,
.svc-resume .svc-content,
.svc-resume .svc-list li::before {
  color: #917109;
}
/* 模拟面试卡片（下方右侧）：样式同黄圆简历精修，仅位置与尺寸不同（圆偏小 220） */
/* 位于右边两绿圆（秋招陪跑 50vw 与 面试复盘 50vw+504）中间下面并偏左 */
.svc-circle.svc-mock {
  left: calc(50% + 60px);
  top: 440px;
  width: 220px;
  height: 220px;
}
/* 正上方页标题（文本3）：居中，字号/阴影同 community 页标题 */
.svc-pagetitle {
  position: absolute;
  top: 2vh;
  left: 50%;
  transform: translateX(-50%);
  width: 216px;
  height: 48px;
  text-align: center;
  white-space: nowrap;
  opacity: 1;
  text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.25);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: 0px;
  line-height: 47.74px;
  color: rgba(3, 59, 55, 1);
}
/* 标题下方副标题：居中，字号/阴影同 community 页副标题 */
.svc-pagesubtitle {
  position: absolute;
  top: calc(2vh + 56px);
  left: 50%;
  transform: translateX(-50%);
  width: 216px;
  height: 32px;
  text-align: center;
  white-space: nowrap;
  opacity: 1;
  text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.25);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0px;
  line-height: 31.82px;
  color: rgba(10, 102, 95, 1);
}
/* 两黄圆中间偏下的说明文字：横向居中，字号/颜色同各页 caption（18px / #033B37） */
.svc-footer {
  position: absolute;
  top: 670px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 23.87px;
  color: rgba(3, 59, 55, 1);
}
</style>
