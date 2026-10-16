import { computed, type ComputedRef } from 'vue'
import { AssetCurrentStatus } from '@/types/asset' // 假设你的枚举路径

export function useAssetStatusChecks(statusRef: ComputedRef<AssetCurrentStatus | undefined>) {
  const status = computed(() => statusRef.value)

  // 工具：判断当前状态是否在允许列表中
  const isStatusIn = (allowed: AssetCurrentStatus[]) =>
    status.value != null && allowed.includes(status.value)

  return {
    // 基础状态
    currentStatus: status,

    // 业务判断
    canMarkBroken: computed(() =>
      isStatusIn([
        AssetCurrentStatus.IN_STORE,
        AssetCurrentStatus.IN_USE,
        AssetCurrentStatus.RECYCLED_PENDING,
      ]),
    ),
    canMarkLost: computed(() =>
      isStatusIn([
        AssetCurrentStatus.IN_STORE,
        AssetCurrentStatus.IN_USE,
        AssetCurrentStatus.RECYCLED_PENDING,
      ]),
    ),
    canFound: computed(() => status.value === AssetCurrentStatus.LOST),
    canRepair: computed(() => status.value === AssetCurrentStatus.BROKEN),
    canRepairDone: computed(() => status.value === AssetCurrentStatus.REPAIRING),
    canRepairFailed: computed(() => status.value === AssetCurrentStatus.REPAIRING),
    // FSM 允许 recycled_pending → damaged，需补充；in_use 需先回收再报废故不加入
    canScrap: computed(() =>
      isStatusIn([
        AssetCurrentStatus.BROKEN,
        AssetCurrentStatus.LOST,
        AssetCurrentStatus.RECYCLED_PENDING,
      ]),
    ),
    // 出库源头状态（对齐后端 OutAssetService._validate_outasset_source）
    canOutAsset: computed(() =>
      isStatusIn([AssetCurrentStatus.IN_STORE, AssetCurrentStatus.RECYCLED_PENDING]),
    ),
    // 回收仅在用资产（对齐后端 RecycleAssetService 状态校验）
    canRecycle: computed(() => status.value === AssetCurrentStatus.IN_USE),
  }
}
