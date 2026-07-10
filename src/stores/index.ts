// src/stores/index.ts
// 统一导出所有 stores

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
export { useHardDiskSnStore } from '@/stores/harddiskSnStore'
