/**
 * 硬盘序列号 Store
 * 使用 createEntityStore 工厂函数创建
 * 主键字段: id（数字类型）
 * 名称字段: harddisk_sn_code（硬盘序列号）
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { harddiskSnAPI } from '@/api/harddiskSn'
import type { HardDiskSN, HardDiskSNCreateForm, HardDiskSNUpdateForm } from '@/utils/HardDiskSN'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 硬盘序列号 Store
 */
export const useHardDiskSnStore = createEntityStore<HardDiskSN, PaginationQuery>('harddiskSn', {
  idKey: 'harddisksn_asset',
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
        next: response.next,
        previous: response.previous,
        results: response.results as HardDiskSN[],
      }
    },
    /** 根据 harddisksn_asset（资产 recordcode）获取硬盘序列号详情 */
    getById: async (code) => {
      return await harddiskSnAPI.getHardDiskSN(code)
    },
    /** 创建硬盘序列号记录 */
    create: (data) => harddiskSnAPI.createHardDiskSN(data as HardDiskSNCreateForm),
    /** 更新硬盘序列号记录 */
    update: (data) => harddiskSnAPI.updateHardDiskSN(data.harddisksn_asset!, data as HardDiskSNUpdateForm),
    /** 删除硬盘序列号记录 */
    delete: (code) => harddiskSnAPI.deleteHardDiskSN(code),
  },
  message: ElMessage,
  idToString: (id: unknown) => String(id),
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})
