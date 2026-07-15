// src/services/assetLifecycleService.ts
import { useAssetStore } from '@/stores/assetStore'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { useRecycleAssetStore } from '@/stores/recycleAssetStore'
import { useDamagedAssetStore } from '@/stores/damagedAssetStore'
import { useWasteAssetStore } from '@/stores/wasteAssetStore'
import type {OutAssetCreateForm,} from '@/utils/OutAsset'
import type {RecycleAssetCreateForm,} from '@/utils/RecycleAsset'
import type {DamagedAssetCreateForm,} from '@/utils/DamagedAsset'
import type {WasteAssetCreateForm,} from '@/utils/WasteAsset'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/Format'

/**
 * 资产生命周期服务
 * 负责跨 store 的业务逻辑联动（如出库修改资产状态）
 */

// ==================== 出库 ====================
export const handleAssetOut = async (data: OutAssetCreateForm) => {
  const outAssetStore = useOutAssetStore()
  const assetStore = useAssetStore()

  await outAssetStore.create(data)

  // 刷新资产列表，确保状态变更同步
  await assetStore.getList()

  ElMessage.success('资产出库成功')
}

// ==================== 回收 ====================
export const handleAssetRecycle = async (data: RecycleAssetCreateForm) => {
  const recycleAssetStore = useRecycleAssetStore()
  const assetStore = useAssetStore()

  const formattedDate =
    formatDate(data.recycle_asset_date) || new Date().toISOString().split('T')[0]

  await recycleAssetStore.create({
    ...data,
    recycle_asset_date: formattedDate,
  })

  // 刷新资产列表，确保状态变更同步
  await assetStore.getList()

  ElMessage.success('资产回收成功')
}

// ==================== 待报废 ====================
export const handleAssetDamaged = async (data: DamagedAssetCreateForm) => {
  const damagedAssetStore = useDamagedAssetStore()
  const assetStore = useAssetStore()

  await damagedAssetStore.create(data)

  // 刷新资产列表，确保状态变更同步
  await assetStore.getList()

  ElMessage.success('资产已标记为待报废')
}

// ==================== 报废 ====================
export const handleAssetWaste = async (data: WasteAssetCreateForm) => {
  const wasteAssetStore = useWasteAssetStore()
  const assetStore = useAssetStore()

  await wasteAssetStore.create(data)

  // 刷新资产列表，确保状态变更同步
  await assetStore.getList()

  ElMessage.success('资产报废处理成功')
}
