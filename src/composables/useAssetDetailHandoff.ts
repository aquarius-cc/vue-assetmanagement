/**
 * @file 资产详情一次性交接 Composable
 * @module composables/useAssetDetailHandoff
 * @description
 *   分组子行 → 详情/编辑页的一次性数据交接，消除导航后首帧空壳。
 *
 *   契约：
 *   - 组行来源 AssetGroupChildren 端点（AssetDetailSerializer，字段完整），可直接作为详情源
 *   - 一次性消费：consume 命中后即删，避免陈旧数据二次回灌
 *   - TTL 10s：仅覆盖「点击 → 挂载」的毫秒级窗口，过期即回退 getById
 *   - 模块级 Map：非响应式单例，仅作瞬时交接，不参与渲染
 *
 * @callers
 *   - components/componentsdetails/AssetContentDetails.vue（分组行 seed）
 *   - components/componentsdetails/detils/BasicAssetDetails.vue（setup 期 consume / handleEdit seed）
 *   - components/componentsdetails/detils/AssetForm.vue（onMounted 早期 consume）
 * @dependsOn
 *   - types/asset: AssetDetail
 */
import type { AssetDetail } from '@/types/asset'

/** 交接有效期（毫秒）：仅覆盖点击到挂载的导航窗口 */
const TTL_MS = 10_000

/** 交接条目 */
interface HandoffEntry {
  detail: AssetDetail
  createdAt: number
}

/** 模块级单例：非响应式，不参与渲染 */
const entries = new Map<string, HandoffEntry>()

export interface AssetDetailHandoff {
  seed: (detail: AssetDetail) => void
  consume: (recordcode?: string) => AssetDetail | null
  clear: (recordcode?: string) => void
}

export function useAssetDetailHandoff(): AssetDetailHandoff {
  /** 写入交接条目；无 recordcode 时静默丢弃 */
  const seed = (detail: AssetDetail): void => {
    if (!detail?.recordcode) return
    entries.set(detail.recordcode, { detail, createdAt: Date.now() })
  }

  /** 一次性读取：无论命中与否都删除该键，过期返回 null */
  const consume = (recordcode?: string): AssetDetail | null => {
    if (!recordcode) return null
    const entry = entries.get(recordcode)
    entries.delete(recordcode)
    if (!entry) return null
    return Date.now() - entry.createdAt <= TTL_MS ? entry.detail : null
  }

  /** 清理：传 recordcode 清单条，不传清全部（测试隔离与导航失败回滚） */
  const clear = (recordcode?: string): void => {
    if (recordcode) entries.delete(recordcode)
    else entries.clear()
  }

  return { seed, consume, clear }
}
