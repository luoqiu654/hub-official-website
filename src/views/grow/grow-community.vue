<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { bindGrowWheel } from '../../composables/useGrowScene'
import { vw, vh } from '../../composables/useDesignScale'

const router = useRouter()

// 卡片缩放基准 = 参考视口(用户全屏 1707×932),参考屏恒为 1.0。
// 但要注意:三张卡片天然宽度 = 640 + 40 + 520 + 40 + 640 = 1880px,超过参考宽 1707,
// 若纯按 growScale=1.0 会左右出血各 ~90px。参考稿(space-evenly)靠 flex 压缩中间卡
// 硬塞进 1707,把中间卡压到 427px(设计宽 520)→ 这就是用户看到的"中间卡位置偏差"。
// 正确做法:参考屏下让整行**宽度铺满 1707**(不居中留白、不左右出血、中间卡不被压扁),
// 用 rowScale = min(growScale, vw/1960):宽度紧张就按宽度收,高度紧张才按 growScale 收。
const GROW_REF_W = 1707
const GROW_REF_H = 932
const growScale = computed(() => Math.min(vw.value / GROW_REF_W, vh.value / GROW_REF_H))
// 三卡行天然宽度 = 640+520+640 = 1800,含 2 个 40px 卡间隙 + 左右各 40px 边缘间隙 = 1960。
// 4 个间隙(左右边缘 + 2 个卡间)全为 40px,整体缩放后仍等宽;参考屏(1707)下按宽度收窄铺满。
const ROW_NATURAL_W = 640 + 40 + 520 + 40 + 640 + 40 + 40
const rowScale = computed(() => Math.min(growScale.value, vw.value / ROW_NATURAL_W))

// ================= grow 分路由（成员去向 community） =================
// 场景动画与滚动交互由 useGrowScene 共享（bg 回弹、猛回弹、切换子路由）：
//   - 小幅滚动：场景按比例拉动 + 回弹（与 grow 主路由一致）
//   - 大幅下滚：猛回弹后切到 /grow/service
//   - 大幅上滚：回到 /grow
// 本页内容（成员去向展示）待补充。

let unbindWheel = null

onMounted(() => {
  unbindWheel = bindGrowWheel({
    // 上滚回退到成长体系主体（/grow → grow-main）：由 useGrowScene 的 dramaticExit('up') 先播 bg 弹簧 + toss
    // 翻转再切换，这里只需给出导航目标
    onUp: () => router.push('/grow'),
    onDown: () => router.push('/grow/service'),
    flyOut: null, // 本页没有需要飞出的内容
    backDramatic: true, // 回退也在 grow 内部切换，播与前进一样的弹簧 + toss
  })
  // 整页进入动画：内容整体淡入。
  // 淡入作用在容器的**子元素**上，而不是容器本身：opacity < 1 会让元素成为层叠上下文。
  // 容器一旦成为层叠上下文，内部 .mt-wrap 的 z-2 就再也没法和它比较 → memberType 整个淡入
  // 过程都被压在 feature（场景层，DOM 在内容之后）后面，淡入结束、容器 opacity 回到 1
  // 上下文消失才「啪」地跳到前面（用户看到的就是「淡入时被 feature 挡住」）。
  // 逐个淡入子元素：容器不再是层叠上下文，.mt-wrap 的 z-2 从头到尾都压着 feature。
  gsap.from('.grow-community > *',
    { opacity: 0, duration: 1.0, ease: 'power1.out' }
  )
  // memberType 入场动画与 feature.png 一致：由大到小贴上去，透明度先慢后快由 0 到 1（终点保持自身原始尺寸）
  gsap.from('.mt-type',
    { scale: 2.6, opacity: 0, duration: 1.0, delay: 0, ease: 'power1.in' }
  )
})

onUnmounted(() => {
  if (unbindWheel) unbindWheel()
  gsap.killTweensOf(['.grow-community > *', '.mt-type'])
})
</script>

