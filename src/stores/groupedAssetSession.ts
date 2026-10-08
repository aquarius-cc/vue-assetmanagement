/**
 * @file 分组展开页会话快照 Store（BF-078 需求3：返回状态恢复）
 * @module stores/groupedAssetSession
 * @description
 *   站内路由级会话恢复的中转站：离开资产明细子树时保存分组页快照
 *   （筛选/页码/展开态/子表页码/选中集/滚动位），返回时水合。
 *
 *   【生命周期契约】
 *   - 写入：`AssetContentDetails` 的 `onBeforeRouteLeave`（仅分组模式）
 *   - 消费：同组件 setup 期读取并传给 `GroupedAssetTable` 的 `initialSnapshot`
 *   - 失效：`guards.ts` 的 `afterEach` 落点不在 `/main/assetdetails*` 子树即 `clearPending`
 *   - 硬刷新失：仅内存态（`ref`），不落 localStorage（快照含 UI 态，跨会话恢复属假需求）
 *
 * @callers
 *   - components/componentsdetails/AssetContentDetails.vue（写入 + 消费）
 *   - router/guards（afterEach 清理 pendingRestore）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AssetGroupQueryParams } from '@/types/asset'

/** 分组页会话快照（单实例内存级） */
export interface GroupedPageSnapshot {
  /** 离开时生效的分组筛选（SearchBar → toGroupedFilters 的产出） */
  filters: AssetGroupQueryParams
  /** 汇总页码 */
  page: number
  /** 已展开的 group_key 列表 */
  expandedKeys: string[]
  /** 每个展开组的子表页码（只含 page > 1 的项亦可，恢复侧自行判 1 跳过） */
  childPages: Record<string, number>
  /** 选中集（asset_code 平铺） */
  selectedCodes: string[]
  /** 汇总滚动容器 scrollTop（px，未滚动为 0） */
  scrollTop: number
}

export const useGroupedAssetSession = defineStore('groupedAssetSession', () => {
  /** 快照本体；`null` = 无会话可恢复 */
  const snapshot = ref<GroupedPageSnapshot | null>(null)
  /** 待恢复标记：离开时置 true，水合时置 false；落点出子树由 afterEach 置 false */
  const pendingRestore = ref(false)

  const save = (next: GroupedPageSnapshot): void => {
    snapshot.value = next
    pendingRestore.value = true
  }

  /** 水合完成后调用：保留 snapshot 供排障，仅摘掉恢复旗 */
  const clearPending = (): void => {
    pendingRestore.value = false
  }

  /** 完全清空（离开子树落点时由 afterEach 调用） */
  const clear = (): void => {
    snapshot.value = null
    pendingRestore.value = false
  }

  return { snapshot, pendingRestore, save, clearPending, clear }
})
