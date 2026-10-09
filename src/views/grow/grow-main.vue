<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { bindGrowWheel } from '../../composables/useGrowScene'
import { vw, vh } from '../../composables/useDesignScale'

const router = useRouter()

// 卡片缩放基准 = 参考视口(用户全屏 1707×932),参考屏恒为 1.0 → 卡片与文字保持原始设计
// 尺寸不缩小;更小屏才等比缩小。不能用全局 designScale:它是 16:9 基准,按高度压缩,
// 在参考屏下只有 0.863,把卡片整体压小 13.7%(字变小→"卡片和字太小")。
// 同一个 growScale 还以 --gs 的形式挂到根元素上，供卡片/说明文字那几段「距轨迹线的 px 偏移」
// 一起缩放（见模板与 <style> 的注释）：卡片本身缩放了，它到线的距离也必须同比缩放，
// 否则 2560×1600 下（growScale≈1.5）卡片会往下压过轨迹线、并盖住说明文字。
const GROW_REF_W = 1707
const GROW_REF_H = 932
const growScale = computed(() => Math.min(vw.value / GROW_REF_W, vh.value / GROW_REF_H))

// ================= grow 主路由（成长体系主体） =================
// 场景（bg / 成长体系 / DEVELOPMENT / feature）与滚动交互（拉动、回弹、猛回弹）
// 由布局层 + useGrowScene 共享，本组件只负责：
//   - 自己的内容：卡片、火箭、左上角标题、中心轴 + 4 圆点的入场动画
//   - 大幅下滚时这些内容旋转飞出屏幕（戏剧性退出），随后切到 /grow/community
//   - 大幅上滚 → 回到 what-we-do2

let unbindWheel = null

// 入场几何（轨迹线 left/宽度、火箭位移）全在 <style> 顶部的 --traj-left / --traj-w / --p 里，
// 见那里的注释。JS 只驱动进度 --p，不再自己算 px —— 用 GSAP 内联 px 会把落定状态钉死在旧视口上。

// 大幅下滚：卡片、火箭、标题、中心轴 + 圆点朝各自不同方向旋转飞出屏幕
function flyOut(vw, vh) {
  // 4 张卡片：各自朝不同方向（左、右、左上、右上）旋转飞出屏幕，先慢后快
  const cardDirs = [
    { x: -vw * 1.1, y: -vh * 1.3, r: -540 },
    { x: vw * 1.05, y: -vh * 1.4, r: 720 },
    { x: -vw * 0.8, y: -vh * 1.5, r: -720 },
    { x: vw * 0.9, y: -vh * 1.2, r: 540 },
  ]
  gsap.utils.toArray('.card').forEach((card, i) => {
    gsap.to(card, {
      x: cardDirs[i].x,
      y: cardDirs[i].y,
      rotation: cardDirs[i].r,
      duration: 1.0,
      ease: 'power3.in', // 先慢后快，越飞越猛
      delay: i * 0.05,   // 错峰起飞，更有戏剧性
      overwrite: 'auto',
    })
  })

  // 火箭：向右上斜飞 + 空中连翻两圈（相对增量用 JS 算好的 px，GSAP 不解析字符串表达式）
  gsap.to('.rocket', {
    x: `+=${vw * 1.5}`, y: `-=${vh * 1.6}`, rotation: 720,
    duration: 1.1, ease: 'power2.in', overwrite: 'auto',
  })

  // 左侧竖线（db-vl.png）：向左上飞出 + 翻转 + 淡出
  gsap.to('.db-vl', {
    x: `-=${vw * 1.2}`, y: `-=${vh * 1.5}`, rotation: 20, opacity: 0,
    duration: 1.0, ease: 'power3.in', delay: 0.05, overwrite: 'auto',
  })

  // 左上角标题：向左上飞出 + 连翻两圈 + 淡出
  gsap.to('.grow-title', {
    x: `-=${vw * 0.9}`, y: `-=${vh * 1.2}`, rotation: -720, opacity: 0,
    duration: 0.9, ease: 'power3.in', overwrite: 'auto',
  })
  gsap.to('.grow-subtitle', {
    x: `-=${vw * 0.7}`, y: `-=${vh * 1.3}`, rotation: 720, opacity: 0,
    duration: 1.0, ease: 'power3.in', delay: 0.08, overwrite: 'auto',
  })

  // 中心轴：整条线旋转着向上甩出；4 个圆点各自朝不同方向飞出，虚线跟随对应圆点
  gsap.to('.trajectory', {
    y: `-=${vh * 1.4}`, rotation: -30,
    duration: 1.0, ease: 'power3.in', overwrite: 'auto',
  })
  const dotDirs = [
    { x: -vw * 0.6, y: -vh * 1.3, r: -360 },
    { x: vw * 0.4, y: -vh * 1.5, r: 360 },
    { x: -vw * 0.3, y: -vh * 1.4, r: -540 },
    { x: vw * 0.7, y: -vh * 1.2, r: 540 },
  ]
  gsap.utils.toArray('.dot').forEach((dot, i) => {
    gsap.to(dot, {
      x: dotDirs[i].x, y: dotDirs[i].y, rotation: dotDirs[i].r,
      duration: 0.95, ease: 'power3.in', delay: i * 0.06, overwrite: 'auto',
    })
  })
  gsap.utils.toArray('.dash').forEach((dash, i) => {
    gsap.to(dash, {
      x: dotDirs[i].x, y: dotDirs[i].y, rotation: dotDirs[i].r * 0.5,
      duration: 0.95, ease: 'power3.in', delay: i * 0.06, overwrite: 'auto',
    })
  })
}

