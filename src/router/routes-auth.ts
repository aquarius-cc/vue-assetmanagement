/**
 * @file 认证相关路由（/ 重定向 + /login）
 * @module src/router/routes-auth
 * @exports
 *   - routesAuth: RouteRecordRaw[]
 * @callers
 *   - src/router/index.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 *   - @/views/LogIn.vue
 */

import type { RouteRecordRaw } from 'vue-router'
import Login from '@/views/LogIn.vue'

export const routesAuth: RouteRecordRaw[] = [
  {
    path: '/',
    // name: 'MainViews',
    redirect: '/login',
    // component: () => import('@/views/MainView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '用户登录',
      requiresAuth: false,
    },
  },
]
