/**
 * @file 遗失资产 Store，基于 createEntityStore 工厂创建，含状态流转扩展方法
 * @module stores/lostAssetStore
 * @exports
 *   - useLostAssetStore: 遗失资产管理状态 Store（含 markAssetAsLost、foundAsset 扩展方法）
 * @callers
 *   - components/componentsdetails/LostAssetDetails.vue
 *   - views/LostAssetView.vue
 *   - views/FoundAssetView.vue
 * @dependsOn
 *   - api/lostAsset: 遗失资产 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { lostAssetAPI } from '@/api/lostAsset'
import type { LostAssetExtended, LostAssetCreateForm, LostAssetUpdateForm } from '@/types/lostasset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery, EntityStore } from '@/stores/createEntityStore'

/**
 * 遗失资产 Store 接口（含状态流转扩展方法）
 * 继承自 EntityStore<LostAssetExtended, PaginationQuery>
 */
interface LostAssetStore extends EntityStore<LostAssetExtended, PaginationQuery> {
  /**
   * 标记资产为遗失（状态机 lost 流转）
   * 使用后端 mark_lost action，asset 由 recordcode 定位
   * @param recordcode 资产记录编码（URL 查找参数）
   * @param data 遗失信息（lost_reason 必填）
   * @returns 遗失记录详情
   */
  markAssetAsLost: (
    recordcode: string,
    data: {
      lost_reason: string
      last_known_location?: string | null
      lost_description?: string | null
      lost_date?: string | null
    },
  ) => Promise<LostAssetExtended>

  /**
   * 找回遗失资产（状态机 found 流转）
   * 使用后端 found_and_return action，asset 由 recordcode 定位
   * @param recordcode 资产记录编码（URL 查找参数）
   * @param data 找回信息（均为可选）
   * @returns 遗失记录详情
   */
  foundAsset: (
    recordcode: string,
    data: {
      found_location?: string
      found_description?: string
    },
  ) => Promise<LostAssetExtended>
}

const baseLostAssetStoreDef = createEntityStore<LostAssetExtended, PaginationQuery>('lostAsset', {
  idKey: 'recordcode',
  nameField: 'asset_name',
  displayName: '遗失资产',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await lostAssetAPI.getLostAssets(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as LostAssetExtended[],
      }
    },
    getById: (code) => lostAssetAPI.getLostAssetByCode(code),
    create: (data) => lostAssetAPI.createLostAsset(data as LostAssetCreateForm),
    update: (data) => lostAssetAPI.updateLostAsset(data as LostAssetUpdateForm),
    delete: (code) => lostAssetAPI.deleteLostAsset(code),
    batchDelete: (codes) => lostAssetAPI.batchDeleteLostAssets(codes),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})

/**
 * 使用遗失资产 Store（含状态流转扩展方法）
 * @returns LostAssetStore 实例
 */
export const useLostAssetStore = (): LostAssetStore => {
  const store = baseLostAssetStoreDef()

  if (!('markAssetAsLost' in store)) {
    const extendedStore = store as unknown as LostAssetStore

    /**
     * 标记资产为遗失
     * 代理 lostAssetAPI.markAssetAsLost（recordcode 为 URL 定位键）
     */
    extendedStore.markAssetAsLost = async (
      recordcode: string,
      data: {
        lost_reason: string
        last_known_location?: string | null
        lost_description?: string | null
        lost_date?: string | null
      },
    ) => {
      return lostAssetAPI.markAssetAsLost(recordcode, data)
    }

    /**
     * 找回遗失资产
     * 代理 lostAssetAPI.foundAsset（recordcode 为 URL 定位键）
     */
    extendedStore.foundAsset = async (
      recordcode: string,
      data: {
        found_location?: string
        found_description?: string
      },
    ) => {
      return lostAssetAPI.foundAsset(recordcode, data)
    }

    return extendedStore
  }

  return store as unknown as LostAssetStore
}
