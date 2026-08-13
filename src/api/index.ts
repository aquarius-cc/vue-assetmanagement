/**
 * @file API 模块统一入口桶文件，重新导出所有 API 模块
 * @module api/index
 * @exports
 *   - request: 统一的请求方法对象（get/post/put/patch/delete）
 *   - unwrapResponse: 响应解包函数
 *   - ApiResponse: 响应类型定义
 *   - authAPI: 认证 API 模块
 *   - userAPI: 员工管理 API 模块
 *   - departmentAPI: 部门管理 API 模块
 *   - assetAPI: 资产管理 API 模块
 *   - dashboardAPI: 仪表盘 API 模块
 *   - contractAPI: 合同管理 API 模块
 *   - storageAPI: 仓库管理 API 模块
 *   - assetTypeAPI: 资产类型管理 API 模块
 *   - outAssetAPI: 出库资产管理 API 模块
 *   - recycleAssetAPI: 回收资产管理 API 模块
 *   - damagedAssetAPI: 损坏资产管理 API 模块
 *   - wasteAssetAPI: 报废资产管理 API 模块
 *   - networkAPI: 网络连通性测试 API 模块
 *   - unregisteredAssetAPI: 未登记资产管理 API 模块
 *   - operationLogAPI: 操作日志管理 API 模块
 *   - harddiskSnAPI: 硬盘序列号管理 API 模块
 *   - lostAssetAPI: 遗失资产管理 API 模块
 *   - repairAssetAPI: 维修资产管理 API 模块
 *   - auditLogAPI: 通用审计日志 API 模块
 *   - authUserAPI: AuthUser 管理 API 模块
 *   - brokenAssetAPI: 损坏资产 API 模块
 *   - foundAssetAPI: 找到资产 API 模块
 *   - notificationAPI: 通知 API 模块
 *   - permissionsAPI: 权限模块 API 模块
 *   - roleAPI: 角色管理 API 模块
 * @callers
 *   - stores/*: 所有 Pinia Store
 *   - composables/*: 所有组合式函数
 *   - views/*: 所有视图组件
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - api/auth.ts: 导出 authAPI
 *   - api/user.ts: 导出 userAPI
 *   - api/department.ts: 导出 departmentAPI
 *   - api/asset.ts: 导出 assetAPI
 *   - api/dashboard.ts: 导出 dashboardAPI
 *   - api/contract.ts: 导出 contractAPI
 *   - api/storage.ts: 导出 storageAPI
 *   - api/assetType.ts: 导出 assetTypeAPI
 *   - api/outAsset.ts: 导出 outAssetAPI
 *   - api/recycleAsset.ts: 导出 recycleAssetAPI
 *   - api/damagedAsset.ts: 导出 damagedAssetAPI
 *   - api/wasteAsset.ts: 导出 wasteAssetAPI
 *   - api/network.ts: 导出 networkAPI
 *   - api/unregisteredAsset.ts: 导出 unregisteredAssetAPI
 *   - api/operationLog.ts: 导出 operationLogAPI
 *   - api/harddiskSn.ts: 导出 harddiskSnAPI
 *   - api/lostAsset.ts: 导出 lostAssetAPI
 *   - api/repairAsset.ts: 导出 repairAssetAPI
 *   - api/auditLog.ts: 导出 auditLogAPI
 *   - api/authusers.ts: 导出 authUserAPI
 *   - api/brokenAsset.ts: 导出 brokenAssetAPI
 *   - api/foundAsset.ts: 导出 foundAssetAPI
 *   - api/notification.ts: 导出 notificationAPI
 *   - api/permissions.ts: 导出 permissionsAPI
 *   - api/roles.ts: 导出 roleAPI
 */
import { get, post, put, patch, del, unwrapResponse } from '@/api/request'
export type { ApiResponse } from '@/api/request'

// 重新包装为 request 对象，保证 API 文件无需改动
export const request = {
  get,
  post,
  put,
  patch,
  delete: del, // 注意：旧代码可能调用 request.delete，这里做映射
}

export { unwrapResponse }

export { authAPI } from '@/api/auth'
export { userAPI } from '@/api/user'
export { departmentAPI } from '@/api/department'
export { assetAPI } from '@/api/asset'
export { dashboardAPI } from '@/api/dashboard'
export { contractAPI } from '@/api/contract'
export { storageAPI } from '@/api/storage'
export { assetTypeAPI } from '@/api/assetType'
export { outAssetAPI } from '@/api/outAsset'
export { recycleAssetAPI } from '@/api/recycleAsset'
export { damagedAssetAPI } from '@/api/damagedAsset'
export { wasteAssetAPI } from '@/api/wasteAsset'
export { networkAPI } from '@/api/network'
export { unregisteredAssetAPI } from '@/api/unregisteredAsset'
export { operationLogAPI } from '@/api/operationLog'
export { harddiskSnAPI } from '@/api/harddiskSn'
export { lostAssetAPI } from '@/api/lostAsset'
export { repairAssetAPI } from '@/api/repairAsset'
export { auditLogAPI } from '@/api/auditLog'
export { authUserAPI } from '@/api/authusers'
export { brokenAssetAPI } from '@/api/brokenAsset'
export { foundAssetAPI } from '@/api/foundAsset'
export { notificationAPI } from '@/api/notification'
export { permissionsAPI } from '@/api/permissions'
export { roleAPI } from '@/api/roles'
