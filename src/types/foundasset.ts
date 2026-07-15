/**
 * FoundAsset data model
 * Backend table: am_found_asset
 */

export interface FoundAssetCreateForm {
  lost_asset_recordcode: string
  asset_recordcode: string
  found_date?: string | null
  found_location?: string | null
  found_description?: string | null
}

export interface FoundAssetUpdateForm extends Partial<FoundAssetCreateForm> {
  id?: number
}

export interface FoundAsset {
  id: number
  recordcode: string
  lost_asset_recordcode: string
  asset_recordcode: string
  found_date: string
  found_location: string | null
  found_description: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface FoundAssetExtended extends FoundAsset {
  lost_asset_code?: string
  asset_code?: string
  asset_name?: string
  asset_specification?: string | null
  operator_name?: string
  operator_jobcode?: string
}

export interface FoundAssetQueryParams {
  page?: number
  page_size?: number
  search?: string
  asset_code?: string
  found_date?: string
  ordering?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface FoundAssetListResponse {
  count: number
  next: string | null
  previous: string | null
  results: FoundAssetExtended[]
}
