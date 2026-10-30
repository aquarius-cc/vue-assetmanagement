/**
 * @file /main 子路由——资产操作段（发放/回收/损坏/遗失/找回/维修/报废/已报废/未登记）
 * @module src/router/routes-main-operations
 * @exports
 *   - routesMainOperations: RouteRecordRaw[]
 * @callers
 *   - src/router/routes-main.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 */

import type { RouteRecordRaw } from 'vue-router'

export const routesMainOperations: RouteRecordRaw[] = [
  {
    path: 'outassetdetails',
    name: 'OutAssetDetails',
    component: () => import('@/components/componentsdetails/OutAssetDetails.vue'),
    meta: {
      title: '资产发放',
      requiresAuth: true,
      showPageHeader: true,
    },
    children: [
      {
        path: 'outassetform',
        name: 'OutAssetForm',
        component: () => import('@/components/componentsdetails/detils/OutAssetForm.vue'),
        meta: {
          title: '资产发放录入/编辑',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：仅写 deny 兜底判据
          // [R-3/M-RC-07] 父前缀 /main/outassetdetails 不在 roleWhitelist，
          // regular_user 此前可直达；meta 仅加子路由，列表页仍对受限角色开放
          requiredMinRole: 'asset_admin',
        },
      },
      {
        path: 'outassetbasicdetails',
        name: 'OutAssetBasicDetails',
        component: () => import('@/components/componentsdetails/detils/OutAssetBasicDetails.vue'),
        props: (route) => ({ code: route.query.code }), // 传递 query 参数到子组件
        meta: {
          title: '发放资产详情',
          requiresAuth: true,
        },
      },
      {
        path: 'outassetbatchimport',
        name: 'OutAssetBatchImport',
        component: () => import('@/components/componentsdetails/detils/OutAssetBatchImport.vue'),
        meta: {
          title: '批量导入资产发放',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：仅写 deny 兜底判据
          // [R-3/M-RC-07] 门槛同 OutAssetForm
          requiredMinRole: 'asset_admin',
        },
      },
    ],
  },
  {
    path: 'recycleassetdetails',
    name: 'RecycleAssetDetails',
    component: () => import('@/components/componentsdetails/RecycleAssetDetails.vue'),
    meta: {
      title: '资产回收',
      requiresAuth: true,
      showPageHeader: true,
    },
    children: [
      {
        path: 'recycleassetform',
        name: 'RecycleAssetForm',
        component: () => import('@/components/componentsdetails/detils/RecycleAssetForm.vue'),
        meta: {
          title: '资产回收录入/编辑',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：仅写 deny 兜底判据
          // [R-3/M-RC-07] 父前缀 /main/recycleassetdetails 不在 roleWhitelist；
          // 回收族无 batchimport 路由，本条为其唯一写入页
          requiredMinRole: 'asset_admin',
        },
      },
      {
        path: 'recycleassetbasicdetails',
        name: 'RecycleAssetBasicDetails',
        component: () =>
          import('@/components/componentsdetails/detils/RecycleAssetBasicDetails.vue'),
        props: (route) => ({ code: route.query.code }), // 传递 query 参数到子组件
        meta: {
          title: '回收资产详情',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: 'brokenassetdetails',
    name: 'BrokenAssetDetails',
    component: () => import('@/components/componentsdetails/BrokenAssetDetails.vue'),
    meta: {
      title: '损坏资产',
      requiresAuth: true,
      showPageHeader: true,
    },
  },
  {
    path: 'lostassetdetails',
    name: 'LostAssetDetails',
    component: () => import('@/components/componentsdetails/LostAssetDetails.vue'),
    meta: {
      title: '遗失资产',
      requiresAuth: true,
      showPageHeader: true,
    },
  },
  {
    path: 'foundassetdetails',
    name: 'FoundAssetDetails',
    component: () => import('@/components/componentsdetails/FoundAssetDetails.vue'),
    meta: {
      title: '找回资产',
      requiresAuth: true,
      showPageHeader: true,
    },
  },
  {
    path: 'repairassetdetails',
    name: 'RepairAssetDetails',
    component: () => import('@/components/componentsdetails/RepairAssetDetails.vue'),
    meta: {
      title: '维修记录',
      requiresAuth: true,
      showPageHeader: true,
    },
  },
  {
    path: 'damagedassetdetails',
    name: 'DamagedAssetDetails',
    component: () => import('@/components/componentsdetails/DamagedAssetDetails.vue'),
    meta: {
      title: '资产报废',
      requiresAuth: true,
      showPageHeader: true,
    },
    children: [
      {
        path: 'damagedassetform',
        name: 'DamagedAssetForm',
        component: () => import('@/components/componentsdetails/detils/DamagedAssetForm.vue'),
        meta: {
          title: '待报废资产录入/编辑',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/damagedassetdetails 已是显式门槛
          // [R-3] 禁补 requiredMinRole：父前缀已在 roleWhitelist(4/5 级)，补 3 级 meta 即扩权
        },
      },
      {
        path: 'damagedassetbasicdetails',
        name: 'DamagedAssetBasicDetails',
        component: () =>
          import('@/components/componentsdetails/detils/DamagedAssetBasicDetails.vue'),
        props: (route) => ({ code: route.query.code }),
        meta: { title: '待报废资产详情', requiresAuth: true },
      },
      {
        path: 'damagedassetbatchimport',
        name: 'DamagedAssetBatchImport',
        component: () =>
          import('@/components/componentsdetails/detils/DamagedAssetBatchImport.vue'),
        meta: {
          title: '批量导入待报废资产',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/damagedassetdetails 已是显式门槛
          // [R-3] 禁补 requiredMinRole：父前缀已在 roleWhitelist(4/5 级)，补 3 级 meta 即扩权
        },
      },
    ],
  },
  {
    path: 'wasteassetdetails',
    name: 'WasteAssetDetails',
    component: () => import('@/components/componentsdetails/WasteAssetDetails.vue'),
    meta: {
      title: '已报废资产',
      requiresAuth: true,
      showPageHeader: true,
    },
    children: [
      {
        path: 'wasteassetbasicdetails',
        name: 'WasteAssetBasicDetails',
        component: () => import('@/components/componentsdetails/detils/WasteAssetBasicDetails.vue'),
        meta: { title: '已报废资产详情', requiresAuth: true },
      },
    ],
  },
  {
    path: 'unregisteredassetdetails',
    name: 'UnregisteredAssetDetails',
    component: () => import('@/components/componentsdetails/UnregisteredAssetDetails.vue'),
    meta: { title: '未登记资产', requiresAuth: true, showPageHeader: true },
    children: [
      {
        path: 'unregisteredassetform',
        name: 'UnregisteredAssetForm',
        component: () => import('@/components/componentsdetails/detils/UnregisteredAssetForm.vue'),
        meta: {
          title: '未登记资产录入/编辑',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/unregisteredassetdetails 已是显式门槛
          // [R-3] 禁补 requiredMinRole：父前缀已在 roleWhitelist(4/5 级)，补 3 级 meta 即扩权
        },
      },
      {
        path: 'unregisteredassetbasicdetails',
        name: 'UnregisteredAssetBasicDetails',
        component: () =>
          import('@/components/componentsdetails/detils/UnregisteredAssetBasicDetails.vue'),
        props: (route) => ({ code: route.query.code }),
        meta: { title: '未登记资产详情', requiresAuth: true },
      },
      {
        path: 'unregisteredassetbatchimport',
        name: 'UnregisteredAssetBatchImport',
        component: () =>
          import('@/components/componentsdetails/detils/UnregisteredAssetBatchImport.vue'),
        meta: {
          title: '批量导入未登记资产',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/unregisteredassetdetails 已是显式门槛
          // [R-3] 禁补 requiredMinRole：父前缀已在 roleWhitelist(4/5 级)，补 3 级 meta 即扩权
        },
      },
    ],
  },
]
