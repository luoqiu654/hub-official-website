<script setup>
import { makeScale } from '../composables/useDesignScale'

// 每页声明自己的设计画幅:默认 1920×1080(16:9)。像 index 这类原生
// 2880×2048 画幅的页面可覆写为 2880/2048,以保证美术不因强制 16:9 被裁切。
const props = defineProps({
  designW: { type: Number, default: 1920 },
  designH: { type: Number, default: 1080 },
  // contain(默认):min(scaleX,scaleY),内容完整可见;width:锁宽铺满(纵向裁切);
  // height:锁高铺满(横向裁切)。高画布(2880 宽)在 16:9 屏用 width 才不缩水。
  fit: { type: String, default: 'contain' },
})

// 该页自己的等比缩放 = makeScale(designW, designH, fit)
const scale = makeScale(props.designW, props.designH, props.fit)
</script>

<template>
  <!-- 视口铺满层:铺底背景不随舞台缩放、永远填满真实视口(object-cover),
       用来遮盖等比缩放后留下的留白边条。页面无背景图时可放纯色/渐变层。 -->
  <div class="absolute inset-0 overflow-hidden">
    <slot name="bg" />

    <!-- 设计舞台:固定 designW×designH px,居中,按 min(scaleX, scaleY) 等比缩放。
         transform: scale() 会使其成为后代 fixed/absolute 的包含块,因此放进
         舞台内的元素都以设计坐标系定位并随舞台整体缩放——这正修复了原布局
         「内层 px 不随外层等比盒缩放」导致的错位。 -->
    <div
      class="absolute left-1/2 top-1/2"
      :style="{
        width: props.designW + 'px',
        height: props.designH + 'px',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }"
    >
      <!-- 设计坐标系内容:内部元素用 px 绝对/固定定位,且随舞台等比缩放 -->
      <slot />
    </div>
  </div>
</template>
