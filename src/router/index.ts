/**
 * @file 路由配置入口：组合各路由模块并创建 Vue Router 实例
 * @module src/router
 * @exports
 *   - default: Vue Router 实例
 * @callers
 *   - src/main.ts
 *   - src/router/navigation.ts
 * @dependsOn
 *   - vue-router (createRouter, createWebHistory)
 *   - @/router/guards (setupAuthGuard)
 *   - ./routes-auth / ./routes-main / ./routes-standalone
 */

import { createRouter, createWebHistory } from 'vue-router'
import { setupAuthGuard } from '@/router/guards'
import { routesAuth } from './routes-auth'
import { routesMain } from './routes-main'
import { routesStandalone } from './routes-standalone'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 路由按模块组合（DR-5 拆分）：认证段 → /main 布局段 → 独立页段（NotFound 必须最后）
  routes: [...routesAuth, ...routesMain, ...routesStandalone],
})

// 设置路由守卫
setupAuthGuard(router)

export default router
