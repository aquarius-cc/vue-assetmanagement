/**
 * BrokenAsset data model
 * Backend table: am_broken_asset
 */

export interface BrokenAssetCreateForm {
  asset_recordcode: string
  broken_date?: string | null
  broken_reason: string
  broken_description?: string | null
}

export interface BrokenAssetUpdateForm extends Partial<BrokenAssetCreateForm> {
  id?: number
}

export interface BrokenAsset {
  id: number
  recordcode: string
  asset_recordcode: string
  broken_date: string
  broken_reason: string
  broken_description: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface BrokenAssetExtended extends BrokenAsset {
  asset_code?: string
  asset_name?: string
  asset_specification?: string | null
  operator_name?: string
  operator_jobcode?: string
}

export interface BrokenAssetQueryParams {
  page?: number
  page_size?: number
  search?: string
  asset_code?: string
  broken_date?: string
  ordering?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface BrokenAssetListResponse {
  count: number
  next: string | null
  previous: string | null
  results: BrokenAssetExtended[]
}

export interface BrokenAssetBatchCreateForm {
  items: Array<{
    asset_recordcode: string
    broken_date?: string
    broken_reason: string
    broken_description?: string
  }>
}

export interface BrokenAssetBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: BrokenAssetExtended[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: Record<string, unknown>
    row_number?: number
  }>
}