onMounted(() => {
    // 内容入场动画：火箭飞入 + 轨迹延伸 + 圆点弹出 + 虚线长出 + 卡片淡入
    // 火箭飞入 + 轨迹线延伸：只驱动一个进度变量 --p（0→1）。线宽与火箭位移都在 CSS 里写成
    // calc(--traj-w × --p) → 「线头 x ≡ 火箭左缘 x」是构造性的（同一个变量、同一帧），
    // 不依赖两个补间是否同时起步，也不依赖 GSAP 把 81vw 换算成多少 px；
    // 且都是 vw 表达式 → 屏幕大小变化时线长与火箭位置自动跟随（见 <style> 顶部注释）。
    gsap.fromTo('.grow-main', { '--p': 0 }, { '--p': 1, duration: 3, delay: 0.5 })
    // 轨迹线上的圆点：黄绿交替，随线段延伸依次出现（延迟 = 线头到达各点的时间）
    gsap.utils.toArray('.dot').forEach((dot, i) => {
        gsap.fromTo(dot,
            { opacity: 0, scale: 0 },
            { opacity: 1, scale: 1, duration: 0.35, delay: [0.5, 1.1, 1.4, 2.21][i], ease: 'back.out(2)' }
        )
    })
    // 圆点出现时：黄球向下、绿球向上长出虚线（与圆点同延迟）
    gsap.utils.toArray('.dash').forEach((dash, i) => {
        gsap.fromTo(dash,
            { height: 0 },
            { height: 170, duration: 0.4, delay: [0.5, 1.1, 1.4, 2.21][i], ease: 'power2.out' }
        )
    })
    // 虚线长完后，右侧卡片淡入（DOM 顺序：黄1、黄2、绿1、绿2）
    // 只补 opacity，绝不动 y/x/rotation 这类 transform 属性：GSAP 一旦写 transform，
    // 就会把补间创建那一刻的 scale（= 当时的 growScale）内联进 `transform: scale(...)`
    // 并写死 translate/rotate: none。之后改窗口大小，Vue 更新的是 style 里的 `scale`
    // 绑定，内联的 transform 却冻在旧视口 → 两个缩放相乘（参考屏下卡片大 1.5 倍、
    // 从大屏缩回小屏则更大）。卡的缩放只由模板的 :style="{ scale: growScale }" 决定。
    gsap.utils.toArray('.card').forEach((card, i) => {
        gsap.fromTo(card,
            { opacity: 0 },
            { opacity: 1, duration: 1.4, delay: [0.95, 1.85, 1.55, 2.65][i], ease: 'power2.out' }
        )
    })

    // 滚动交互（场景动画与阈值判断由 useGrowScene 共享）：
    // 大幅上滚 → 回到 what-we-do2；大幅下滚 → 内容飞出后切到 /grow/community
    unbindWheel = bindGrowWheel({
      onUp: () => router.push('/whatwedo2'),
      onDown: () => router.push('/grow/community'),
      flyOut,
    })
})

onUnmounted(() => {
    if (unbindWheel) unbindWheel()
    gsap.killTweensOf(['.grow-main', '.card', '.rocket', '.trajectory', '.dot', '.dash', '.grow-title', '.grow-subtitle', '.db-vl'])
})
</script>

