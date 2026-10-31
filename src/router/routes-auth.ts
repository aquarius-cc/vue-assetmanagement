/**
 * @file 认证相关路由（/ 重定向 + /login）
 * @module src/router/routes-auth
 * @exports
 *   - routesAuth: RouteRecordRaw[]
 * @callers
 *   - src/router/index.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 *   - @/views/LogIn.vue（[M-29] 懒加载：LogIn 是唯一静态 import 的路由组件，
 *     会进主入口 chunk；改动态 import 后与「路由全量懒加载」约定一致）
 */

import type { RouteRecordRaw } from 'vue-router'

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
    // [M-29] 懒加载，移出主入口 chunk
    component: () => import('@/views/LogIn.vue'),
    meta: {
      title: '用户登录',
      requiresAuth: false,
    },
  },
]