<template>
  <div class="grow-community">
    <h1 class="community-title">HUB实战成长社区</h1>
    <p class="community-subtitle">我们拥有真实的项目资源</p>
    <img src="/grow-community/stars.webp" class="fixed scale-[0.5] left-[-8vw] top-[6vh] z-1">
    <!-- memberType 随场景缩放：定位 .mt-wrap（fixed，不缩放）+ 缩放 .mt-scale（individual scale，GSAP 不动）
         + 入场 .mt-type（保留 scale-[0.5] 作基准，transform 通道由 GSAP 驱动）。三层各司其职：
         定位不随缩放偏移、缩放不参与 GSAP、GSAP 不与缩放叠加 → 无双重缩放。
         参考屏 growScale=1.0 → 0.5×1.0=0.5 不变；更小屏随场景同比缩小 -->
    <div class="mt-wrap fixed right-[-9vw] z-2">
      <div class="mt-scale" :style="{ scale: growScale }">
        <img src="/grow-community/memberType.webp" class="mt-type scale-[0.5]">
      </div>
    </div>
    <!-- 三张卡片：整体按 rowScale 缩放随场景。用 width:max-content 让 flex 有足够宽度，
         卡片不会被窄屏压缩（原 1800px 固定宽度在 1707 参考屏下中间卡被压弯）；
         顶层 .grow-community 负责居中，本行锚定顶部中心（锚点不飘、向下缩小）。 -->
    <div class="community-row" :style="{ scale: rowScale, transformOrigin: 'top center' }">
    <!-- 阴影放在父级：drop-shadow 跟随 SVG 形状轮廓（含弧线底边） -->
    <div class="path-wrap">
      <svg class="path-1" viewBox="-2 -2 454 523" width="640" height="519" xmlns="http://www.w3.org/2000/svg">
        <!-- 外白边（stroke 4px）+ 卡片底色；右下角用 r=40 圆弧过渡抹圆 -->
        <path d="M 16 0 H 434 Q 450 0 450 16 V 479 A 40 40 0 0 1 410 519 A 585 519 0 0 1 0 331.7 V 16 Q 0 0 16 0 Z"
              fill="rgba(235, 245, 240, 0.7)" stroke="#ffffff" stroke-width="4" />
        <!-- 内绿边（stroke 2px，比白边稍细，向内收 ~5px）；右下角同样用 r=35 圆弧过渡 -->
        <path d="M 20.2 5.2 H 429.8 Q 445.5 5.2 445.5 20.9 V 478.8 A 35 35 0 0 1 410.5 513.8 A 573.3 508.6 0 0 1 4.5 330.3 V 20.9 Q 4.5 5.2 20.2 5.2 Z"
              fill="none" stroke="#0A665F" stroke-width="2" />
      </svg>

      <!-- path-1 内容 -->
      <div class="path-content">
        <h3 class="t-title">项目制成长</h3>
        <ul class="steps">
         流程：
          <li>加入社区</li>
          <li>能力匹配</li>
          <li>进入项目组</li>
          <li>负责人带教</li>
          <li>完成真实项目</li>
          <li>获得项目履历</li>
        </ul>
        <img src="/grow-community/arrow.webp" class="h-[30vh]">
        <h3 class="b-title">社区培养模式</h3>
      </div>
    </div>

    <!-- 路径 2（中间，圆角矩形，浅黄） -->
    <div class="path-2">
      <div class="path-2-content">
        <h3 class="gain-title">成员能获得什么</h3>
        <ul class="gains">
          <li>「真实产品开发经历」</li>
          <li>「完整项目流程体验」</li>
          <li>「团队协作经验」</li>
          <li>「简历资产」</li>
          <li>「产品思维 / 技术能力」</li>
          <li>「求职竞争力」</li>
        </ul>
      </div>
      <!-- 黄色方框caption：挂在卡片下边缘，保持与中间卡片水平对齐 -->
      <p class="path-2-caption">面向校内外同学的互联网项目实践成长社区<br/>真实项目 × 专业带教 × 职业成长</p>
    </div>

    <!-- 路径 3（路径2右边，与路径1同款弧形，水平翻转） -->
    <div class="path-wrap">
      <svg class="path-3" viewBox="-2 -2 454 523" width="640" height="519" xmlns="http://www.w3.org/2000/svg">
        <path d="M 16 0 H 434 Q 450 0 450 16 V 479 A 40 40 0 0 1 410 519 A 585 519 0 0 1 0 331.7 V 16 Q 0 0 16 0 Z"
              fill="rgba(235, 245, 240, 0.7)" stroke="#ffffff" stroke-width="4" />
        <path d="M 20.2 5.2 H 429.8 Q 445.5 5.2 445.5 20.9 V 478.8 A 35 35 0 0 1 410.5 513.8 A 573.3 508.6 0 0 1 4.5 330.3 V 20.9 Q 4.5 5.2 20.2 5.2 Z"
              fill="none" stroke="#0A665F" stroke-width="2" />
      </svg>

      <!-- path-3 内容：参考 path-1（竖排标题 + 列表），但只有「标题 / 字段」两部分 -->
      <div class="path-3-content">
        <h3 class="b-title">为什么成立社区</h3>
        <div class="why-fields text-xl">
          <div class="why-field mb-9.5">
            <span class="field-tag">学生</span>
            <p class="field-text">不知道行业需要哪些技术，没有<br/>项目经历，简历缺少亮点，不知<br/>道如何进入互联网行业。</p>
          </div>
          <div class="why-field">
            <span class="field-tag">HUB提供</span>
            <p class="field-text">真实项目 + 团队指导 + 完整流<br/>程 + 职业辅导。</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* 三张卡片：.community-row 承载并用 width:max-content 让 flex 有足够宽度（不被压缩）；
   .grow-community 只负责居中 + 顶部下移，缩放由 .community-row 的 scale 负责 */
