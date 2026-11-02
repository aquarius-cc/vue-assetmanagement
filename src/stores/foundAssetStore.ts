/**
 * @file 拾获资产 Store，基于 createEntityStore 工厂创建
 * @module stores/foundAssetStore
 * @exports
 *   - useFoundAssetStore: 拾获资产管理状态 Store
 * @callers
 *   - components/componentsdetails/FoundAssetDetails.vue
 * @dependsOn
 *   - api/foundAsset: 拾获资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { foundAssetAPI } from '@/api/foundAsset'
import type {
  FoundAssetExtended,
  FoundAssetCreateForm,
  FoundAssetUpdateForm,
} from '@/types/foundasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'
import type { BlobDownload } from '@/api/request'

export const useFoundAssetStore = createEntityStore<FoundAssetExtended, PaginationQuery>(
  'foundAsset',
  {
    idKey: 'recordcode',
    nameField: 'asset_name',
    displayName: '找回资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await foundAssetAPI.getFoundAssets(safeParams)
        return {
          count: response.count,
          results: response.results as FoundAssetExtended[],
        }
      },
      getById: (code) => foundAssetAPI.getFoundAssetByCode(code),
      create: (data) => foundAssetAPI.createFoundAsset(data as FoundAssetCreateForm),
      update: (data) => foundAssetAPI.updateFoundAsset(data as FoundAssetUpdateForm),
      delete: (code) => foundAssetAPI.deleteFoundAsset(code),
      batchDelete: (codes) => foundAssetAPI.batchDeleteFoundAssets(codes),
    },
    message: ElMessage,
    // [M-06] 调用方（FoundAssetDetails 经 useAssetLifecycleActions.handleDelete）自带「删除成功」，
    // 禁用工厂自动弹窗，避免「找回资产删除成功」与调用方消息重复（与 recycle/damaged 对齐）
    disableAutoMessage: true,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)

/** BF-092/I-1: 服务端 Excel 导出（经 store 层消费，满足 no-restricted-imports 分层约束） */
export function foundAssetExportExcel(params: Record<string, unknown>): Promise<BlobDownload> {
  return foundAssetAPI.exportExcel(params)
}
