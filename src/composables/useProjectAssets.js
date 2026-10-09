// 项目卡片图片公共入口：构建期扫描 src/assets/whatwedo 下全部 *.webp。
// 目录里每张 webp = 一个「项目卡片」，文件名即项目名（展示名 = 文件名 + “项目”）。
// what-we-do.vue / what-we-do2.vue 都从这一处取图，图片路径只在这里维护：
// 往该文件夹放一张新图即可自动进跑马灯 / 弹窗，无需改代码，也避免两处重复硬编码路径。
const modules = import.meta.glob('../assets/whatwedo/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

// what-we-do.vue：项目卡片集合（按路径条目），视图内再自行排序并叠加跳转链接
export const cardModules = modules

// what-we-do2.vue：文件名 → URL 映射，按文件名取用
export const projectImgs = Object.fromEntries(
  Object.entries(modules).map(([file, url]) => [file.split('/').pop(), url])
)
