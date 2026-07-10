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

  const asset = assetStore.list.find((a) => a.asset_code === data.outasset_code)
  if (asset) {
    asset.asset_current_status = 'in_use'
    // [HR-01] 后端 v1.1.0 改为 read_only，前端不再手动更新以下字段
    // 后端创建 outasset 时自动从 asset 获取并更新：
    // 注意：OutAssetCreateForm 已移除这些字段，此注释仅供参考历史逻辑
    // asset.asset_using_location = data.outasset_using_location
    // asset.asset_applicant_jobcode = data.outasset_applicant_jobcode || ''
    // asset.asset_manager_jobcode = data.outasset_manager_jobcode || ''
  }

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

  const asset = assetStore.list.find((a) => a.asset_code === data.recycle_asset)
  if (asset) asset.asset_current_status = 'recycle'

  ElMessage.success('资产回收成功')
}

// ==================== 待报废 ====================
export const handleAssetDamaged = async (data: DamagedAssetCreateForm) => {
  const damagedAssetStore = useDamagedAssetStore()
  const assetStore = useAssetStore()

  await damagedAssetStore.create(data)

  const asset = assetStore.list.find((a) => a.asset_code === data.damaged_asset_code)
  if (asset) asset.asset_current_status = 'damaged'

  ElMessage.success('资产已标记为待报废')
}

// ==================== 报废 ====================
export const handleAssetWaste = async (data: WasteAssetCreateForm) => {
  const wasteAssetStore = useWasteAssetStore()
  const assetStore = useAssetStore()

  await wasteAssetStore.create(data)

  const asset = assetStore.list.find((a) => a.asset_code === data.waste_asset_code)
  if (asset) asset.asset_current_status = 'waste'

  ElMessage.success('资产报废处理成功')
}