<template>
    <!-- --gs = growScale（卡片缩放基准）。绑在根元素上，供 4 张卡片与说明文字的
         「距轨迹线 px 偏移」用 calc(... * var(--gs)) 同比缩放；-p（入场进度）由 GSAP 内联写在
         同一元素上，Vue 只清自己写过的键，两者互不干扰。 -->
    <div class="grow-main" :style="{ '--gs': growScale }">
        <!-- 轨迹线：left / top / 宽度（= 线宽 × 入场进度）全在 <style> 的 .trajectory 里，
             不要在模板里写 width，否则 Vue 每次重渲染（如改窗口大小→growScale 变化）都会把
             GSAP 驱动的值写回 0，线就没了；top 也一并交给 --axis-y，三个元素才共一条中线 -->
        <div class="trajectory fixed h-[3px] bg-[#0A665F]"
            style="box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25)"></div>
        <div class="dot fixed size-9.5 rounded-full bg-[#F7D460]"
            style="top: calc(33.5vh - 15px); left: 12vw; opacity: 0"></div>
        <div class="dot fixed size-9.5 rounded-full bg-[#0A665E]"
            style="top: calc(33.5vh - 15px); left: 30vw; opacity: 0"></div>
        <div class="dot fixed size-9.5 rounded-full bg-[#F7D460]"
            style="top: calc(33.5vh - 15px); left: 48vw; opacity: 0"></div>
        <div class="dot fixed size-9.5 rounded-full bg-[#0A665E]"
            style="top: calc(33.5vh - 15px); left: 69vw; opacity: 0"></div>
        <!-- 圆点长出虚线：黄球向下、绿球向上 -->
        <div class="dash fixed w-0.75"
            style="top: calc(33.5vh + 23px); left: calc(12vw + 17px); height: 0; background: repeating-linear-gradient(#F7D460 0 6px, transparent 6px 12px)">
        </div>
        <div class="dash fixed w-0.75"
            style="bottom: calc(66.5vh + 15px); left: calc(30vw + 17px); height: 0; background: repeating-linear-gradient(#0A665E 0 6px, transparent 6px 12px)">
        </div>
        <div class="dash fixed w-0.75"
            style="top: calc(33.5vh + 23px); left: calc(48vw + 17px); height: 0; background: repeating-linear-gradient(#F7D460 0 6px, transparent 6px 12px)">
        </div>
        <!-- 黄虚线右侧的卡片：淡入出现。
             top 的 37px = 卡片顶边距轨迹线的设计值（参考屏 px）→ 乘 --gs 跟着卡片一起缩放；
             left 的 17px+24px = 距圆点的偏移，圆点尺寸是固定的，故不缩放。 -->
        <div class="card yellow-card fixed rounded-3xl opacity-0"
            :style="{ scale: growScale, transformOrigin: 'top left' }"
            style="top: calc(33.5vh + 37px * var(--gs)); left: calc(12vw + 17px + 24px); background: #FFF8E0; border: 4px solid #fff; box-shadow: inset 0 0 0 2px #F7D460, 6px 8px 12px rgba(0, 0, 0, 0.2); padding: 20px 26px">
            <h4 class="text-[20px] font-bold">1. 学习成长</h4>
            <p class="mt-2 text-[15px] leading-relaxed font-semibold">了解互联网产品研发流程，掌<br />握岗位基础能力。</p>
            <div class="mt-2 text-[15px] leading-relaxed">
                <div>• 产品设计</div>
                <div>• UI设计</div>
                <div>• 前端开发</div>
                <div>• AI工具应用</div>
            </div>
            <img src="/grow/star.webp" class="absolute -bottom-3 -right-3 w-10 scale-[1.4]">
        </div>
        <div class="card yellow-card fixed rounded-3xl opacity-0"
            :style="{ scale: growScale, transformOrigin: 'top left' }"
            style="top: calc(33.5vh + 37px * var(--gs)); left: calc(48vw + 17px + 24px); background: #FFF8E0; border: 4px solid #fff; box-shadow: inset 0 0 0 2px #F7D460, 6px 8px 12px rgba(0, 0, 0, 0.2); padding: 20px 26px">
            <h4 class="text-[20px] font-bold">3. 能力提升</h4>
            <p class="mt-2 text-[15px] leading-relaxed font-semibold">从项目参与者成长为独立贡献者。</p>
            <div class="mt-2 text-[15px] leading-relaxed">
                <div>获得：</div>
                <div>• 项目经验</div>
                <div>• 作品成果</div>
                <div>• 团队协作能力</div>
            </div>
            <img src="/grow/star.webp" class="absolute -bottom-3 -right-3 w-10 scale-[1.4]">
        </div>
        <!-- 绿虚线右侧的卡片（在轨迹线上方）：同理，top 的 -275px = 卡片顶边在线上方的设计值，
             乘 --gs 与卡片同比缩放 → 卡底距线恒为设计的 (275 - 卡高) × --gs（参考屏 27px）；
             外面套 max(16px, …) 兜底：屏高很小（33.5vh 被压得比 275px×--gs 还小）时把卡片钉在
             屏幕内，不会顶出屏幕上方。 -->
        <div class="card fixed rounded-2xl opacity-0"
            :style="{ scale: growScale, transformOrigin: 'top left' }"
            style="top: max(16px, calc(33.5vh - 275px * var(--gs))); left: calc(30vw + 17px + 24px); background: #EBF5F0; border: 4px solid #fff; box-shadow: inset 0 0 0 2px #0A665E, 6px 8px 12px rgba(0, 0, 0, 0.2); padding: 20px 26px">
            <h4 class="text-[20px] font-bold text-[#033B37]">2. 项目实践</h4>
            <p class="mt-2 text-[15px] leading-relaxed font-semibold text-[#033B37]">参与真实项目，在实践中提升能力。</p>
            <div class="mt-2 text-[15px] leading-relaxed text-[#033B37]">
                <div>• 数字教材项目</div>
                <div>• 校园互联网项目</div>
                <div>• 企业合作项目</div>
            </div>
            <div class="mt-2 text-[15px] leading-relaxed text-[#033B37]">体验完整流程：需求分析、产品设计、<br />开发实现、项目交付</div>
            <img src="/grow/glasses.webp" class="absolute -top-3 -right-3 w-10 scale-[1.5]">
        </div>
        <div class="card fixed rounded-2xl opacity-0"
            :style="{ scale: growScale, transformOrigin: 'top left' }"
            style="top: max(16px, calc(33.5vh - 225px * var(--gs))); left: calc(69vw + 17px + 24px); background: #EBF5F0; border: 4px solid #fff; box-shadow: inset 0 0 0 2px #0A665E, 6px 8px 12px rgba(0, 0, 0, 0.2); padding: 20px 26px">
            <h4 class="text-[20px] font-bold text-[#033B37]">4. 核心培养</h4>
            <p class="mt-2 text-[15px] leading-relaxed font-semibold text-[#033B37]">优秀成员可进一步参与：</p>
            <div class="mt-2 text-[15px] leading-relaxed text-[#033B37]">
                <div>• 项目负责人工作</div>
                <div>• 团队协作管理</div>
                <div>• 新人成长指导</div>
            </div>
            <img src="/grow/glasses.webp" class="absolute -top-3 -right-3 w-10 scale-[1.5]">
        </div>
        <div class="dash fixed w-0.75"
            style="bottom: calc(66.5vh + 15px); left: calc(69vw + 17px); height: 0; background: repeating-linear-gradient(#0A665E 0 6px, transparent 6px 12px)">
        </div>
        <!-- 两个黄色卡片中间下方的说明文字 -->
        <p class="main-caption" :style="{ scale: growScale }">CQUPTHUB帮助成员从技术兴趣出发，通过真实项目实践，<br/>逐步成长为具备互联网竞争力的青年人才</p>
        <!-- 火箭：left 取轨迹线起点，缩放基准 / 竖向定位 / 入场位移都在 <style> 的 .rocket 里
             （竖向中点压在轨迹线上；origin-left 使左缘 = left；位移 = 线宽 × 入场进度） -->
        <img src="/grow/rocket.webp" class="rocket fixed">
        <!-- db-vl：left 用 Tailwind、竖向定位在 <style> 的 .db-vl 里（跟 --axis-y 走） -->
        <img src="/grow/db-vl.webp" class="db-vl aspect-56/96 scale-[min(70vw/1920px,70vh/1080px)] fixed left-[4vw]">
        <div class="grow-title fixed"
            style="left: 63px; top: 63px; font-size: 36px; font-weight: 600; line-height: 47.74px; color: #033B37; text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.25)">
            成长路径</div>
        <div class="grow-subtitle fixed"
            style="left: 63px; top: 111px; font-size: 24px; font-weight: 600; line-height: 31.82px; color: #0A665F; text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.25)">
            在真实项目中成长，将能力转化<br />为未来职业竞争力</div>
    </div>
