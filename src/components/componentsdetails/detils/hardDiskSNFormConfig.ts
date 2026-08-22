/**
 * 硬盘 SN 表单静态配置（自 HardDiskSNForm.vue 物理提取，零逻辑变更）
 */
import type { FormRules } from 'element-plus'
import { HardDiskType, HardDiskStatus } from '@/types/harddisksn'

// ===== 硬盘类型选项 =====
export const hardDiskTypeOptions = [
  { value: HardDiskType.HDD, label: '机械硬盘 (HDD)' },
  { value: HardDiskType.SSD, label: '固态硬盀(SSD)' },
  { value: HardDiskType.NVMe, label: 'NVMe硬盘' },
  { value: HardDiskType.OTHER, label: '其他' },
]

// ===== 硬盘状态选项 =====
export const hardDiskStatusOptions = [
  { value: HardDiskStatus.ACTIVE, label: '正常' },
  { value: HardDiskStatus.REPAIR, label: '维修' },
  { value: HardDiskStatus.SCRAP, label: '报废' },
  { value: HardDiskStatus.LOST, label: '丢失' },
  { value: HardDiskStatus.DAMAGED, label: '损坏' },
]

// ===== 表单验证规则 =====
export const rules: FormRules = {
  asset_code: [{ required: true, message: '请输入或选择资产编码', trigger: 'blur' }],
  asset_recordcode: [{ required: true, message: '请选择有效资产', trigger: 'blur' }],
  harddisk_sn_code: [{ required: true, message: '请输入硬盘序列号', trigger: 'blur' }],
  harddisk_number: [
    { required: true, message: '请输入硬盘数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '范围1-999', trigger: 'blur' },
  ],
  harddisk_no: [
    { required: true, message: '请输入硬盘编号', trigger: 'blur' },
    { type: 'number', min: 1, message: '编号必须大于0', trigger: 'blur' },
  ],
}
