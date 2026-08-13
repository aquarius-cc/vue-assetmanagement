/**
 * @file 应用入口文件，初始化 Vue 应用、路由、状态管理
 * @module src/main
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { lazyLoadDirective } from '@/utils/Image'

// ========== 1. 全局样式（按顺序导入） ==========
// 1.1 重置样式（normalize.css + 自定义 reset）
import 'normalize.css/normalize.css'
import '@/assets/styles/global-reset.scss'

// 1.2 第三方 UI 库样式（Element Plus）
import 'element-plus/dist/index.css'

// 1.3 设计令牌与CSS变量
import '@/styles/variables.css'
import '@/styles/dark.css'

// 1.4 自定义全局样式（滚动条等，必须放在最后以覆盖可能的冲突）
import '@/assets/styles/global-scroll.scss'

// ========== 2. 创建应用并注册插件 ==========
const app = createApp(App)

// Pinia 状态管理
app.use(createPinia())

// Vue Router
app.use(router)

// 自定义指令：图片懒加载
app.directive('lazy', lazyLoadDirective)

// 挂载应用
app.mount('#app')
