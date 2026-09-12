/**
 * @file /main 外壳路由（MainView 布局 + children 组合）
 * @module src/router/routes-main
 * @exports
 *   - routesMain: RouteRecordRaw[]（单元素：/main 外壳）
 * @callers
 *   - src/router/index.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 *   - @/views/MainView.vue
 *   - ./routes-main-core / routes-main-operations / routes-main-system
 */

import type { RouteRecordRaw } from 'vue-router'
import { routesMainCore } from './routes-main-core'
import { routesMainOperations } from './routes-main-operations'
import { routesMainSystem } from './routes-main-system'

export const routesMain: RouteRecordRaw[] = [
  {
    path: '/main',
    name: 'MainViews',
    component: () => import('@/views/MainView.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [...routesMainCore, ...routesMainOperations, ...routesMainSystem],
  },
]
