/**
 * @file 硬盘序列号 Store，基于 createEntityStore 工厂创建
 * @module stores/harddiskSnStore
 * @exports
 *   - useHardDiskSnStore: 硬盘序列号管理状态 Store
 *   - getHardDiskSNsByAsset: 按资产编码查询硬盘序列号列表
 *   - saveHardDiskSNBatch: 批量保存硬盘序列号记录（新增和编辑统一）
 * @callers
 *   - components/componentsdetails/HardDiskSNDetails.vue
 *   - components/componentsdetails/detils/HardDiskSNForm.vue
 *   - components/componentsdetails/detils/HardDiskSNBasicDetails.vue
 * @dependsOn
 *   - api/harddiskSn: 硬盘序列号 API 接口
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { harddiskSnAPI } from '@/api/harddiskSn'
import type {
  HardDiskSN,
  HardDiskSNCreateForm,
  HardDiskSNUpdateForm,
  HardDiskSNBatchSaveForm,
  HardDiskSNListResponse,
} from '@/types/harddisksn'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 按资产编码查询硬盘序列号列表
 * 统一数据访问入口，供硬盘序列号表单按资产加载已有记录
 * @param asset_code 资产编码
 * @returns 硬盘序列号列表响应
 */
export const getHardDiskSNsByAsset = (asset_code: string): Promise<HardDiskSNListResponse> => {
  return harddiskSnAPI.getHardDiskSNsByAsset(asset_code)
}

/**
 * 批量保存硬盘序列号记录（新增和编辑统一）
 * 提交 { asset_recordcode, disks } 数组，后端根据每条记录是否有 recordcode 决定新增或更新
 * @param data 批量保存表单数据
 * @returns 保存结果（包含 created、updated、total、asset_recordcode）
 */
export const saveHardDiskSNBatch = (
  data: HardDiskSNBatchSaveForm,
): Promise<{
  created: number
  updated: number
  total: number
  asset_recordcode: string
}> => {
  return harddiskSnAPI.saveHardDiskSNBatch(data)
}

/**
 * 硬盘序列号 Store
 */
export const useHardDiskSnStore = createEntityStore<HardDiskSN, PaginationQuery>('harddiskSn', {
  idKey: 'recordcode',
  nameField: 'harddisk_sn_code',
  displayName: '硬盘序列号',
  api: {
    /** 获取硬盘序列号列表 */
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await harddiskSnAPI.getHardDiskSNs(safeParams)
      return {
        count: response.count,
        results: response.results as HardDiskSN[],
      }
    },
    /** 根据 recordcode 获取硬盘序列号详情 */
    getById: async (code) => {
      return await harddiskSnAPI.getHardDiskSN(code)
    },
    /** 创建硬盘序列号记录 */
    create: (data) => harddiskSnAPI.createHardDiskSN(data as HardDiskSNCreateForm),
    /** 更新硬盘序列号记录 */
    update: (data) =>
      harddiskSnAPI.updateHardDiskSN(data.recordcode!, data as HardDiskSNUpdateForm),
    /** 删除硬盘序列号记录 */
    delete: (code) => harddiskSnAPI.deleteHardDiskSN(code),
  },
  message: ElMessage,
  idToString: (id: unknown) => String(id),
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
