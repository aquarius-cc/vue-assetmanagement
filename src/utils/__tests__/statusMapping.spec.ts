import { describe, it, expect } from 'vitest'
import {
  getStatusInfo,
  getAssetStatusTagType,
  getAssetStatusText,
  getApprovalStatusTagType,
  getApprovalStatusText,
  getRepairStatusTagType,
  getRepairStatusText,
  getContractStatusTagType,
  getContractStatusText,
  getHardDiskStatusTagType,
  getHardDiskStatusText,
  getOutAssetStatusTagType,
  getOutAssetStatusText,
  getEmployeeStatusTagType,
  getEmployeeStatusText,
  getStatusColor,
  ASSET_STATUS_MAP,
  OUTASSET_STATUS_MAP,
  APPROVAL_STATUS_MAP,
  REPAIR_STATUS_MAP,
  CONTRACT_STATUS_MAP,
  HARD_DISK_STATUS_MAP,
  EMPLOYEE_STATUS_MAP,
  STATUS_COLOR_MAP,
} from '../statusMapping'

describe('statusMapping', () => {
  describe('getStatusInfo', () => {
    it('returns correct info for valid status', () => {
      const result = getStatusInfo('in_store', ASSET_STATUS_MAP)
      expect(result).toEqual({ label: '在库', type: 'success' })
    })

    it('returns default info for unknown status', () => {
      const result = getStatusInfo('unknown_status', ASSET_STATUS_MAP)
      expect(result).toEqual({ label: 'unknown_status', type: 'info' })
    })

    it('returns default info for empty string', () => {
      const result = getStatusInfo('', ASSET_STATUS_MAP)
      expect(result).toEqual({ label: '未知', type: 'info' })
    })
  })

  describe('Asset status functions', () => {
    it('getAssetStatusTagType returns correct type', () => {
      expect(getAssetStatusTagType('in_store')).toBe('success')
      expect(getAssetStatusTagType('in_use')).toBe('primary')
      expect(getAssetStatusTagType('broken')).toBe('danger')
      expect(getAssetStatusTagType('repairing')).toBe('warning')
      expect(getAssetStatusTagType('unknown')).toBe('info')
    })

    it('getAssetStatusText returns correct label', () => {
      expect(getAssetStatusText('in_store')).toBe('在库')
      expect(getAssetStatusText('in_use')).toBe('在用')
      expect(getAssetStatusText('broken')).toBe('已损坏')
      expect(getAssetStatusText('unknown')).toBe('unknown')
    })
  })

  describe('Approval status functions', () => {
    it('getApprovalStatusTagType returns correct type', () => {
      expect(getApprovalStatusTagType('pending')).toBe('warning')
      expect(getApprovalStatusTagType('approved')).toBe('success')
      expect(getApprovalStatusTagType('rejected')).toBe('danger')
    })

    it('getApprovalStatusText returns correct label', () => {
      expect(getApprovalStatusText('pending')).toBe('待审批')
      expect(getApprovalStatusText('approved')).toBe('已通过')
      expect(getApprovalStatusText('rejected')).toBe('已拒绝')
    })
  })

  describe('Repair status functions', () => {
    it('getRepairStatusTagType returns correct type', () => {
      expect(getRepairStatusTagType('in_progress')).toBe('warning')
      expect(getRepairStatusTagType('completed')).toBe('success')
      expect(getRepairStatusTagType('failed')).toBe('danger')
    })

    it('getRepairStatusText returns correct label', () => {
      expect(getRepairStatusText('in_progress')).toBe('维修中')
      expect(getRepairStatusText('completed')).toBe('已完成')
      expect(getRepairStatusText('failed')).toBe('维修失败')
    })
  })

  describe('Contract status functions', () => {
    it('getContractStatusTagType returns correct type', () => {
      expect(getContractStatusTagType('purchasing')).toBe('warning')
      expect(getContractStatusTagType('purchase_finished')).toBe('primary')
      expect(getContractStatusTagType('settlement_done')).toBe('success')
      expect(getContractStatusTagType('project_finished')).toBe('success')
      expect(getContractStatusTagType('unknown')).toBe('info')
    })

    it('getContractStatusText returns correct label', () => {
      expect(getContractStatusText('purchasing')).toBe('供货中')
      expect(getContractStatusText('purchase_finished')).toBe('供货完成')
      expect(getContractStatusText('receive_check')).toBe('到货验收')
      expect(getContractStatusText('initial_check')).toBe('初步验收')
      expect(getContractStatusText('project_settlement')).toBe('结算中')
      expect(getContractStatusText('settlement_done')).toBe('结算完成')
      expect(getContractStatusText('final_check')).toBe('最终验收')
      expect(getContractStatusText('project_finished')).toBe('项目结束')
    })
  })

  describe('Hard disk status functions', () => {
    it('getHardDiskStatusTagType returns correct type', () => {
      expect(getHardDiskStatusTagType('active')).toBe('success')
      expect(getHardDiskStatusTagType('repair')).toBe('warning')
      expect(getHardDiskStatusTagType('scrap')).toBe('danger')
      expect(getHardDiskStatusTagType('lost')).toBe('danger')
      expect(getHardDiskStatusTagType('damaged')).toBe('danger')
    })

    it('getHardDiskStatusText returns correct label', () => {
      expect(getHardDiskStatusText('active')).toBe('正常')
      expect(getHardDiskStatusText('repair')).toBe('维修中')
      expect(getHardDiskStatusText('scrap')).toBe('已报废')
      expect(getHardDiskStatusText('lost')).toBe('已遗失')
      expect(getHardDiskStatusText('damaged')).toBe('已损坏')
    })
  })

  describe('Out asset status functions', () => {
    it('getOutAssetStatusTagType returns correct type', () => {
      expect(getOutAssetStatusTagType('in_use')).toBe('primary')
      expect(getOutAssetStatusTagType('recycled_pending')).toBe('info')
      expect(getOutAssetStatusTagType('damaged')).toBe('warning')
      expect(getOutAssetStatusTagType('scrapped')).toBe('info')
    })

    it('getOutAssetStatusText returns correct label', () => {
      expect(getOutAssetStatusText('in_use')).toBe('在用')
      expect(getOutAssetStatusText('recycled_pending')).toBe('已回收待发放')
      expect(getOutAssetStatusText('damaged')).toBe('待报废')
      expect(getOutAssetStatusText('scrapped')).toBe('已报废')
    })
  })

  describe('Employee status functions', () => {
    it('getEmployeeStatusTagType returns correct type', () => {
      expect(getEmployeeStatusTagType('active')).toBe('success')
      expect(getEmployeeStatusTagType('left')).toBe('warning')
      expect(getEmployeeStatusTagType('retirement')).toBe('info')
    })

    it('getEmployeeStatusText returns correct label', () => {
      expect(getEmployeeStatusText('active')).toBe('在职')
      expect(getEmployeeStatusText('left')).toBe('离职')
      expect(getEmployeeStatusText('retirement')).toBe('退休')
    })
  })

  describe('getStatusColor', () => {
    it('returns correct color for asset statuses', () => {
      expect(getStatusColor('in_store')).toBe('#52C41A')
      expect(getStatusColor('in_use')).toBe('#2B5FD7')
      expect(getStatusColor('broken')).toBe('#FF4D4F')
      expect(getStatusColor('repairing')).toBe('#FAAD14')
      expect(getStatusColor('recycled_pending')).toBe('#909399')
    })

    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#909399')
    })
  })

  describe('Status maps', () => {
    it('ASSET_STATUS_MAP has all required statuses', () => {
      expect(Object.keys(ASSET_STATUS_MAP)).toHaveLength(8)
      expect(ASSET_STATUS_MAP).toHaveProperty('in_store')
      expect(ASSET_STATUS_MAP).toHaveProperty('in_use')
      expect(ASSET_STATUS_MAP).toHaveProperty('recycled_pending')
      expect(ASSET_STATUS_MAP).toHaveProperty('broken')
      expect(ASSET_STATUS_MAP).toHaveProperty('repairing')
      expect(ASSET_STATUS_MAP).toHaveProperty('lost')
      expect(ASSET_STATUS_MAP).toHaveProperty('damaged')
      expect(ASSET_STATUS_MAP).toHaveProperty('scrapped')
    })

    it('OUTASSET_STATUS_MAP has all required statuses', () => {
      expect(Object.keys(OUTASSET_STATUS_MAP)).toHaveLength(4)
      expect(OUTASSET_STATUS_MAP).toHaveProperty('in_use')
      expect(OUTASSET_STATUS_MAP).toHaveProperty('recycled_pending')
      expect(OUTASSET_STATUS_MAP).toHaveProperty('damaged')
      expect(OUTASSET_STATUS_MAP).toHaveProperty('scrapped')
    })

    it('APPROVAL_STATUS_MAP has all required statuses', () => {
      expect(Object.keys(APPROVAL_STATUS_MAP)).toHaveLength(3)
      expect(APPROVAL_STATUS_MAP).toHaveProperty('pending')
      expect(APPROVAL_STATUS_MAP).toHaveProperty('approved')
      expect(APPROVAL_STATUS_MAP).toHaveProperty('rejected')
    })

    it('REPAIR_STATUS_MAP has all required statuses', () => {
      expect(Object.keys(REPAIR_STATUS_MAP)).toHaveLength(3)
      expect(REPAIR_STATUS_MAP).toHaveProperty('in_progress')
      expect(REPAIR_STATUS_MAP).toHaveProperty('completed')
      expect(REPAIR_STATUS_MAP).toHaveProperty('failed')
    })

    it('CONTRACT_STATUS_MAP has all eight statuses', () => {
      expect(Object.keys(CONTRACT_STATUS_MAP)).toHaveLength(8)
      expect(CONTRACT_STATUS_MAP).toHaveProperty('purchasing')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('purchase_finished')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('receive_check')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('initial_check')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('project_settlement')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('settlement_done')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('final_check')
      expect(CONTRACT_STATUS_MAP).toHaveProperty('project_finished')
    })

    it('HARD_DISK_STATUS_MAP has all required statuses', () => {
      expect(Object.keys(HARD_DISK_STATUS_MAP)).toHaveLength(5)
      expect(HARD_DISK_STATUS_MAP).toHaveProperty('active')
      expect(HARD_DISK_STATUS_MAP).toHaveProperty('repair')
      expect(HARD_DISK_STATUS_MAP).toHaveProperty('scrap')
      expect(HARD_DISK_STATUS_MAP).toHaveProperty('lost')
      expect(HARD_DISK_STATUS_MAP).toHaveProperty('damaged')
    })

    it('EMPLOYEE_STATUS_MAP has all required statuses', () => {
      expect(Object.keys(EMPLOYEE_STATUS_MAP)).toHaveLength(3)
      expect(EMPLOYEE_STATUS_MAP).toHaveProperty('active')
      expect(EMPLOYEE_STATUS_MAP).toHaveProperty('left')
      expect(EMPLOYEE_STATUS_MAP).toHaveProperty('retirement')
    })

    it('STATUS_COLOR_MAP has all required colors', () => {
      expect(Object.keys(STATUS_COLOR_MAP)).toHaveLength(5)
      expect(STATUS_COLOR_MAP).toHaveProperty('success')
      expect(STATUS_COLOR_MAP).toHaveProperty('primary')
      expect(STATUS_COLOR_MAP).toHaveProperty('warning')
      expect(STATUS_COLOR_MAP).toHaveProperty('danger')
      expect(STATUS_COLOR_MAP).toHaveProperty('info')
    })
  })
})
