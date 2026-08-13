/**
 * @file 回收资产表单关联数据加载（仓库、资产类型下拉选项，含缓存）
 * @module composables/useRecycleFormAssociations
 * @exports
 *   - useRecycleFormAssociations: 关联数据加载 composable
 * @callers
 *   - components/componentsdetails/detils/RecycleAssetForm.vue
 * @dependsOn
 *   - stores/storageStore: 仓库数据
 *   - stores/assetTypeStore: 资产类型数据
 */

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useStorageStore } from '@/stores/storageStore'
import { useAssetTypeStore } from '@/stores/assetTypeStore'
import type { Storage } from '@/types/storage'
import type { AssetType } from '@/types/assettype'

export function useRecycleFormAssociations() {
  const storageStore = useStorageStore()
  const assetTypeStore = useAssetTypeStore()

  // ========== 响应式数据 ==========
  /** 仓库列表（用于回收仓库选择） */
  const storages = ref<Storage[]>([])
  /** 资产类型列表（预留，目前回收表单未使用，但可扩展） */
  const assetTypes = ref<AssetType[]>([])

  /** 加载状态 */
  const loading = ref(false)
  /** 错误信息 */
  const error = ref<string | null>(null)

  // 内部缓存标记，避免重复请求
  let storagesLoaded = false
  let assetTypesLoaded = false

  // ========== 数据加载方法 ==========

  /**
   * 加载仓库列表（仅回收类型仓库）
   * @param force - 是否强制重新加载（忽略缓存）
   * @returns 仓库列表
   */
  const loadStorages = async (force = false): Promise<Storage[]> => {
    if (!force && storagesLoaded && storages.value.length) {
      return storages.value
    }

    loading.value = true
    error.value = null
    try {
      // 请求后端获取仓库列表，可按类型过滤（需要后端支持 storage_type 参数）
      // 如果不支持，可前端过滤：.filter(s => s.storage_type === 'recycle')
      const response = await storageStore.getList({
        page: 1,
        page_size: 100,
        // 若后端支持：storage_type: 'recycle'
      })
      // console.log('loadStorages response:', response)
      // 前端过滤仅保留回收仓库（若后端未过滤）
      const allStorages = response || []
      // storages.value = allStorages.filter(
      //   (s: Storage) => s.storage_type === 'recycle'
      // )
      storages.value = allStorages
      // console.log('loadStorages storages:', storages.value)
      storagesLoaded = true
    } catch (err) {
      error.value = '加载仓库列表失败'
      ElMessage.error(error.value)
      console.error('[useRecycleFormAssociations] loadStorages error:', err)
      storages.value = []
    } finally {
      loading.value = false
    }
    return storages.value
  }

  /**
   * 加载资产类型列表（扩展预留）
   * @param force - 是否强制重新加载
   */
  const loadAssetTypes = async (force = false): Promise<AssetType[]> => {
    if (!force && assetTypesLoaded && assetTypes.value.length) {
      return assetTypes.value
    }

    loading.value = true
    error.value = null
    try {
      const response = await assetTypeStore.getList({ page: 1, page_size: 100 })
      assetTypes.value = response || []
      assetTypesLoaded = true
    } catch (err) {
      error.value = '加载资产类型失败'
      ElMessage.error(error.value)
      console.error('[useRecycleFormAssociations] loadAssetTypes error:', err)
      assetTypes.value = []
    } finally {
      loading.value = false
    }
    return assetTypes.value
  }

  /**
   * 一次性加载所有关联数据（并行）
   * @param force - 是否强制刷新
   */
  const loadAll = async (force = false) => {
    await Promise.all([loadStorages(force), loadAssetTypes(force)])
  }

  /**
   * 强制刷新所有数据（忽略缓存）
   */
  const refresh = async () => {
    await loadAll(true)
  }

  // ========== 暴露给组件 ==========
  // 注意：直接返回 ref 对象，组件通过 .value 访问，类型为 Ref<Storage[]>
  // 由于 ref 在模板中自动解包，使用时直接写 storages 即可（Vue 模板中自动取 .value）
  return {
    // 数据（响应式）
    storages, // 类型 Ref<Storage[]>
    assetTypes, // 类型 Ref<AssetType[]>
    // 状态
    loading, // 加载中标志
    error, // 错误信息
    // 方法
    loadStorages,
    loadAssetTypes,
    loadAll,
    refresh,
  }
}
