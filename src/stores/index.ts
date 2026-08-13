/**
 * @file Store 统一导出入口，集中 re-export 所有 Pinia Store
 * @module stores
 * @exports
 *   - useAppStore: 应用全局状态
 *   - useAuthStore: 用户认证状态
 *   - useDashboardStore: 仪表盘数据状态
 *   - useUserStore: 员工管理状态
 *   - useDepartmentStore: 部门管理状态
 *   - useAssetStore: 资产管理状态
 *   - useContractStore: 合同管理状态
 *   - useStorageStore: 仓库管理状态
 *   - useAssetTypeStore: 资产类型管理状态
 *   - useOutAssetStore: 出库资产状态
 *   - useRecycleAssetStore: 回收资产状态
 *   - useDamagedAssetStore: 待报废资产状态
 *   - useWasteAssetStore: 已报废资产状态
 *   - useUnregisteredAssetStore: 未登记资产状态
 *   - useOperationLogStore: 操作日志状态
 *   - useAuditLogStore: 审计日志状态
 *   - useHardDiskSnStore: 硬盘序列号状态
 *   - useBrokenAssetStore: 故障资产状态
 *   - useLostAssetStore: 遗失资产状态
 *   - useFoundAssetStore: 拾获资产状态
 *   - useRepairAssetStore: 维修资产状态
 * @callers
 *   - 所有 views/ components/ composables/ 及 services/ 下的 vue/ts 文件
 *   - stores/__tests__/auditLogStore.spec.ts（单元测试）
 * @dependsOn
 *   - stores/app: 应用状态
 *   - stores/auth: 认证状态
 *   - stores/dashboard: 仪表盘数据
 *   - stores/userStore: 员工数据
 *   - stores/departmentStore: 部门数据
 *   - stores/assetStore: 资产数据
 *   - stores/contractStore: 合同数据
 *   - stores/storageStore: 仓库数据
 *   - stores/assetTypeStore: 资产类型数据
 *   - stores/outAssetStore: 出库资产数据
 *   - stores/recycleAssetStore: 回收资产数据
 *   - stores/damagedAssetStore: 待报废资产数据
 *   - stores/wasteAssetStore: 已报废资产数据
 *   - stores/unregisteredAssetStore: 未登记资产数据
 *   - stores/operationLogStore: 操作日志数据
 *   - stores/auditLogStore: 审计日志数据
 *   - stores/harddiskSnStore: 硬盘序列号数据
 *   - stores/brokenAssetStore: 故障资产数据
 *   - stores/lostAssetStore: 遗失资产数据
 *   - stores/foundAssetStore: 拾获资产数据
 *   - stores/repairAssetStore: 维修资产数据
 */

// App & Auth
export { useAppStore } from '@/stores/app'
export { useAuthStore } from '@/stores/auth'
export { useDashboardStore } from '@/stores/dashboard'

// User & Department
export { useUserStore } from '@/stores/userStore'
export { useDepartmentStore } from '@/stores/departmentStore'

// Core Assets
export { useAssetStore } from '@/stores/assetStore'
export { useContractStore } from '@/stores/contractStore'
export { useStorageStore } from '@/stores/storageStore'
export { useAssetTypeStore } from '@/stores/assetTypeStore'

// Lifecycle Records
export { useOutAssetStore } from '@/stores/outAssetStore'
export { useRecycleAssetStore } from '@/stores/recycleAssetStore'
export { useDamagedAssetStore } from '@/stores/damagedAssetStore'
export { useWasteAssetStore } from '@/stores/wasteAssetStore'
export { useUnregisteredAssetStore } from '@/stores/unregisteredAssetStore'
export { useOperationLogStore } from '@/stores/operationLogStore'
export { useAuditLogStore } from '@/stores/auditLogStore'
export { useHardDiskSnStore } from '@/stores/harddiskSnStore'
export { useBrokenAssetStore } from '@/stores/brokenAssetStore'
export { useLostAssetStore } from '@/stores/lostAssetStore'
export { useFoundAssetStore } from '@/stores/foundAssetStore'
export { useRepairAssetStore } from '@/stores/repairAssetStore'
