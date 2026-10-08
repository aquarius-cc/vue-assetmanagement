/**
 * @file 分组页会话水合 Composable（BF-078 需求3：返回状态恢复）
 * @module composables/useGroupedSessionRestore
 * @description
 *   把离开时采集的 `GroupedPageSnapshot` 按固定顺序灌回 `useGroupedAssetList`。
 *
 *   【顺序契约（测试锁死，勿调整）】
 *   ① search(筛选)：内部 `cache.reset()` 清空展开态/子表缓存，必须最先执行；
 *   ② changePage(页码)：再次 `cache.reset()`，仍在 replay 之前；
 *   ③ replay expandedKeys：逐组 `setExpanded(k, true)` 并 await 子表首载；
 *   ④ childPages：仅展开组、仅 page>1（首载默认即 1，跳过零请求）；
 *   ⑤ selectedCodes：平铺 ref 直赋（三态由 summaries + 平铺集派生，无需按组回放）。
 *   若「先 replay 后 fetch」，①/② 的 reset 会把已 replay 的键抹掉（恢复失效）。
 *
 *   【为什么不进 useGroupedAssetList】
 *   FR-6：列表 composable 已 173 行（上限 200，守卫严格模式），追加恢复逻辑有越线风险；
 *   恢复是独立编排职责，按子职责拆文件，deps 注入保持可单测。
 *
 * @callers
 *   - components/GroupedAssetTable（onMounted 水合入口）
 */
import type { Ref } from 'vue'
import type { AssetGroupQueryParams } from '@/types/asset'
import type { GroupedPageSnapshot } from '@/stores/groupedAssetSession'

/** 恢复所需最小依赖（由 useGroupedAssetList 返回值直接满足，deps 注入便于单测） */
export interface GroupedSessionRestoreDeps {
  search: (filters?: AssetGroupQueryParams) => Promise<void>
  changePage: (page: number) => Promise<void>
  setExpanded: (groupKey: string, expanded: boolean) => Promise<void>
  goToChildPage: (groupKey: string, page: number) => Promise<void>
  selectedCodes: Ref<string[]>
}

export interface GroupedSessionRestoreReturn {
  restore: (snapshot: GroupedPageSnapshot) => Promise<void>
}

/** 分组页会话水合编排（见文件头顺序契约） */
export function useGroupedSessionRestore(
  deps: GroupedSessionRestoreDeps,
): GroupedSessionRestoreReturn {
  const restore = async (snapshot: GroupedPageSnapshot): Promise<void> => {
    // ① 筛选首载（重置展开态）
    await deps.search(snapshot.filters)
    // ② 汇总翻页（再次重置，仍在 replay 前）
    if (snapshot.page > 1) await deps.changePage(snapshot.page)
    // ③ replay 展开态：逐组 await，保证子表首载完成后才进下一步
    for (const key of snapshot.expandedKeys) {
      await deps.setExpanded(key, true)
    }
    // ④ 子表页码回放（仅当前仍展开的组）
    for (const [key, page] of Object.entries(snapshot.childPages)) {
      if (page > 1 && snapshot.expandedKeys.includes(key)) {
        await deps.goToChildPage(key, page)
      }
    }
    // ⑤ 选中集平铺直赋
    deps.selectedCodes.value = [...snapshot.selectedCodes]
  }

  return { restore }
}
