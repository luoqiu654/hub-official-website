<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { tryAcquireFlip } from '../composables/useFlipLock'
import DesignStage from '../components/DesignStage.vue'

const router = useRouter()

// 工作室现状：面板右侧列条目
const statusList = [
    '前端开发需求快速增长',
    '项目数量稳步增加',
    '多项目并行协作需求提升',
    '技术梯队建设需求明显',
]

// 向上滚动：翻页回到 about-us（不再移动 bg-light）；向下滚动：切到 what-we-do（翻页过渡由 App.vue 完成）
let sliding = false
function onWheel(e) {
    if (sliding || !e.deltaY) return
    // 全局翻页锁：单次滚动的动量会被后续新挂载的页面接连捕获，这里在过渡期间拒绝再次翻页
    if (!tryAcquireFlip()) return
    sliding = true
    if (e.deltaY > 0) {
        router.push('/whatwedo')
        return
    }
    router.push('/aboutus')
}

onMounted(() => {
    window.addEventListener('wheel', onWheel, { passive: true })
    // 主面板：从下往上淡入（文字随面板一起浮现）
    gsap.from(['.panel-rect', '.panel-rect-text'], {
        yPercent: 25,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        delay: 0.35,
    })
    // 星星 / 地球随面板一起浮现
    gsap.from(['.panel-star', '.panel-earth'], {
        opacity: 0,
        scale: 0.5,
        duration: 0.7,
        ease: 'back.out(1.6)',
        delay: 0.8,
    })
    // 背景女孩：中间偏右，原地淡入
    gsap.from('.bg-girl', {
        opacity: 0,
        duration: 1.4,
        ease: 'power1.inOut',
        delay: 0.6,
    })
})

onUnmounted(() => window.removeEventListener('wheel', onWheel))
</script>

<template>
    <div class="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#fafafa]">
        <!-- 设计舞台：画幅 2880×2048（原生构图，同首页）。舞台成为 %/fixed 元素的包含块，
             内部按设计坐标定位并整体等比缩放；vw/vh 已换算为设计坐标（vw→盒宽%、vh→盒高%，
             字体/间距→设计px：宽 1% = 28.8px、高 1% = 20.48px）。
             渐变与光晕放 #bg 槽（舞台外、铺满真实视口，不随舞台缩放）→ 缩放下无留白边条。
             缩放 fit=width：本页是 2880:2048 高画布，在 16:9 屏下按 contain（min）会被高度
             压缩而整体缩小（字 22→17px、右侧留边），改用宽锁铺满、上下裁切，
             才与原 `w-full aspect-2880/2048` 的构图一致。 -->
        <DesignStage :design-w="2880" :design-h="2048" fit="width">
            <template #bg>
                <!-- 基底渐变：白 → 浅薄荷，铺满真实视口（与 about-us 一致，保证翻页衔接） -->
                <div class="absolute inset-0 w-full"
                    style="background: linear-gradient(180deg, #fafafa 0%, #fafafa 34%, #f2f7f5 62%, #e2f5f0 100%)"></div>
                <!-- 背景光晕：fixed 固定在真实视口（不随舞台缩放），垫在设计内容之下 -->
                <img src="/bg-light.webp"
                    class="bg-light pointer-events-none fixed left-[-145%] top-[-175%] z-0 w-[270%] max-w-none opacity-85" />
            </template>
            <!-- 背景女孩：中间偏右，向画布外上下出血（h-[145%]/top-[-19%] 为刻意设计的溢出，由舞台裁掉） -->
            <img src="/aboutus2/bg-girl.webp"
                class="bg-girl absolute left-[56%] top-[-14.6%] z-2 w-[45%] h-[111.3%] max-w-none" />
            <!-- 主面板：占据主要位置，从下往上淡入 -->
            <img src="/aboutus2/rectangle.webp"
                class="panel-rect absolute left-[4%] top-[29.5%] z-5 w-[91%] h-[53.7%] max-w-none" />
            <!-- 面板内文字：与面板同位置、同尺寸，三栏排版（简介 / 历史 / 现状） -->
            <div class="panel-rect-text absolute left-[4%] top-[29.5%] z-5 w-[75%] h-[53.7%]">
                <div class="flex h-full w-full min-w-0 flex-col space-y-[47.2px] px-[100.8px] py-[70.8px] font-medium">
                    <!-- 工作室简介 -->
                    <section>
                        <h3 class="mb-[22px] text-[37.4px] font-semibold text-[#033B37]">
                            工作室简介
                        </h3>
                        <p class="text-[28.2px] leading-[1.9] text-[#033B37]">
                            CQUPTHUB 是重庆邮电大学学生自发组织的互联网产品实践团队。我们长期专注于数字教材前端可视化开发、教育类互动产品研发、互联网产品设计以及
                            AI 应用探索。通过真实项目实践，将产品设计、UI 设计、前端开发、后端开发等能力结合，探索互联网技术与教育场景融合的新模式。
                        </p>
                        <p class="text-[28.2px] leading-[1.9] text-[#033B37] mt-[37.1px]">
                            我们的团队由一群充满热爱、激情，富有创造力和专业技术的伙伴组成，对数字教材和小游戏开发有深厚的理解和丰富的经验。我们紧跟行业发展趋势，不断探索创新，力求将最新的前端技术融入到我们的作品中，为用户带来卓越的视觉和交互体验。
                        </p>
                    </section>

                    <!-- 工作室历史 -->
                    <section>
                        <h3 class="mb-[22px] text-[37.4px] font-semibold text-[#033B37]">
                            工作室历史
                        </h3>
                        <p class="text-[28.2px] leading-[1.9] text-[#033B37]">
                            我们的前身是 2016 年前的实验室，经过多年发展逐步成型，疫情期间暂停招新后，现由学长张政余重启并持续运营，目前已进入全新发展阶段。
                        </p>
                    </section>

                    <!-- 工作室现状 -->
                    <section>
                        <h3 class="mb-[22px] text-[37.4px] font-semibold text-[#033B37]">
                            工作室现状
                        </h3>
                        <ul class="space-y-[22px]">
                            <li v-for="item in statusList" :key="item"
                                class="flex items-start text-[28.2px] leading-[1.7] text-[#033B37]">
                                <span
                                    class="mt-[14.4px] mr-[25.9px] inline-block h-[14.4px] w-[14.4px] shrink-0 rounded-full bg-[#2f8a84]"></span>
                                <span>{{ item }}</span>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
            <!-- 星星：面板右上角 -->
            <img src="/aboutus2/star.webp"
                class="panel-star absolute left-[84%] top-[14.1%] z-6 w-[23%] max-w-none" />
            <!-- 地球：面板内右下角 -->
            <img src="/aboutus2/earth.webp"
                class="panel-earth absolute left-[87%] top-[71.4%] z-6 w-[5.5%] max-w-none" />
            <!-- 左上角两个标题 -->
            <img src="/aboutus2/title-zh.webp" class="absolute left-[4%] top-[16%] z-10 w-[13.7%] max-w-none" />
            <img src="/aboutus2/title.webp" class="absolute left-[4.1%] top-[22%] z-10 w-[8.07%] max-w-none" />
        </DesignStage>
    </div>
</template>

<style scoped>
/* 整页入场淡入已由 App.vue 的弧形过渡统一接管，这里不再单独做 .fade-in 动画 */
</style>