</template>

<style scoped>
/* ===== 入场几何：进度变量 + 轨迹线 + 火箭 =====
   --p：入场进度 0→1，由 GSAP 写在 .grow-main 上（`.grow-main` 没有 style 绑定，Vue 不会去动它）。
   轨迹线宽度与火箭位移都由它派生：线宽 = --traj-w × --p、火箭位移 = --traj-w × --p
   → 「线头 x ≡ 火箭左缘 x」是构造性的：同一个变量、同一帧；不依赖两个补间是否同时起步，
     也不依赖 GSAP 把 81vw 换算成多少 px。
   全部写成 vw/vh 表达式（而不是 GSAP 内联的 px / transform）：屏幕大小变化时自动跟随。
   之前的两种写法都会在改窗口大小后坏掉：
     · 行程写死 1400px、宽度写在模板的静态 style 里（width: 0）：行程只在参考屏 1707×932 下贴合，
       2560 宽时线头走到 2240px、火箭只飞 1400px 就脱队；而那次重渲染还会把 width: 0 写回去，
       GSAP 内联的线宽被冲掉 → 线整个消失（「改屏幕大小后 trajectory 不见了」）。
     · 宽度 / 位移交给 GSAP 内联成 px：落定后冻在旧视口，改窗口大小线长与火箭位置都停在旧尺寸，
       火箭的 scale 也被内联钉死、不再跟随缩放。 */
