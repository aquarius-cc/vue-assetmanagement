/**
 * @file 资产缓存失效 helper（M-RC-08，DR-1 单一实现）
 * @module api/assetCache
 * @exports
 *   - invalidateAssetCache: 资产状态写端点成功后的缓存失效入口
 * @callers
 *   - api/{repairAsset,lostAsset,damagedAsset,recycleAsset,outAsset,brokenAsset,foundAsset}.ts
 *   - api/asset.ts（既有 5 处 mark-broken/create/update/delete/batch 失效，非本 helper 接入范围）
 * @dependsOn
 *   - api/request (clearCacheByPattern)
 */

import { clearCacheByPattern } from '@/api/index'

/**
 * 资产状态写端点成功后失效资产相关缓存。
 *
 * 【根因（写死，防止误扩散）】拦截器只按写 URL 清缓存（request.ts:372-374），
 * 真正的缓存逃逸条件是「写 URL 比缓存 key 更深」——即 `/assets/assets/{rc}/<action>/`
 * 形态的 action 写端点够不到 `/assets/assets/{rc}/?` 详情 key 与 `/assets/assets/?page=…`
 * 列表 key。子资源（lost/broken/found/damaged/out/recycle）自身列表/详情的写 URL 就是
 * 其缓存 key 的前缀，拦截器已覆盖——不要给这些端点再补失效。
 *
 * @param assetRecordcode 资产 recordcode；有值走精确失效（详情 key + 列表 key），
 *                        空值（null/undefined/''）降级宽失效（前缀清全部资产缓存，
 *                        仅导致缓存未命中重取，不会返回错误数据）。
 */
export function invalidateAssetCache(assetRecordcode?: string | null): void {
  if (assetRecordcode) {
    // 详情 key 形如 /assets/assets/{rc}/?…（buildCacheKey 拼 qs），子串命中
    clearCacheByPattern(`/assets/assets/${assetRecordcode}/`)
    // 列表 key 形如 /assets/assets/?page=…，与详情/他资产互不误伤
    clearCacheByPattern('/assets/assets/?')
  } else {
    // 宽失效：includes 子串同时覆盖 /assets/assets/{rc}/?… 详情与 /assets/assets/?page=… 列表
    clearCacheByPattern('/assets/assets/')
  }
}

/**
 * 接入清单（M-RC-08 定稿，24 处 = 17 单条 + 7 批量；锚点 = request.post/delete 行）：
 *
 * ① action ×5（recordcode 取自 URL，精确失效）
 *   repairAsset.ts:126  repairAsset     /assets/assets/{rc}/repair/
 *   repairAsset.ts:144  repairDone      /assets/assets/{rc}/repair-done/
 *   repairAsset.ts:158  repairFailed    /assets/assets/{rc}/repair-failed/
 *   lostAsset.ts:138    markAssetAsLost /assets/assets/{rc}/mark-lost/
 *   lostAsset.ts:159    foundAsset      /assets/assets/{rc}/found/
 * ② 集合 create ×7（recordcode 取自表单 asset_recordcode，空值降级宽）
 *   repairAsset.ts:60   /assets/repair-assets/     （表单仅 asset_code 非 recordcode → 宽）
 *   lostAsset.ts:57     /assets/lost-assets/
 *   damagedAsset.ts:60  /assets/damaged-assets/   （表单字段可空 → 常态宽失效）
 *   recycleAsset.ts:62  /assets/recycle-assets/   （表单仅 outasset_recordcode → 宽）
 *   outAsset.ts:97      /assets/out-assets/
 *   brokenAsset.ts:44   /assets/broken-assets/
 *   foundAsset.ts:42    /assets/found-assets/
 * ③ 审批 ×2（URL 为 damaged rc，取不到资产 rc → 宽）
 *   damagedAsset.ts:121 approve
 *   damagedAsset.ts:134 reject
 * ④ 单删 ×3（URL 为子资源 rc → 宽）
 *   damagedAsset.ts:81  deleteDamagedAsset
 *   recycleAsset.ts:86  deleteRecycleAsset
 *   outAsset.ts:133     deleteOutAsset
 * ⑤ 批量 ×7（多资产 → 宽）
 *   batch-create：brokenAsset.ts:73 / lostAsset.ts:104 / recycleAsset.ts:115 / outAsset.ts:157
 *   batch-delete：damagedAsset.ts:91 / recycleAsset.ts:96 / outAsset.ts:143
 *
 * 排除依据（留痕）：
 * - asset.ts mark-broken/create/update/delete/batch 已有 5 处既有失效（AUD-55/BF-152）；
 * - waste create/update/partial_update 后端 405（waste_asset_view.py:110-126），无写路径；
 * - broken/lost/found/repair 的 delete/batch-delete 仅软删自身（is_deleted），不动资产状态；
 * - 全部 update 类为字段白名单更新，不碰资产状态。
 */
