/**
 * @file 资产与子资源缓存失效 helper（M-RC-08 + M-CACHE-1 + M-13，DR-1 单一实现）
 * @module api/assetCache
 * @exports
 *   - writeThenInvalidate: 写端点统一时序内核（M-13）：等写成功 → 失效 → 返回 data；写失败不失效
 *   - invalidateAssetCache: 资产状态写端点成功后的缓存失效入口（M-RC-08 + M-13，28 处 = 7 模块 24 + asset.ts 4）
 *   - invalidateSubResourceCache: 子资源单删/批删写端点成功后的缓存失效入口（M-CACHE-1，14 处）
 *   - invalidateAssetListCache: 仅清资产列表缓存（M-13 批量创建列表薄壳，P0-3 同构）
 * @callers
 *   - api/{repairAsset,lostAsset,damagedAsset,recycleAsset,outAsset,brokenAsset,foundAsset}.ts
 *   - api/asset.ts（5 处：update/delete/mark-broken/batch-delete → invalidateAssetCache；
 *     batch-create → invalidateAssetListCache）
 * @dependsOn
 *   - api/request (clearCacheByPattern / unwrapResponse)
 */

import { clearCacheByPattern, unwrapResponse } from '@/api/index'
import type { ApiResponse } from '@/api/index'

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
 * 资产状态写端点成功后失效资产相关缓存（M-RC-08 + M-13，28 处接入 = 7 模块 24 + asset.ts 4，签名不变）。
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
 * 写端点统一时序（M-13，37 个写端点 / 43 次失效调用）：等写成功 → 失效 → 返回 data。
 *
 * 顺序不可交换：先失效再等写完成，会让写窗口内的并发详情 GET 以「写前状态」回填缓存；
 * 而写响应拦截器只按写 URL 清缓存，够不到详情/列表 key，脏数据将残留至 TTL。
 * 写失败（code!==0 / 网络错误）不失效——失败不该清缓存。
 */
export async function writeThenInvalidate<T>(
  write: Promise<ApiResponse<T>>,
  invalidate: (data: T) => void,
): Promise<T> {
  const data = await unwrapResponse(write)
  invalidate(data)
  return data
}

/**
 * [M-13] 只清资产列表缓存：批量创建只新增记录，既有详情仍然有效。
 * 与 invalidateByRoot(codes=[]) 同构（P0-3），禁止退化为宽失效。
 */
export function invalidateAssetListCache(): void {
  invalidateByRoot('/assets/assets/', [])
}

/**
 * 接入清单（M-RC-08 + M-CACHE-1 + M-13 定稿：37 个写端点 / 43 次失效调用；
 * 锚点 = 方法名，行号随文件演进漂移不再固化）：
 *
 * ① action ×5（recordcode 取自 URL，精确失效）
 *   repairAsset.repairAsset     /assets/assets/{rc}/repair/
 *   repairAsset.repairDone      /assets/assets/{rc}/repair-done/
 *   repairAsset.repairFailed    /assets/assets/{rc}/repair-failed/
 *   lostAsset.markAssetAsLost   /assets/assets/{rc}/mark-lost/
 *   lostAsset.foundAsset        /assets/assets/{rc}/found/
 * ② 集合 create ×7（recordcode 取自表单 asset_recordcode，空值降级宽）
 *   repairAsset.createRepairAsset    /assets/repair-assets/  （表单仅 asset_code 非 recordcode → 宽）
 *   lostAsset.createLostAsset        /assets/lost-assets/
 *   damagedAsset.createDamagedAsset  /assets/damaged-assets/ （表单字段可空 → 常态宽失效）
 *   recycleAsset.createRecycleAsset  /assets/recycle-assets/ （表单仅 outasset_recordcode → 宽）
 *   outAsset.createOutAsset          /assets/out-assets/
 *   brokenAsset.createBrokenAsset    /assets/broken-assets/
 *   foundAsset.createFoundAsset      /assets/found-assets/
 * ③ 审批 ×2（URL 为 damaged rc，取不到资产 rc → 宽）
 *   damagedAsset.approveDamagedAsset
 *   damagedAsset.rejectDamagedAsset
 * ④ 单删 ×3（URL 为子资源 rc → 宽）
 *   damagedAsset.deleteDamagedAsset
 *   recycleAsset.deleteRecycleAsset
 *   outAsset.deleteOutAsset
 * ⑤ 批量 ×7（多资产 → 宽）
 *   batch-create：brokenAsset.batchCreateBrokenAssets / lostAsset.batchCreateLostAssets /
 *     recycleAsset.batchCreateRecycleAssets / outAsset.batchCreateOutAssets
 *   batch-delete：damagedAsset.batchDeleteDamagedAssets / recycleAsset.batchDeleteRecycleAssets /
 *     outAsset.batchDeleteOutAssets
 *
 * 排除依据（留痕）：
 * - asset.ts 5 处（update/delete/mark-broken/batch-delete/batch-create）原为
 *   clearCacheByPattern 直调（AUD-55/BF-152），M-13 收敛入本 helper
 *   （4 × invalidateAssetCache + 1 × invalidateAssetListCache）；
 * - waste create/update/partial_update 后端 405（waste_asset_view.py），无写路径；
 * - broken/lost/found/repair 的 delete/batch-delete 仅软删自身（is_deleted），不动资产状态；
 * - 全部 update 类为字段白名单更新，不碰资产状态。
 *
 * 【子资源侧接入清单（M-CACHE-1 定稿，14 处 = 7 单删 + 7 批删）】
 *   单删 ×7（精确 [rc]）：brokenAsset.deleteBrokenAsset / lostAsset.deleteLostAsset /
 *     foundAsset.deleteFoundAsset / repairAsset.deleteRepairAsset /
 *     recycleAsset.deleteRecycleAsset / outAsset.deleteOutAsset /
 *     damagedAsset.deleteDamagedAsset（损坏单 recordcode）
 *   批删 ×7：brokenAsset/lostAsset/foundAsset/repairAsset/recycleAsset/outAsset
 *     （同源，success_ids 优先、运行时缺失回退 ids）；
 *     damagedAsset（**非同源**：ids/success_ids 均为资产 recordcode，够不到
 *     /assets/damaged-assets/{损坏单 rc}/?，**宽失效 root，禁止逐条**）
 *   豁免：各模块 update 系列不接入（子资源列表当前未缓存，启用时须同步接入，见契约表）。
 *   时序：37 处统一 writeThenInvalidate（等写成功才失效，失败不失效）；原 18 处
 *   fire-and-forget 由本收敛修复（BF-179 / M-13），damaged/recycle/out 既有 6 处
 *   收紧见 BF-164。
 */
