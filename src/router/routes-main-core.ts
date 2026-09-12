/**
 * @file /main 子路由——核心管理段（Dashboard/通知/资产详情/合同/分类/仓库/员工）
 * @module src/router/routes-main-core
 * @exports
 *   - routesMainCore: RouteRecordRaw[]
 * @callers
 *   - src/router/routes-main.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 */

import type { RouteRecordRaw } from 'vue-router'

export const routesMainCore: RouteRecordRaw[] = [
  {
    path: '', // 空路径作为默认子路由
    name: 'Dashboard',
    component: () => import('@/components/DashboardPage.vue'),
    meta: {
      title: '首页',
      requiresAuth: true,
    },
  },
  {
    path: 'notifications',
    name: 'NotificationList',
    component: () => import('@/views/NotificationList.vue'),
    meta: {
      title: '通知中心',
      requiresAuth: true,
    },
  },
  {
    path: 'assetdetails', // 子路由不需要以/开头
    name: 'AssetDetails',
    component: () => import('@/components/AssetDetails.vue'),
    meta: {
      title: '资产管理',
      requiresAuth: true,
      showPageHeader: true,
    },
    children: [
      {
        // path: 'details', // 空路径作为默认子路由
        path: ':asset_code?', // 空路径作为默认子路由
        name: 'AssetContentDetails',
        component: () => import('@/components/componentsdetails/AssetContentDetails.vue'),
        meta: {
          title: '资产详情',
          requiresAuth: true,
          keepAlive: true, // 添加缓存标识
          componentName: 'AssetContentDetails', // 组件名称（需与组件定义的name一致）
        },
        children: [
          {
            path: 'basicassetdetails',
            name: 'BasicAssetDetails',
            component: () => import('@/components/componentsdetails/detils/BasicAssetDetails.vue'),
            meta: {
              title: '资产基本信息',
              requiresAuth: true,
            },
          },

          {
            path: 'assetform',
            name: 'AssetForm',
            component: () => import('@/components/componentsdetails/detils/AssetForm.vue'),
            meta: {
              title: '资产录入/编辑',
              requiresAuth: true,
            },
          },
          {
            path: 'assetbatchimport',
            name: 'AssetBatchImport',
            component: () => import('@/components/componentsdetails/detils/AssetBatchImport.vue'),
            meta: {
              title: '资产批量导入',
              requiresAuth: true,
            },
          },
        ],
      },
    ],
  },
  {
    path: 'contractdetails',
    name: 'ContractDetails',
    component: () => import('@/components/componentsdetails/ContractDetails.vue'),
    meta: {
      title: '合同管理',
      requiresAuth: true,
      showPageHeader: true,
      requiredMinRole: 'system_admin',
      keepAlive: true, // 添加缓存标识（统一使用小写 keepAlive，与 MainView.vue 中的 filter 一致）
      componentName: 'ContractDetails', // 组件名称（需与组件定义的name一致）
    },
    children: [
      {
        path: 'contractofdetails',
        name: 'ContractOfDetails',
        component: () => import('@/components/componentsdetails/detils/ContractOfDetails.vue'),
        props: (route) => ({ code: route.query.code }), // 传递 query 参数到子组件
        meta: {
          title: '合同详情',
          requiresAuth: true,
        },
      },
      {
        path: 'contractform',
        name: 'ContractForm',
        component: () => import('@/components/componentsdetails/detils/ContractForm.vue'),
        meta: {
          title: '合同表格',
          requiresAuth: true,
        },
      },

      {
        path: 'contractbatchimport',
        name: 'ContractBatchImport',
        component: () => import('@/components/componentsdetails/detils/ContractBatchImport.vue'),
        meta: {
          title: '合同批量导入',
          requiresAuth: true,
        },
      },
    ],
  },

  {
    path: 'assettypedetails',
    name: 'AssetTypeDetails',
    component: () => import('@/components/componentsdetails/AssetTypeDetails.vue'),
    meta: {
      title: '资产分类类型管理',
      requiresAuth: true,
      showPageHeader: true,
      requiredMinRole: 'system_admin',
      keepAlive: true, // 添加缓存标识（统一使用小写 keepAlive）
      componentName: 'AssetTypeDetails', // 组件名称（需与组件定义的name一致）
    },
    children: [
      {
        path: 'assettypeform',
        name: 'AssetTypeForm',
        component: () => import('@/components/componentsdetails/detils/AssetTypeForm.vue'),
        meta: {
          title: '资产分类类型表格',
          requiresAuth: true,
        },
      },
      {
        path: 'assettypebatchimport',
        name: 'AssetTypeBatchImport',
        component: () => import('@/components/componentsdetails/detils/AssetTypeBatchImport.vue'),
        meta: {
          title: '资产分类批量导入',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: 'storagedetails',
    name: 'StorageDetails',
    component: () => import('@/components/componentsdetails/StorageDetails.vue'),
    meta: {
      title: '仓库管理',
      requiresAuth: true,
      showPageHeader: true,
      requiredMinRole: 'system_admin',
      keepAlive: true,
      componentName: 'StorageDetails', // 组件名称（需与组件定义的name一致）
    },
    children: [
      {
        path: 'storageform',
        name: 'StorageForm',
        component: () => import('@/components/componentsdetails/detils/StorageForm.vue'),
        meta: {
          title: '仓库录入/编辑',
          requiresAuth: true,
        },
      },
      {
        path: 'storagebatchimport',
        name: 'StorageBatchImport',
        component: () => import('@/components/componentsdetails/detils/StorageBatchImport.vue'),
        meta: {
          title: '仓库批量导入',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: 'userdetails',
    name: 'UserDetails',
    component: () => import('@/components/componentsdetails/UserDetails.vue'),
    meta: {
      title: '员工管理',
      requiresAuth: true,
      showPageHeader: true,
      requiredMinRole: 'system_admin',
      keepAlive: true, // 添加缓存标识（统一使用小写 keepAlive）
      componentName: 'UserDetails', // 组件名称（需与组件定义的name一致）
    },
    children: [
      {
        path: 'userform',
        name: 'UserForm',
        component: () => import('@/components/componentsdetails/detils/UserForm.vue'),
        meta: {
          title: '用户录入/编辑',
          requiresAuth: true,
        },
      },
      {
        path: 'userbatchimport',
        name: 'UserBatchImport',
        component: () => import('@/components/componentsdetails/detils/UserBatchImport.vue'),
        meta: {
          title: '批量导入用户',
          requiresAuth: true,
        },
      },
    ],
  },
]
