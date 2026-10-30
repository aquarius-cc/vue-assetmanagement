/**
 * @file /main 子路由——系统管理段（操作日志/审计日志/硬盘序列号/通讯录/部门/角色/账号/资产录入直入）
 * @module src/router/routes-main-system
 * @exports
 *   - routesMainSystem: RouteRecordRaw[]
 * @callers
 *   - src/router/routes-main.ts
 * @dependsOn
 *   - vue-router (RouteRecordRaw 类型)
 */

import type { RouteRecordRaw } from 'vue-router'

export const routesMainSystem: RouteRecordRaw[] = [
  {
    path: 'operationlogdetails',
    name: 'OperationLogDetails',
    component: () => import('@/components/componentsdetails/OperationLogDetails.vue'),
    meta: {
      title: '资产操作日志',
      requiresAuth: true,
      showPageHeader: true,
      // [P2-05] 与 RBAC 矩阵对齐(Rules_Fiels/backend-business-rules.md 操作日志详情:
      // 普通用户及以上可访问, 服务端仅做归属过滤): 矩阵为权威, 勿改回 auditor
      requiredMinRole: 'regular_user',
    },
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
    meta: { title: '其它操作日志', requiresAuth: true, showPageHeader: true },
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
    meta: {
      title: '硬盘序列号',
      requiresAuth: true,
      showPageHeader: true,
      // [M-20] 只读父页对全体登录角色开放；写门槛仅在 harddisksnform 叶子上
      // 声明（asset_admin，对齐后端 IsAssetAdminOrAbove）。父级不补 requiredMinRole：
      // vue-router mergeMetaFields 会父→子合并，父级 meta 会级联收紧只读详情页
    },
    children: [
      {
        path: 'harddisksnform',
        name: 'HardDiskSNForm',
        component: () => import('@/components/componentsdetails/detils/HardDiskSNForm.vue'),
        meta: {
          title: '硬盘序列号录入/编辑',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：仅写 deny 兜底判据
          // [M-20] 后端写门槛为 IsAssetAdminOrAbove（hard_disk_sn_view.py:71-81），
          // 前端对齐 asset_admin——不采用「子树整体 system_admin」（会造成后端放行、
          // 前端拦截的跨端不一致）；父级 /main/harddisksndetails 不在 roleWhitelist，
          // 本条 meta 是该写页的唯一显式门槛。父前缀不在 /main/system 白名单内。
          requiredMinRole: 'asset_admin',
        },
      },
      {
        path: 'harddisksnbasicdetails',
        name: 'HardDiskSNBasicDetails',
        component: () => import('@/components/componentsdetails/detils/HardDiskSNBasicDetails.vue'),
        props: (route) => ({ id: route.query.id }),
        // [M-20] 只读详情页对全体登录角色开放（后端读操作仅 IsAuthenticated），
        // 与 harddisksnform 的 asset_admin 写门槛构成读/写分离；不随子树加固
        meta: { title: '硬盘序列号详情', requiresAuth: true },
      },
    ],
  },
  {
    path: 'departmentmanagement',
    name: 'DepartmentManagement',
    component: () => import('@/components/componentsdetails/DepartmentManagement.vue'),
    meta: {
      title: '通讯录管理',
      requiresAuth: true,
      showPageHeader: true,
      // [I-7] 通讯录管理（用户录入/批量导入）为管理端功能，仅系统管理员可访问
      requiredMinRole: 'system_admin',
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
        path: 'userform',
        name: 'DeptUserForm',
        component: () => import('@/components/componentsdetails/detils/UserForm.vue'),
        meta: {
          title: '用户录入',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/system 已是显式门槛
          // [I-7] 子路由独立加固：vue-router mergeMetaFields 会父→子合并 meta（原注释
          // 「父级 meta 不自动继承」与运行时事实不符，M-20 订正）；子级显式声明为
          // 纵深防御，父级 /main/system 白名单为另一重门槛，二者并存不冲突
          requiredMinRole: 'system_admin',
        },
      },
      {
        path: 'userbatchimport',
        name: 'DeptUserBatchImport',
        component: () => import('@/components/componentsdetails/detils/UserBatchImport.vue'),
        meta: {
          title: '批量导入用户',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/system 已是显式门槛
          // [I-7] 子路由独立加固：vue-router mergeMetaFields 会父→子合并 meta（原注释
          // 「父级 meta 不自动继承」与运行时事实不符，M-20 订正）；子级显式声明为
          // 纵深防御，父级 /main/system 白名单为另一重门槛，二者并存不冲突
          requiredMinRole: 'system_admin',
        },
      },
      {
        path: 'departmentbatchimport',
        name: 'DeptDepartmentBatchImport',
        component: () => import('@/components/componentsdetails/detils/DepartmentBatchImport.vue'),
        meta: {
          title: '批量导入部门',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/system 已是显式门槛
          // [I-7] 子路由独立加固：vue-router mergeMetaFields 会父→子合并 meta（原注释
          // 「父级 meta 不自动继承」与运行时事实不符，M-20 订正）；子级显式声明为
          // 纵深防御，父级 /main/system 白名单为另一重门槛，二者并存不冲突
          requiredMinRole: 'system_admin',
        },
      },
    ],
  },
  {
    path: 'departmentdetails',
    name: 'DepartmentDetails',
    component: () => import('@/components/componentsdetails/DepartmentDetails.vue'),
    meta: {
      title: '部门管理',
      requiresAuth: true,
      showPageHeader: true,
      requiredMinRole: 'system_admin',
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
          write: true, // [M-19] 写语义标记：白名单前缀 /main/departmentdetails 已是显式门槛
        },
      },
      {
        path: 'departmentbatchimport',
        name: 'DepartmentBatchImport',
        component: () => import('@/components/componentsdetails/detils/DepartmentBatchImport.vue'),
        meta: {
          title: '批量导入部门',
          requiresAuth: true,
          write: true, // [M-19] 写语义标记：白名单前缀 /main/departmentdetails 已是显式门槛
        },
      },
    ],
  },
  {
    path: 'roledetails',
    name: 'RoleManage',
    component: () => import('@/views/system/RoleManage.vue'),
    meta: {
      title: '角色管理',
      requiresAuth: true,
      showPageHeader: true,
      // 【A-14】系统管理页权限门槛（此前缺失，任意已登录角色可直访）
      requiredMinRole: 'system_admin',
    },
  },
  {
    path: 'authusermanage',
    name: 'AuthUserManage',
    component: () => import('@/views/system/AuthUserManage.vue'),
    meta: {
      title: '账号管理',
      requiresAuth: true,
      showPageHeader: true,
      // 【A-14】系统管理页权限门槛（此前缺失，任意已登录角色可直访）
      requiredMinRole: 'system_admin',
    },
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
      showPageHeader: true,
      write: true, // [M-19] 写语义标记：仅写 deny 兜底判据
      // [R-3/M-RC-07] 资产录入为写入操作，RBAC 矩阵禁止 regular_user/auditor
      requiredMinRole: 'asset_admin',
    },
  },
]
