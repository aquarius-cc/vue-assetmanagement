// index.ts

import { createRouter, createWebHistory } from 'vue-router'
// import Login from '@/views/LogIn.vue'
import Login from '@/views/LogIn.vue'
import { setupAuthGuard } from '@/router/guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // history: createWebHistory(),
  routes: [
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
    {
      path: '/main',
      name: 'MainViews',
      component: () => import('@/views/MainView.vue'),
      meta: {
        requiresAuth: true,
      },
      children: [
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
          path: 'assetdetails', // 子路由不需要以/开头
          name: 'AssetDetails',
          component: () => import('@/components/AssetDetails.vue'),
          meta: {
            title: '资产管理',
            requiresAuth: true,
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
                  component: () =>
                    import('@/components/componentsdetails/detils/BasicAssetDetails.vue'),
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
                  component: () =>
                    import('@/components/componentsdetails/detils/AssetBatchImport.vue'),
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
            keepAlive: true, // 添加缓存标识（统一使用小写 keepAlive，与 MainView.vue 中的 filter 一致）
            componentName: 'ContractDetails', // 组件名称（需与组件定义的name一致）
          },
          children: [
            {
              path: 'contractofdetails',
              name: 'ContractOfDetails',
              component: () =>
                import('@/components/componentsdetails/detils/ContractOfDetails.vue'),
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
              component: () =>
                import('@/components/componentsdetails/detils/ContractBatchImport.vue'),
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
              component: () =>
                import('@/components/componentsdetails/detils/AssetTypeBatchImport.vue'),
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
            title: '用户管理',
            requiresAuth: true,
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
        {
          path: 'outassetdetails',
          name: 'OutAssetDetails',
          component: () => import('@/components/componentsdetails/OutAssetDetails.vue'),
          meta: {
            title: '资产发放',
            requiresAuth: true,
          },
          children: [

            {
              path: 'outassetform',
              name: 'OutAssetForm',
              component: () => import('@/components/componentsdetails/detils/OutAssetForm.vue'),
              meta: {
                title: '资产发放录入/编辑',
                requiresAuth: true,
              },
            },
            {
              path: 'outassetbasicdetails',
              name: 'OutAssetBasicDetails',
              component: () =>
                import('@/components/componentsdetails/detils/OutAssetBasicDetails.vue'),
              props: (route) => ({ code: route.query.code }), // 传递 query 参数到子组件
              meta: {
                title: '发放资产详情',
                requiresAuth: true,
              },
            },
            {
              path: 'outassetbatchimport',
              name: 'OutAssetBatchImport',
              component: () =>
                import('@/components/componentsdetails/detils/OutAssetBatchImport.vue'),
              meta: {
                title: '批量导入资产发放',
                requiresAuth: true,
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
          },
          children: [
            {
              path: 'recycleassetform',
              name: 'RecycleAssetForm',
              component: () =>
                import('@/components/componentsdetails/detils/RecycleAssetForm.vue'),
              meta: {
                title: '资产回收录入/编辑',
                requiresAuth: true,
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
          },
        },
        {
          path: 'lostassetdetails',
          name: 'LostAssetDetails',
          component: () => import('@/components/componentsdetails/LostAssetDetails.vue'),
          meta: {
            title: '遗失资产',
            requiresAuth: true,
          },
        },
        {
          path: 'foundassetdetails',
          name: 'FoundAssetDetails',
          component: () => import('@/components/componentsdetails/FoundAssetDetails.vue'),
          meta: {
            title: '找回资产',
            requiresAuth: true,
          },
        },
        {
          path: 'repairassetdetails',
          name: 'RepairAssetDetails',
          component: () => import('@/components/componentsdetails/RepairAssetDetails.vue'),
          meta: {
            title: '维修记录',
            requiresAuth: true,
          },
        },
        {
          path: 'damagedassetdetails',
          name: 'DamagedAssetDetails',
          component: () => import('@/components/componentsdetails/DamagedAssetDetails.vue'),
          meta: {
            title: '资产报废',
            requiresAuth: true,
          },
          children: [
            {
              path: 'damagedassetform',
              name: 'DamagedAssetForm',
              component: () => import('@/components/componentsdetails/detils/DamagedAssetForm.vue'),
              meta: { title: '待报废资产录入/编辑', requiresAuth: true },
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
              meta: { title: '批量导入待报废资产', requiresAuth: true },
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
          },
          children: [
            {
              path: 'wasteassetbasicdetails',
              name: 'WasteAssetBasicDetails',
              component: () =>
                import('@/components/componentsdetails/detils/WasteAssetBasicDetails.vue'),
              meta: { title: '已报废资产详情', requiresAuth: true },
            },
          ],
        },
        {
          path: 'unregisteredassetdetails',
          name: 'UnregisteredAssetDetails',
          component: () => import('@/components/componentsdetails/UnregisteredAssetDetails.vue'),
          meta: { title: '未登记资产', requiresAuth: true },
          children: [
            {
              path: 'unregisteredassetform',
              name: 'UnregisteredAssetForm',
              component: () => import('@/components/componentsdetails/detils/UnregisteredAssetForm.vue'),
              meta: { title: '未登记资产录入/编辑', requiresAuth: true },
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
              meta: { title: '批量导入未登记资产', requiresAuth: true },
            },
          ],
        },
        {
          path: 'operationlogdetails',
          name: 'OperationLogDetails',
          component: () => import('@/components/componentsdetails/OperationLogDetails.vue'),
          meta: { title: '资产操作日志', requiresAuth: true },
          children: [
            {
              path: 'operationlogdetail',
              name: 'OperationLogDetail',
              component: () => import('@/components/componentsdetails/detils/OperationLogDetail.vue'),
              props: (route) => ({ pk: route.query.pk }),
              meta: { title: '操作日志详情', requiresAuth: true },
            },
          ],
        },
        {
          path: 'auditlogdetails',
          name: 'AuditLogDetails',
          component: () => import('@/components/componentsdetails/AuditLogDetails.vue'),
          meta: { title: '其它操作日志', requiresAuth: true },
          children: [
            {
              path: 'auditlogdetail',
              name: 'AuditLogDetail',
              component: () => import('@/components/componentsdetails/detils/AuditLogDetail.vue'),
              meta: { title: '审计日志详情', requiresAuth: true },
            },
          ],
        },
        {
          path: 'harddisksndetails',
          name: 'HardDiskSNDetails',
          component: () => import('@/components/componentsdetails/HardDiskSNDetails.vue'),
          meta: { title: '硬盘序列号', requiresAuth: true },
          children: [
            {
              path: 'harddisksnform',
              name: 'HardDiskSNForm',
              component: () => import('@/components/componentsdetails/detils/HardDiskSNForm.vue'),
              meta: { title: '硬盘序列号录入/编辑', requiresAuth: true },
            },
            {
              path: 'harddisksnbasicdetails',
              name: 'HardDiskSNBasicDetails',
              component: () => import('@/components/componentsdetails/detils/HardDiskSNBasicDetails.vue'),
              props: (route) => ({ id: route.query.id }),
              meta: { title: '硬盘序列号详情', requiresAuth: true },
            },
          ],
        },
        {
          path: 'departmentmanagement',
              name: 'DepartmentManagement',
              component: () => import('@/components/componentsdetails/DepartmentManagement.vue'),
              meta: {
                title: '部门-人员管理',
                requiresAuth: true,
          },
          children: [
            {
              /**
               * 修复路由名称重复问题：
               * DepartmentManagement 下的子路由名称必须与 UserDetails 下的子路由名称不同，
               * 因为 Vue Router 要求所有路由名称全局唯一。
               * 此处使用 Dept 前缀区分：DeptUserForm / DeptUserBatchImport / DeptDepartmentBatchImport
               * 对应 DepartmentEmployeeList.vue 中的导航引用也已同步更新。
               */
              path:'userform',
              name:'DeptUserForm',
              component: () => import('@/components/componentsdetails/detils/UserForm.vue'),
              meta: {
                title: '用户录入',
                requiresAuth: true,
              },
            },
            {
              path:'userbatchimport',
              name:'DeptUserBatchImport',
              component: () => import('@/components/componentsdetails/detils/UserBatchImport.vue'),
              meta: {
                title: '批量导入用户',
                requiresAuth: true,
              },
            },
            {
              path:'departmentbatchimport',
              name:'DeptDepartmentBatchImport',
              component: () => import('@/components/componentsdetails/detils/DepartmentBatchImport.vue'),
              meta: {
                title: '批量导入部门',
                requiresAuth: true,
              },
            },
          ]
        },
        {
          path: 'departmentdetails',
          name: 'DepartmentDetails',
          component: () => import('@/components/componentsdetails/DepartmentDetails.vue'),
          meta: {
            title: '部门管理',
            requiresAuth: true,
            keepAlive: true, // 添加缓存标识（统一使用小写 keepAlive）
            componentName: 'DepartmentDetails', // 组件名称（需与组件定义的name一致）
          },
          children: [

            {
              path: 'departmentform',
              name: 'DepartmentForm',
              component: () => import('@/components/componentsdetails/detils/DepartmentForm.vue'),
              meta: {
                title: '部门录入',
                requiresAuth: true,
              },
            },
            {
              path: 'departmentbatchimport',
              name: 'DepartmentBatchImport',
              component: () =>
                import('@/components/componentsdetails/detils/DepartmentBatchImport.vue'),
              meta: {
                title: '批量导入部门',
                requiresAuth: true,
              },
            },
          ],
        },
        {
          /**
           * 修复路由名称重复：
           * AssetForm 在 AssetContentDetails 子路由中已定义（用于资产详情页的子路由嵌套），
           * 此处为 MainViews 直接子路由（侧边栏跳转入口），使用 Direct 前缀区分。
           */
          path: 'assetform',
          name: 'AssetFormDirect',
          component: () => import('@/components/componentsdetails/detils/AssetForm.vue'),
          meta: {
            title: '资产录入',
            requiresAuth: true,
          },
        },
      ],
    },
    // ===== 独立页面路由（不需要 MainView 布局） =====
    {
      path: '/assets/:code/recycle',
      name: 'RecycleAsset',
      component: () => import('@/views/RecycleAssetView.vue'),
      meta: {
        title: '资产回收',
        requiresAuth: true,
      },
    },
    {
      path: '/assets/:code/repair',
      name: 'RepairAsset',
      component: () => import('@/views/RepairAssetView.vue'),
      meta: {
        title: '资产维修',
        requiresAuth: true,
      },
    },
    {
      path: '/assets/:code/repair-done',
      name: 'RepairDone',
      component: () => import('@/views/RepairDoneView.vue'),
      meta: {
        title: '维修完成',
        requiresAuth: true,
      },
    },
    {
      path: '/assets/:code/repair-failed',
      name: 'RepairFailed',
      component: () => import('@/views/RepairFailedView.vue'),
      meta: {
        title: '维修失败',
        requiresAuth: true,
      },
    },
    {
      path: '/assets/:code/lost',
      name: 'LostAsset',
      component: () => import('@/views/LostAssetView.vue'),
      meta: {
        title: '资产遗失',
        requiresAuth: true,
      },
    },
    {
      path: '/assets/:code/found',
      name: 'FoundAsset',
      component: () => import('@/views/FoundAssetView.vue'),
      meta: {
        title: '找回遗失资产',
        requiresAuth: true,
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
  ],
})

// 设置路由守卫
setupAuthGuard(router)

export default router
