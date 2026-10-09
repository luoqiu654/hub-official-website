// public/ 目录下静态资源的运行时 URL。
//
// public 里的文件不经过 Vite 打包，原样复制到 dist 根目录。在模板里写 src="/xxx/a.webp"
// 时，构建阶段会把绝对路径改写成相对路径（base 为 './' 时 → new URL('../xxx/a.webp', ...)）；
// 但同样一个路径如果出现在 <script> 的字符串、数组或 .json 数据里，Vite 不会改写它。
//
// 这类路径必须过一遍本函数，否则部署到子目录（如 https://xxx.edu.cn/cqupt-hub/）时，
// 写死的 "/xxx/a.webp" 会解析到域名根目录而 404。
//
// 拼接的是 BASE_URL（构建时由 vite.config.js 的 base 决定），所以改 base 时无需改调用方。
export function publicUrl(path) {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
