/**
 * @file 资产与子资源缓存失效 helper（M-RC-08 + M-CACHE-1，DR-1 单一实现）
 * @module api/assetCache
 * @exports
 *   - invalidateAssetCache: 资产状态写端点成功后的缓存失效入口（M-RC-08，24 处）
 *   - invalidateSubResourceCache: 子资源单删/批删写端点成功后的缓存失效入口（M-CACHE-1，14 处）
 * @callers
 *   - api/{repairAsset,lostAsset,damagedAsset,recycleAsset,outAsset,brokenAsset,foundAsset}.ts
 *   - api/asset.ts（既有 5 处 mark-broken/create/update/delete/batch 失效，非本 helper 接入范围）
 * @dependsOn
 *   - api/request (clearCacheByPattern)
 */

import { clearCacheByPattern } from '@/api/index'

/**
 * 内部公共核（DR-1 唯一实现，不导出）。
 * - root 归一化：补首尾 '/'（调用方可传 '/assets/lost-assets' 等宽松形态）。
 * - codes == null/undefined → 宽失效 `${root}`（详情 + 列表一并清，includes 子串覆盖）。
 * - codes 为数组 → 逐条 `${root}${code}/` 精确失效 + `${root}?` 列表 key 各一次。
 * - 空数组（P0-3）≠ null：只清列表 `${root}?`，禁止退化为宽失效
 *   （批删全失败时清全部详情会把「精确失效」降级为「清集合」）。
 * - 过滤空串 code，防 `${root}/` 自伤 pattern（includes 会命中集合下全部 key）。
 * 每次调用产生的 clearCacheByPattern 次数：宽 = 1；精确 = 成功 code 数 + 1（列表）。
 */
function invalidateByRoot(root: string, codes?: readonly string[] | null): void {
  const normalized = root.startsWith('/') ? root : `/${root}`
  const base = normalized.endsWith('/') ? normalized : `${normalized}/`
  if (codes === null || codes === undefined) {
    clearCacheByPattern(base)
    return
  }
  const valid = codes.filter((code) => typeof code === 'string' && code !== '')
  if (valid.length === 0) {
    // P0-3：空数组只清列表 key（`{base}?`），不得宽清 `${base}`
    clearCacheByPattern(`${base}?`)
    return
  }
  for (const code of valid) {
    clearCacheByPattern(`${base}${code}/`)
  }
  clearCacheByPattern(`${base}?`)
}

/**
 * 资产状态写端点成功后失效资产相关缓存（M-RC-08，24 处接入，签名不变）。
 *
 * 【根因（写死，防止误扩散）】拦截器只按写 URL 清缓存（request.ts:372-375，
 * `clearByPattern(url.split('?')[0])`，includes 子串匹配），真正的缓存逃逸条件是
 * 「写 URL 比缓存 key 更深」——`/assets/assets/{rc}/<action>/` 形态的 action 写端点
 * 够不到 `/assets/assets/{rc}/?` 详情 key 与 `/assets/assets/?page=…` 列表 key。
 *
 * 【M-CACHE-1 订正（取代本段旧结论）】旧结论「子资源写 URL 就是其缓存 key 的前缀，
 * 拦截器已覆盖——不要给这些端点再补失效」对**详情 key** 部分正确（单删写 URL
 * `/assets/{sub}/{rc}/` 子串命中自身详情 key），但对**列表 key 不成立**
 * （`/assets/{sub}/?page=…` 不含 `/assets/{sub}/{rc}/` 子串），对**批删 URL**
 * `/assets/{sub}/batch-delete/` 两者皆不成立——故子资源侧新增
 * invalidateSubResourceCache（见下），本函数与职责不重叠、不得互相替代。
 *
 * @param assetRecordcode 资产 recordcode；有值走精确失效（详情 key + 列表 key），
 *                        空值（null/undefined/''）降级宽失效（前缀清全部资产缓存，
 *                        仅导致缓存未命中重取，不会返回错误数据）。
 */
export function invalidateAssetCache(assetRecordcode?: string | null): void {
  invalidateByRoot('/assets/assets/', assetRecordcode ? [assetRecordcode] : null)
}

/**
 * 子资源单删/批删写端点成功后失效子资源自身缓存（M-CACHE-1，14 处接入）。
 *
 * 根因见 invalidateAssetCache 头注释订正段：子资源单删命中不了列表 key、
 * 批删 URL 两者都命中不了——拦截器对这些写端点**不覆盖**，须显式失效。
 *
 * @param collectionRoot 集合根路径，形如 '/assets/lost-assets/'（首尾斜杠可省，内核归一化）
 * @param codes 已删除记录的 recordcode 列表（批删传 success_ids，运行时缺失回退入参 ids）；
 *              null/undefined 宽失效（damaged 批删 ids 非同源专用）；
 *              空数组只清列表 key（P0-3，禁止退化为宽失效）。
 */
export function invalidateSubResourceCache(
  collectionRoot: string,
  codes?: readonly string[] | null,
): void {
  invalidateByRoot(collectionRoot, codes)
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
 *
 * 【子资源侧接入清单（M-CACHE-1 定稿，14 处 = 7 单删 + 7 批删；执行时以 grep 现场定位为准）】
 *   单删 ×7（精确 [rc]）：brokenAsset.ts deleteBrokenAsset / lostAsset.ts deleteLostAsset /
 *     foundAsset.ts deleteFoundAsset / repairAsset.ts deleteRepairAsset /
 *     recycleAsset.ts deleteRecycleAsset / outAsset.ts deleteOutAsset /
 *     damagedAsset.ts deleteDamagedAsset（损坏单 recordcode）
 *   批删 ×7：brokenAsset/lostAsset/foundAsset/repairAsset/recycleAsset/outAsset
 *     （同源，success_ids 优先、运行时缺失回退 ids）；
 *     damagedAsset（**非同源**：ids/success_ids 均为资产 recordcode，够不到
 *     /assets/damaged-assets/{损坏单 rc}/?，**宽失效 root，禁止逐条**）
 *   豁免：各模块 update 系列不接入（子资源列表当前未缓存，启用时须同步接入，见契约表）。
 *   时序：14 处统一 await unwrapResponse 成功后再失效（damaged/recycle/out 既有
 *   invalidateAssetCache 6 处由 fire-and-forget 收紧为 await，属有意变更，见 BF-164）。
 */
