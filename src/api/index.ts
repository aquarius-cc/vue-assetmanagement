// api/index.ts
// export {
//   default as api,
//   get,
//   post,
//   put,
//   patch,
//   del,
//   unwrapResponse,
// } from './request'
// 桶文件：统一导出所有 API 模块，并保持 request 对象兼容
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
