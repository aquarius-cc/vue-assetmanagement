/**
 * 硬盘序列号数据模型
 * 对应后端数据库表: am_hard_disk_sn
 */

// ==================== 枚举类型定义 ====================

/**
 * 硬盘类型枚举
 * HDD: 机械硬盘
 * SSD: 固态硬盘
 * NVMe: NVMe硬盘
 * Other: 其他
 */
export enum HardDiskType {
  HDD = 'HDD',
  SSD = 'SSD',
  NVMe = 'NVMe',
  OTHER = 'Other'
}

/**
 * 硬盘状态枚举
 * active: 正常
 * repair: 维修
 * scrap: 报废
 * lost: 丢失
 * damaged: 损坏
 */
export enum HardDiskStatus {
  ACTIVE = 'active',
  REPAIR = 'repair',
  SCRAP = 'scrap',
  LOST = 'lost',
  DAMAGED = 'damaged'
}

// ==================== 基础接口定义 ====================

/**
 * 硬盘序列号创建表单接口
 * 用于创建硬盘序列号时的表单数据
 */
export interface HardDiskSNCreateForm {
  /** 资产编码 (外键关联 am_asset.asset_code) */
  asset_code: string
  /** 硬盘数量 */
  harddisk_number: number
  /** 硬盘编号 */
  harddisk_no: number
  /** 硬盘序列号 */
  harddisk_sn_code: string
  /** 硬盘类型 (可选) */
  harddisk_type?: HardDiskType | string | null
  /** 硬盘描述 (可选) */
  harddisk_sn_description?: string | null
  /** 硬盘状态 (可选) */
  harddisk_status?: HardDiskStatus | string | null
}

/**
 * 硬盘序列号更新表单接口
 * 用于更新硬盘序列号信息时的表单数据
 */
export interface HardDiskSNUpdateForm extends Partial<HardDiskSNCreateForm> {
  /** 主键 ID (用于定位要更新的记录) */
  id?: number
}

/**
 * 硬盘序列号基础接口
 * 对应后端数据库表 am_hard_disk_sn 的基础字段
 */
export interface HardDiskSN extends HardDiskSNCreateForm {
  /** 主键 ID */
  id: number
  /** 关联资产编码 (后端字段 harddisksn_asset, FK → Asset.recordcode, 用于 lookup/delete) */
  harddisksn_asset: string
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  update_time: string
  /** 是否删除标记 */
  is_delete: boolean
  /** 硬盘序列号对应的用户工号 (外键关联 user_database_table.employee_jobcode) */
  harddisk_user_jobcode: string
  /** 硬盘序列号对应的资产名称 */
  asset_name: string
  /** 硬盘类型 */
  harddisk_type: string | null
  /** 硬盘描述 */
  harddisk_sn_description: string | null
  /** 硬盘状态 */
  harddisk_status: string | null
}

export interface HardDiskSNListResponse extends Partial<HardDiskSN> {
  id: number,
  harddisk_sn_code: string,
  harddisk_no: number,
  harddisk_type: HardDiskType | null,
  harddisk_status: HardDiskStatus | null,
  harddisk_sn_description: string | null,
}

// ==================== 批量保存相关接口 ====================

/**
 * 硬盘条目接口
 * 用于表单中动态渲染每组硬盘信息
 * 提交给后端时，仅发送业务字段（不含 _ 前缀的内部字段）
 */
export interface DiskItem {
  /** 硬盘编号（自动生成，可手动调整） */
  harddisk_no: number
  /** 硬盘序列号 */
  harddisk_sn_code: string
  /** 硬盘类型 */
  harddisk_type: string | null
  /** 硬盘状态 */
  harddisk_status: string | null
  /** 硬盘描述 */
  harddisk_sn_description: string | null
  /** 前端状态标记：added / modified / unchanged / removed（不提交给后端） */
  _status?: 'added' | 'modified' | 'unchanged' | 'removed'
  /** 后端记录 ID（编辑模式用，不提交给后端） */
  _id?: number
}

/**
 * 硬盘序列号批量保存表单接口
 * 新增和编辑统一使用，直接提交 asset_code + disks 数组
 * 后端根据 disks.length 自动生成 harddisk_number
 * 后端根据每条记录是否有 id 决定新增或更新
 */
export interface HardDiskSNBatchSaveForm {
  /** 资产编码 */
  asset_code: string
  /** 硬盘数组（1~N 条，含新增、修改、标记失效的记录） */
  disks: Array<{
    /** 后端记录 ID（编辑已有记录时传递，新增时不传） */
    id?: number
    /** 硬盘编号 */
    harddisk_no: number
    /** 硬盘序列号 */
    harddisk_sn_code: string
    /** 硬盘类型 */
    harddisk_type?: string | null
    /** 硬盘状态（值为 'scrap' 时后端标记为失效） */
    harddisk_status?: string | null
    /** 硬盘描述 */
    harddisk_sn_description?: string | null
  }>
}
