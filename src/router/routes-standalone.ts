/**
 * @file 独立页面路由（不需要 MainView 布局：资产操作直访页/扫码/通讯录/404）
 * @module src/router/routes-standalone
 * @exports
 *   - routesStandalone: RouteRecordRaw[]
 * @callers
 *   - src/router/index.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 * @note
 *   NotFound（catch-all）必须位于 routes 数组最后，保持优先级。
 */

import type { RouteRecordRaw } from 'vue-router'

export const routesStandalone: RouteRecordRaw[] = [
  // ===== 独立页面路由（不需要 MainView 布局） =====
  {
    path: '/assets/:code/recycle',
    name: 'RecycleAsset',
    component: () => import('@/views/RecycleAssetView.vue'),
    meta: {
      title: '资产回收',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/repair',
    name: 'RepairAsset',
    component: () => import('@/views/RepairAssetView.vue'),
    meta: {
      title: '资产维修',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/repair-done',
    name: 'RepairDone',
    component: () => import('@/views/RepairDoneView.vue'),
    meta: {
      title: '维修完成',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/repair-failed',
    name: 'RepairFailed',
    component: () => import('@/views/RepairFailedView.vue'),
    meta: {
      title: '维修失败',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/lost',
    name: 'LostAsset',
    component: () => import('@/views/LostAssetView.vue'),
    meta: {
      title: '资产遗失',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/mark-broken',
    name: 'MarkBroken',
    component: () => import('@/views/MarkBrokenView.vue'),
    meta: {
      title: '资产损坏登记',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/found',
    name: 'FoundAsset',
    component: () => import('@/views/FoundAssetView.vue'),
    meta: {
      title: '找回遗失资产',
      requiresAuth: true,
      requiredMinRole: 'asset_admin',
    },
  },
  {
    path: '/assets/:code/scrap',
    name: 'ScrapAsset',
    component: () => import('@/views/ScrapAssetView.vue'),
    meta: {
      title: '资产报废申请',
      requiresAuth: true,
    },
  },
  {
    path: '/assets/:code/logs',
    name: 'AssetLogs',
    component: () => import('@/views/AssetLogsView.vue'),
    meta: {
      title: '资产状态日志',
      requiresAuth: true,
    },
  },
  {
    path: '/scan/:recordcode',
    name: 'ScanAsset',
    component: () => import('@/views/ScanAssetView.vue'),
    meta: {
      title: '扫码查看',
      requiresAuth: false,
    },
  },
  {
    path: '/org/contacts',
    name: 'Contacts',
    component: () => import('@/views/ContactsView.vue'),
    meta: {
      title: '通讯录',
      requiresAuth: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面未找到' },
  },
]