.grow-main {
    --p: 0;
    --traj-left: 6.5vw;
    --traj-w: 81vw;
    /* 纵向基准 = 轨迹线的中心线。trajectory / db-vl / rocket 的竖向中点全部由它派生，
         屏高变化时三者一起滑动，任意视口下都严格共线。
         33.5vh 是轨迹线的 top、3px 是线高 → 中线 = 33.5vh + 1.5px。
         各元素按「中线 ± 自身半高」反推自己的 top，谁都不许再自己写 vh。 */
    --axis-y: calc(33.5vh + 1.5px);
}

.trajectory {
    /* 线高 3px → 上缘 = 中线 − 1.5px（原来 top 写在模板里，见模板处的说明） */
    top: calc(var(--axis-y) - 1.5px);
    left: var(--traj-left);
    width: calc(var(--traj-w) * var(--p));
}

/* 火箭：等比缩放基准 + 竖向定位 + 入场位移。
   --s：70% 视口宽 / 70% 视口高取小（与原 scale-[min(70vw/1920px,70vh/1080px)]、.db-vl 同一基准）。
   top：让火箭竖向中点压在轨迹线中线上（= --axis-y）。74px = rocket.webp 原始高 148 的一半，
        正好是盒子的竖向中点，也正好是 transform-origin 的 y，缩放因此不移动中点
        → top 只需「中线 − 74px」，与 --s 无关，任意分辨率下中点都在线上。
   transform-origin: left center：横向以左缘为轴（左缘 = left + 位移），入场位移才能和线宽共用 --p；
        纵向以盒子中点(74px)为轴，缩放不移动中点，上面的 top 才成立。 */
.rocket {
    --s: min(70vw / 1920px, 70vh / 1080px);
    left: var(--traj-left);
    top: calc(var(--axis-y) - 74px);
    transform: translateX(calc(var(--traj-w) * var(--p))) scale(var(--s));
    transform-origin: left center;
}

/* 左上角的竖向虚线（db-vl.webp 原图 56×96）：与火箭同压在轨迹线中线上。
   竖向中点 = top + 96/2；缩放走 Tailwind 的 scale-*（transform-origin 默认在中心），
   绕中心缩放不移动中点 → top = 中线 − 48px。
   原来写的是 top-[29vh]，与 33.5vh 不成比例：偏差 = 46.5px − 0.045×屏高，
   720 高的屏低 14px、1440 高的屏又高 18px，所以必须跟 --axis-y 走。 */
.db-vl {
    top: calc(var(--axis-y) - 48px);
}

.card {
    word-spacing: 0.5rem;
    letter-spacing: 0.1em;
}

.card p {
    text-indent: 1.5em;
}

.yellow-card {
    color: #917109;
}
/* 两个黄色卡片中间下方的说明文字：top 的 320px 同理乘 --gs —— 上方黄卡缩放了，
   说明文字必须跟着下移，否则 2560×1600 下（growScale≈1.5）会被黄卡盖住 */
.main-caption {
    position: absolute;
    top: calc(33.5vh + 320px * var(--gs));
    left: 50%;
    transform: translateX(-50%);
    width: 534px;
    height: 40px;
    opacity: 1;
    text-align: center;
    white-space: nowrap;
    font-size: 18px;
    font-weight: 400;
    letter-spacing: 2px;
    line-height: 23.87px;
    color: rgba(3, 59, 55, 1);
}
</style>
