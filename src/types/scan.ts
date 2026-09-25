/**
 * @file 资产扫码相关类型定义
 * @module types/scan
 * @exports
 *   - PublicScanAsset: 公开扫码资产信息
 */

/**
 * 【R4-04 公开白名单】与后端 public_scan_view 的 data dict 严格对齐（后端为唯一契约源）
 */
export interface PublicScanAsset {
  asset_code: string
  asset_name: string
  asset_specification: string | null
  asset_brand: string | null
  asset_current_status: string
  physical_grade: string | null
}
