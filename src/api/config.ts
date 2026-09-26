/**
 * @file API 全局常量（DR-4 唯一来源，request/tokenRefresh 共用）
 * @module api/config
 * @exports
 *   - BASE_URL: API 基础路径
 *   - TIMEOUT: 请求超时
 *   - MAX_REFRESH_RETRY_COUNT: 401 刷新最大重试次数
 *   - REFRESH_TIMEOUT / REFRESH_NETWORK_RETRY / REFRESH_RETRY_DELAY: 刷新参数
 *   - EXPORT_MAX_ROWS: 服务端导出单次行数上限（镜像后端 EXPORT_MAX_ROWS）
 *   - EXPORT_TIMEOUT: 导出请求专用超时
 */

import { logWarn } from '@/utils/logger'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const TIMEOUT = 15_000

export const MAX_REFRESH_RETRY_COUNT = 2

export const REFRESH_TIMEOUT = 15_000

export const REFRESH_NETWORK_RETRY = 1

export const REFRESH_RETRY_DELAY = 300

/** 导出上限的兜底默认值：与后端 config/settings/base.py EXPORT_MAX_ROWS 保持一致 */
const EXPORT_MAX_ROWS_FALLBACK = 10_000

/**
 * 服务端导出单次行数上限。
 *
 * 仅用于**前端提示**（"本次最多导出 N 条"），不参与请求参数构造——
 * 真实拦截在后端，超限会返回 400。两侧必须同步：
 * 前端改 VITE_EXPORT_MAX_ROWS，后端改 settings.EXPORT_MAX_ROWS。
 * 若部署环境漏配 VITE_EXPORT_MAX_ROWS，此处回落到 10000 并在 dev 提示，
 * 避免提示与实际拦截不一致。
 */
export const EXPORT_MAX_ROWS = (() => {
  const raw = Number(import.meta.env.VITE_EXPORT_MAX_ROWS)
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw)
  if (import.meta.env.DEV && import.meta.env.VITE_EXPORT_MAX_ROWS) {
    logWarn('api/config', 'VITE_EXPORT_MAX_ROWS 非法，已回落为默认值', {
      raw: import.meta.env.VITE_EXPORT_MAX_ROWS,
      fallback: EXPORT_MAX_ROWS_FALLBACK,
    })
  }
  return EXPORT_MAX_ROWS_FALLBACK
})()

/**
 * 导出请求专用超时（毫秒）。
 *
 * 不能复用 TIMEOUT(15s)：导出是"服务端写盘 + 流式回传"，万行量级明显
 * 超出普通 CRUD 的耗时预算，沿用 15s 会把正常导出误报为网络超时。
 * 按 AR-4，超时值集中在此配置，不在调用点硬编码。
 */
export const EXPORT_TIMEOUT = 120_000
