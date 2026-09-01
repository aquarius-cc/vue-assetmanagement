/**
 * @file 资产生命周期服务，负责跨 store 的业务逻辑联动（出库、回收、待报废、报废）
 * @module src/services/assetLifecycleService
 * @exports
 *   - handleAssetOut: 资产出库处理（创建出库记录 + 刷新资产列表）
 *   - handleAssetRecycle: 资产回收处理
 *   - handleAssetDamaged: 资产待报废处理
 *   - handleAssetWaste: 资产报废处理
 * @callers
 *   - components/componentsdetails/*Details.vue
 * @dependsOn
 *   - @/stores/assetStore, @/stores/outAssetStore, @/stores/recycleAssetStore, @/stores/damagedAssetStore, @/stores/wasteAssetStore
 *   - @/types/outasset, @/types/recycleasset, @/types/damagedasset, @/types/wasteasset
 *   - @/utils/Format (formatDate)
 *   - element-plus (ElMessage)
 */

import { useAssetStore } from '@/stores/assetStore'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { useRecycleAssetStore } from '@/stores/recycleAssetStore'
import { useDamagedAssetStore } from '@/stores/damagedAssetStore'
import { useWasteAssetStore } from '@/stores/wasteAssetStore'
import type { OutAssetCreateForm } from '@/types/outasset'
import type { RecycleAssetCreateForm } from '@/types/recycleasset'
import type { DamagedAssetCreateForm } from '@/types/damagedasset'
import type { WasteAssetCreateForm } from '@/types/wasteasset'
import { ElMessage } from 'element-plus'
import { formatDate, todayLocalISO } from '@/utils/Format'

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
    formatDate(data.recycle_asset_date) || todayLocalISO()

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
