# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).
hub-official-website/
├── index.html                      # 入口 HTML（含 viewport-fit=cover）
├── package.json                    # 依赖：vue3 / vue-router5 / gsap3 / vite8 / tailwind4
├── vite.config.js                  # Vite 配置（@vitejs/plugin-vue + tailwind）
├── pnpm-lock.yaml                  # 依赖锁定
├── .gitignore                      # 排除 node_modules / dist / verify 等
│
├── public/                         # 静态素材（71个文件，构建时原样复制）
│   ├── index/                      # 首页：bg / title / girl / bar / star
│   ├── aboutus/  aboutus2/         # 关于我们两页素材
│   ├── whatwedo/  whatwedo2/       # 项目展示两页素材
│   ├── grow/  grow-community/      # 成长体系：rocket / memberType
│   ├── destination/                # 成员去向：earth + 7成员头像
│   └── contact-us/                 # 联系我们：email / redbook / wechat 图标
│
└── src/
    ├── main.js                     # 应用入口：initDesignScale + initIsMobile + mount
    ├── App.vue                     # 双轨渲染根组件 + 桌面端弧形翻页过渡
    ├── style.css                   # 全局样式（tailwind 入口）
    │
    ├── router/index.js             # 路由：hash 模式，10条路由（含 grow 子路由3条）
    │
    ├── composables/                # 组合式函数（8个）
    │   ├── useDesignScale.js       # 【桌面】1920×1080 设计坐标系等比缩放
    │   ├── useFlipLock.js          # 【桌面】翻页期间锁死滚轮，防止连续触发
    │   ├── useGrowScene.js         # 【桌面】grow 子页横向滚动场景
    │   ├── projectLinks.js         # 【共享】26个项目外链数据
    │   ├── publicUrl.js            # 【共享】public 路径拼接工具
    │   ├── useProjectAssets.js     # 【共享】扫描 whatwedo 图片生成项目卡数据
    │   ├── useIsMobile.js          # 【V1.0新增】设备检测：pointer:coarse OR max-width≤1024
    │   └── useMobileReveal.js      # 【V1.1新增】ScrollTrigger 通用 fade-up 进场
    │
    ├── components/
    │   ├── DesignStage.vue         # 【桌面】设计坐标缩放容器（包裹每一页）
    │   └── mobile/                 # 【V1.0新增】移动端独立组件（8个）
    │       ├── MobileShell.vue     # 移动端根：吸顶导航 + scrollspy + 6区块
    │       ├── MobileHome.vue      # 首页：bg铺底 + GSAP 进场序列
    │       ├── MobileAbout.vue     # 关于我们
    │       ├── MobileProjects.vue  # 项目展示：双行走马灯 + 模态框 + 方向卡浮动
    │       ├── MobileGrow.vue      # 成长体系：垂直轨迹 + 社区翻页 + 服务圆卡
    │       ├── MobileDestinations.vue  # 成员去向：水平圆弧 + 连续拖拽 + 惯性吸附
    │       └── MobileContact.vue   # 联系我们：同心圆轨道 + 火箭绕圈 + 点击交互
    │
    ├── views/                      # 【桌面端】10个页面组件（零改动）
    │   ├── index.vue               # 第1页：首页
    │   ├── about-us.vue            # 第2页：关于我们
    │   ├── about-us2.vue           # 第3页：关于我们（续）
    │   ├── what-we-do.vue          # 第4页：项目展示
    │   ├── what-we-do2.vue         # 第5页：项目展示（续）
    │   ├── destination/
    │   │   ├── destination.vue     # 第9页：成员去向（弧线轮播）
    │   │   └── data.json           # 7位成员数据
    │   ├── grow/
    │   │   ├── grow.vue            # 第6页容器（含子路由出口）
    │   │   ├── grow-main.vue       # 第6页：成长路径
    │   │   ├── grow-community.vue  # 第7页：实战成长社区
    │   │   └── grow-service.vue    # 第8页：求职增值服务
    │   └── contact-us.vue          # 第10页：联系我们
    │
    └── assets/whatwedo/            # 26张项目卡片 webp 图（Vite 构建时 hash 处理）