.grow-community {
  display: flex;
  align-items: flex-start; /* 从顶部开始排，加 padding-top 让它们整体偏下一点 */
  justify-content: center; /* 三卡行水平居中 */
  height: 100%;
  padding-top: 15vh; /* 三张卡片整体下移到顶部偏下位置 */
}
/* 三卡行：width:max-content 使 flex 有完整宽度（1800px 设计宽），窄屏不被压缩、
   卡片保持原始设计尺寸；再整体 scale(rowScale) 随场景等比缩放 */
.community-row {
  display: flex;
  align-items: flex-start;
  gap: 40px; /* 卡片之间间距（原 space-evenly 在大屏的近似卡间距） */
  /* 左右各 40px 边缘间隙 + 2 个 40px 卡间隙 → 4 个间隙全部等宽(40px),整体缩放后仍等宽。
     卡片本身 640+520+640=1800,加 padding 后自然盒宽 1960,rowScale 按此铺满参考宽 */
  padding: 0 40px;
  width: max-content;
}
.path-wrap {
  filter: drop-shadow(2px 5px 5px rgba(0, 0, 0, 0.25));
  position: relative; /* 作为内容层绝对定位的基准 */
}
/* path-1 内容：四部分横向排列（左竖排标题 · 流程列表 · 箭头 · 右竖排标题），紧凑排布 */
.path-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row; /* 各部分横排 */
  align-items: flex-start; /* 顶部对齐，四部分一起贴近框顶 */
  justify-content: center; /* 聚拢居中 */
  gap: 26px; /* 各部分之间间距（紧凑） */
  padding: 48px 18px 14px; /* 上方留白小，贴近框顶部 */
  color: #033B37;
}
.t-title {
  writing-mode: vertical-rl; /* 竖向标题 */
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 10px; /* 字间纵向间距调宽 */
  line-height: 31.82px;
  color: rgba(3, 59, 55, 1);
  text-align: center;
}
/* 右侧竖排大标题：项目制成长的社区培养模式 */
.b-title {
  writing-mode: vertical-rl;
  font-size: 48px;
  font-weight: 600;
  letter-spacing: 12px; /* 字间纵向间距调宽 */
  line-height: 63.65px;
  color: rgba(3, 59, 55, 1);
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px; /* 每行之间上下间距调宽 */
  font-size: 20px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 26.52px;
  color: rgba(3, 59, 55, 1);
  text-align: left;
}
.steps li::before {
  content: '•';
  color: rgba(3, 59, 55, 1);
  margin-right: 8px;
}
.path-1 {
  width: 640px;
  height: 519px;
  opacity: 1;
}
.path-2 {
  position: relative;
  width: 520px;
  height: 519px;
  opacity: 1;
  background: rgba(255, 248, 224, 0.5);
  border-radius: 16px;
  border: 4px solid #ffffff;
  box-shadow: 2px 5px 5px rgba(0, 0, 0, 0.25), inset 0 0 0 2px #F7D460;
}
/* 中间卡片内容：顶部标题 + 下方纵向列表，整体居中 */
.path-2-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 30px 24px;
  color: #917109;
}
.gain-title {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: 4px;
  line-height: 1.3;
  color: #917109;
  text-align: center;
}
/* 黄色方框caption：挂在卡片下边缘下方，保持与中间卡片水平对齐 */
.path-2-caption {
  position: absolute;
  top: 110%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 22px;
  width: 534px;
  height: 48px;
  opacity: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 23.87px;
  color: rgba(3, 59, 55, 1);
}
.gains {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px; /* 每项之间上下间距 */
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 2px;
  line-height: 28px;
  color: #917109;
  text-align: center;
}
.path-3 {
  width: 640px;
  height: 519px;
  opacity: 1;
  transform: scaleX(-1);
}
/* path-3 内容：参考 path-1（竖排标题 + 列表），但只有「标题 / 字段」两部分 */
.path-3-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row; /* 左侧竖排标题 · 右侧字段列 */
  align-items: flex-start;
  justify-content: center;
  gap: 36px;
  padding: 26px 20px 16px; /* 整体上移，避开右侧 memberType 图片遮挡（HUB提供 底部较易被盖） */
  color: #033B37;
}
/* path-3 有两组列表纵向堆叠，列表更紧凑（覆盖 path-1 steps 的尺寸） */
.path-3-content .steps {
  gap: 11px;
  font-size: 17px;
  line-height: 24px;
}
.why-fields {
  display: flex;
  flex-direction: column; /* 学生 / HUB提供 上下纵向排列 */
  gap: 10px;
}
.why-field {
  display: flex;
  flex-direction: column;
  gap: 13px;
  font-weight: 500;
  line-height: 25px;
}
.field-tag {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 2px;
  line-height: 25px;
  color: #0A665F;
}
.field-text{
  font-weight: 400;
}
.field-tag::after {
  content: '：';
}
/* 正上方中间标题 */
.community-title {
  position: absolute;
  top: 2vh;
  left: 50%;
  transform: translateX(-50%);
  width: 298px;
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
/* 标题下方副标题 */
.community-subtitle {
  position: absolute;
  top: calc(2vh + 56px);
  left: 50%;
  transform: translateX(-50%);
  width: 264px;
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
</style>
