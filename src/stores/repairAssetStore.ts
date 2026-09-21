/**
 * @file 维修资产 Store，基于 createEntityStore 工厂创建，含状态流转扩展方法
 * @module stores/repairAssetStore
 * @exports
 *   - useRepairAssetStore: 维修资产管理状态 Store（含 repairAsset、repairDone、repairFailed 扩展方法）
 * @callers
 *   - components/componentsdetails/RepairAssetDetails.vue
 *   - views/RepairAssetView.vue
 *   - views/RepairDoneView.vue
 *   - views/RepairFailedView.vue
 * @dependsOn
 *   - api/repairAsset: 维修资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { repairAssetAPI } from '@/api/repairAsset'
import type {
  RepairAssetExtended,
  RepairAssetCreateForm,
  RepairAssetUpdateForm,
} from '@/types/repairasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery, EntityStore } from '@/stores/createEntityStore'

/**
 * 维修资产 Store 接口（含状态流转扩展方法）
 * 继承自 EntityStore<RepairAssetExtended, PaginationQuery>
 */
interface RepairAssetStore extends EntityStore<RepairAssetExtended, PaginationQuery> {
  /**
   * 送修资产（状态机 repair 流转）
   * 使用后端 repair action，asset 由 recordcode 定位
   * @param recordcode 资产记录编码（URL 查找参数）
   * @param data 维修信息（不含 asset_code / operator_jobcode）
   * @returns 维修记录详情
   */
  repairAsset: (
    recordcode: string,
    data: Omit<RepairAssetCreateForm, 'asset_code' | 'operator_jobcode'>,
  ) => Promise<RepairAssetExtended>

  /**
   * 维修完成（状态机 repair_done 流转）
   * 使用后端 repair_done action，asset 由 recordcode 定位
   * @param recordcode 资产记录编码（URL 查找参数）
   * @param data 维修完成信息（actual_return_date、physical_grade_after）
   * @returns 维修记录详情
   */
  repairDone: (
    recordcode: string,
    data: Pick<RepairAssetUpdateForm, 'actual_return_date' | 'physical_grade_after'>,
  ) => Promise<RepairAssetExtended>

  /**
   * 维修失败（状态机 repair_failed 流转）
   * 使用后端 repair_failed action，asset 由 recordcode 定位
   * @param recordcode 资产记录编码（URL 查找参数）
   * @returns 维修记录详情
   */
  repairFailed: (recordcode: string) => Promise<RepairAssetExtended>
}

const baseRepairAssetStoreDef = createEntityStore<RepairAssetExtended, PaginationQuery>(
  'repairAsset',
  {
    idKey: 'recordcode',
    nameField: 'repair_asset_name',
    displayName: '维修资产',
    api: {
      getList: async (params?: PaginationQuery) => {
        const safeParams: PaginationQuery = params || {
          page: 1,
          page_size: 10,
        }
        const response = await repairAssetAPI.getRepairAssets(safeParams)
        return {
          count: response.count,
          results: response.results as RepairAssetExtended[],
        }
      },
      getById: (code) => repairAssetAPI.getRepairAssetByCode(code),
      create: (data) => repairAssetAPI.createRepairAsset(data as RepairAssetCreateForm),
      update: (data) => repairAssetAPI.updateRepairAsset(data as RepairAssetUpdateForm),
      delete: (code) => repairAssetAPI.deleteRepairAsset(code),
      batchDelete: (codes) => repairAssetAPI.batchDeleteRepairAssets(codes),
    },
    message: ElMessage,
    enablePagination: true,
    defaultPageSize: 20,
    enableCache: false,
  },
)

/**
 * 使用维修资产 Store（含状态流转扩展方法）
 * @returns RepairAssetStore 实例
 */
export const useRepairAssetStore = (): RepairAssetStore => {
  const store = baseRepairAssetStoreDef()

  if (!('repairAsset' in store)) {
    const extendedStore = store as unknown as RepairAssetStore

    /**
     * 送修资产
     * 代理 repairAssetAPI.repairAsset（recordcode 为 URL 定位键）
     */
    extendedStore.repairAsset = async (
      recordcode: string,
      data: Omit<RepairAssetCreateForm, 'asset_code' | 'operator_jobcode'>,
    ) => {
      return repairAssetAPI.repairAsset(recordcode, data)
    }

    /**
     * 维修完成
     * 代理 repairAssetAPI.repairDone（recordcode 为 URL 定位键）
     */
    extendedStore.repairDone = async (
      recordcode: string,
      data: Pick<RepairAssetUpdateForm, 'actual_return_date' | 'physical_grade_after'>,
    ) => {
      return repairAssetAPI.repairDone(recordcode, data)
    }

    /**
     * 维修失败
     * 代理 repairAssetAPI.repairFailed（recordcode 为 URL 定位键）
     */
    extendedStore.repairFailed = async (recordcode: string) => {
      return repairAssetAPI.repairFailed(recordcode)
    }

    return extendedStore
  }

  return store as unknown as RepairAssetStore
}
