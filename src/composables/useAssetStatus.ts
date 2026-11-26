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
    // 报废前置白名单唯一真源（DR-1）。repairing 刻意排除：后端 FSM 虽存在
    // to_damaged 共边，但业务要求维修中资产仅走维修失败路径；in_use 须先回收；
    // damaged/scrapped 不再申请报废。变更此集合须走业务决策，不得在 View 复制。
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
