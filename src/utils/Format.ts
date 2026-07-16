// Format.ts
import { isRef } from 'vue'
import type { Ref } from 'vue'
// import { ref } from 'vue'
// import type { Contract } from '@/types/asset'
import type { ContractCreateForm } from '@/types/contract'
import { EmployeeStatus } from '@/utils/User'
import type { ExcelEmployeeData, ValidatedEmployeeData } from '@/utils/User'
import type { ExcelDepartmentData, ValidatedDepartmentData } from '@/utils/Department'
import type { AssetCurrentStatus } from '@/types/asset'
import type { OutAssetCurrentStatus } from '@/utils/OutAsset'
import { ContractSettlementStatus } from '@/types/contract'

// 日期格式化函数（修复类型错误）
const formatDate = (date: Date | number | string | null | undefined): string | null => {
  // 处理空值情况
  if (!date) return null

  // 统一转换为Date对象
  let dateObj: Date
  if (date instanceof Date) {
    // 已经是Date对象
    dateObj = date
  } else if (typeof date === 'number') {
    // 处理时间戳（数字类型）：13位毫秒级，10位秒级
    const timestamp = date.toString().length === 10 ? date * 1000 : date
    dateObj = new Date(timestamp)
  } else if (typeof date === 'string') {
    // 处理日期字符串
    dateObj = new Date(date)
  } else {
    // 其他未知类型
    return null
  }

  // 检查是否为有效日期
  if (isNaN(dateObj.getTime())) {
    return null
  }

  // 格式化日期为 YYYY-MM-DD
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
  //下面效果等效上面
  // const d = new Date(date)
  // return d.toISOString().split('T')[0] // 返回 YYYY-MM-DD 格式
  // return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`
}

// 金额格式化函数：转为 ￀xxxxx.xx 格式
const formatPrice = (price: number | string | null | undefined): string => {
  // 1. 先将输入转为数字（处理字符串格式的金额，妀"1000" 戀"1000.5"）
  const num = typeof price === 'number' ? price : Number(price)
  // 2. 处理非数字、NaN 或 null 的情况，返回默认值
  if (isNaN(num) || price === null || price === undefined) {
    return Number(0).toFixed(2)
  }
  // const num = Number(price)
  // 3. 保留两位小数，再拼接 "￀" 前缀
  return num.toFixed(2)
}

// 格式化数字为千分位（修复类型错误）
const formatNumber = (num: number | string | null | undefined) => {
  // 处理空值情况
  if (num === undefined || num === null || num === '') return '0'

  // 将输入转换为数字（处理字符串类型的数字，妀"1234"）
  const number = typeof num === 'number' ? num : Number(num)

  // 处理转换失败的情况（如非数字字符串）
  if (isNaN(number)) return '0'

  return number.toLocaleString('zh-CN')
}

//合同信息数据上传时格式化
const contractiInfoFormate = (
  contract_info: Partial<ContractCreateForm> | Ref<Partial<ContractCreateForm>>,
): Partial<ContractCreateForm> => {
  const rawData = isRef(contract_info) ? contract_info.value : contract_info

  // 苀rawData 为空（undefined 或 null），返回空对象（或抛出错误，根据业务需求）
  if (!rawData) {
    console.warn('格式化合同数据失败：原始数据为空')
    return {}
  }

  // ----- 安全获取枚举状态的辅助函数 -----
  const getSettlementStatus = (value: unknown): ContractSettlementStatus => {
    if (value == null) return ContractSettlementStatus.PENDING
    const trimmed = String(value).trim()
    // 校验是否为合法的枚举值（利用 Object.values 获取所有枚举值）
    const validStatuses = Object.values(ContractSettlementStatus) // ['pending', 'settling_up', 'settled']
    return validStatuses.includes(trimmed as ContractSettlementStatus)
      ? (trimmed as ContractSettlementStatus)
      : ContractSettlementStatus.PENDING // 非法值降级为默认
  }
  // 格式化 + 修正字段 + 确保类型正确
  // 第二步：格式化数据（确保 rawData 是对象类型，可安入spread）
  const formattedData = {
    ...rawData,
    // 日期字段格式化（兼容 undefined，formatDate 需处理空值）
    contract_signing_date: formatDate(rawData.contract_signing_date),
    contract_preliminary_acceptance_date: formatDate(rawData.contract_preliminary_acceptance_date),
    contract_final_acceptance_date: formatDate(rawData.contract_final_acceptance_date),
    // 数字字段处理（兼容 undefined，避免 Number(undefined) 转为 NaN）
    contract_price: rawData.contract_price !== null ? Number(rawData.contract_price) : undefined,
    contract_warranty_period:
      rawData.contract_warranty_period !== null
        ? Number(rawData.contract_warranty_period)
        : undefined,
    contract_settledment_price:
      rawData.contract_settledment_price !== null
        ? Number(rawData.contract_settledment_price)
        : null,
    contract_paid_price:
      rawData.contract_paid_price !== null ? Number(rawData.contract_paid_price) : 0, // 默认为 0
    contract_paid_count_number:
      rawData.contract_paid_count_number !== null ? Number(rawData.contract_paid_count_number) : 0, // 默认为 0
    // 字符串字段处理（兼容 undefined，避免 String(undefined) 转为 "undefined"）
    contract_type:
      rawData.contract_type !== null ? String(rawData.contract_type).trim() : undefined,
    contract_settledment_status: getSettlementStatus(rawData.contract_settledment_status),
  }
  return formattedData
}

// const typeCasting = (data: string) => {
//   const result = ref('')
//   if (data === 'purchase') result.value = '采购合同'
//   else if (data === 'service') result.value = '服务合同'
//   else if (data === 'information_construction') result.value = '信息化建设合吀
//   else if (data === 'direct_procurement') result.value = '直接采购合同'
//   else if (data === 'pending') result.value = '待结简
//   else if (data === 'settled') result.value = '已结简
//   else result.value = '未知类型'
//   return result
// }

// const assetAppearanceMapping: Record<string, string> = {
//   newly: '新增资产',
//   used: '已用资产',
//   damaged: '待报废资人,
//   waste: '已报废资人,
// }

const assetCurrentStatusMapping: Record<string, string> = {
  in_store: '在库',
  recycled_pending: '已回收待发放',
  in_use: '在用',
  broken: '已损坏',
  repairing: '维修中',
  lost: '已遗失',
  damaged: '待报废',
  scrapped: '已报废',
}

/**
 * 根据英文状态获取中文显示文本
 * @param status - 英文状态（可能一undefined 或 null）
 * @returns 中文状态，若未匹配则返回 '
 */
export function getAssetStatusText(status?: string | null): string {
  if (!status) return '未知'
  return assetCurrentStatusMapping[status as AssetCurrentStatus] ?? '未知'
}

// 资产状态映射（作为assetCurrentStatusMapping的别名）
const assetStatusMapping: Record<string, string> = assetCurrentStatusMapping

// // 资产使用状态映射// const assetUsingStatusMapping: Record<string, string> = {
//   idle: '闲置',
//   in_use: '在用',
//   under_maintenance: '维修中',
//   out_of_service: '停用',
//   allocated: '已分配',
//   pending_allocation: '待分配',
// }

const contractTypeMapping: Record<string, string> = {
  purchase: '采购合同',
  service: '服务合同',
  information_construction: '信息化建设合同',
  direct_procurement: '直接采购合同',
}

const contractSettlementStatusMapping: Record<string, string> = {
  pending: '待结算',
  settling_up: '结算中',
  settled: '已结算',
}

const assetTypeMapping: Record<string, string> = {
  hardware: '硬件',
  software: '软件',
  lowvalue: '低值易耗',
  other: '其他',
}

const storageMapping: Record<string, string> = {
  newasset: '新货仓库',
  recycle: '回收仓库',
  damaged: '待报废仓库',
}

const userStatusMapping: Record<string, string> = {
  active: '在职员工',
  left: '离职员工',
  retirement: '退休员工',
  dismissed: '辞退员工',
}
const getStatusDisplay = (status: string | undefined): string => {
  if (!status) return '未知'
  return userStatusMapping[status] ?? status
}

// ✀中文/别名 ↀ后端需要的 key
// 🌟 新增：用户状态映射（中文→枚举）
const USER_STATUS_INPUT_MAPPING: Record<string, EmployeeStatus> = {
  active: EmployeeStatus.ACTIVE,
  left: EmployeeStatus.LEFT,
  retirement: EmployeeStatus.RETIREMENT,
  在职: EmployeeStatus.ACTIVE,
  离职: EmployeeStatus.LEFT,
  退休: EmployeeStatus.RETIREMENT,
  在职员工: EmployeeStatus.ACTIVE,
  离职员工: EmployeeStatus.LEFT,
  退休员工: EmployeeStatus.RETIREMENT,
  在職: EmployeeStatus.ACTIVE,
  離職: EmployeeStatus.LEFT,
}
// 🌟 新增：用户状态反向映射（枚举→中文）
const USER_STATUS_DISPLAY_MAPPING: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: '在职',
  [EmployeeStatus.LEFT]: '离职',
  [EmployeeStatus.RETIREMENT]: '退休',
}
// 🌟 新增：验证用户状态合法性校验
const validateUserStatus = (status: string): EmployeeStatus | null => {
  const normalizedStatus = status.trim().toLowerCase()
  return USER_STATUS_INPUT_MAPPING[normalizedStatus] || null
}
// 🌟 新增：Excel用户数据转换+验证
const transformAndValidateExcelUser = (
  excelData: ExcelEmployeeData,
  departmentCodeMap: Record<string, string>, // 部门代码→部门名称映射
): ValidatedEmployeeData => {
  const result: ValidatedEmployeeData = {
    user_name: excelData.姓名 || '',
    user_jobcode: excelData.工号 || '',
    user_phone: excelData.电话 || '',
    user_location: excelData.位置 || '',
    user_status: '',
    user_department_code: excelData.部门代码 || '',
    user_department_name: departmentCodeMap[excelData.部门代码 ?? ''] || '',
    user_description: excelData.描述 || '',
    validationStatus: 'success',
    validationError: '',
  }

  // 校验必填字段
  const requiredFields = [
    { key: 'user_name', label: '姓名', value: result.user_name },
    { key: 'user_jobcode', label: '工号', value: result.user_jobcode },
    { key: 'user_phone', label: '电话', value: result.user_phone },
    { key: 'user_department_code', label: '部门代码', value: result.user_department_code },
  ]

  for (const field of requiredFields) {
    if (!field.value) {
      result.validationStatus = 'error'
      result.validationError = `${field.label}不能为空`
      return result
    }
  }

  // 校验并转换状态
  const statusValue = excelData.状态 ?? ''
  const validStatus = validateUserStatus(statusValue)
  if (!validStatus) {
    result.validationStatus = 'error'
    result.validationError = `状态${statusValue}不合法（仅支持：在职/离职/退休）`
    return result
  }
  result.user_status = validStatus

  // 校验部门代码
  if (!result.user_department_name) {
    result.validationStatus = 'error'
    result.validationError = `部门代码${result.user_department_code}不存在`
    return result
  }

  return result
}

// 🌟 新增：Excel部门数据转换+验证
const transformAndValidateExcelDepartment = (
  excelData: ExcelDepartmentData,
): ValidatedDepartmentData => {
  const result: ValidatedDepartmentData = {
    department_code: excelData.部门编码 || '',
    department_name: excelData.部门名称 || '',
    department_information: excelData.部门信息员 || '',
    validationStatus: 'success',
    validationError: '',
  }

  // 校验必填字段
  if (!result.department_code) {
    result.validationStatus = 'error'
    result.validationError = '部门编码不能为空'
  } else if (!result.department_name) {
    result.validationStatus = 'error'
    result.validationError = '部门名称不能为空'
  }

  return result
}

const outassetStatusMapping: Record<string, string> = {
  recycled_pending: '已回收待发放',
  in_use: '在用',
  damaged: '待报废',
  scrapped: '已报废',
}
/**
 * 根据英文状态获取中文显示文本
 * @param status - 英文状态（可能一undefined 或 null）
 * @returns 中文状态，若未匹配则返回 '
 */
export function getOutAssetStatusText(status?: string | null): string {
  if (!status) return '未知'
  return outassetStatusMapping[status as OutAssetCurrentStatus] ?? '未知'
}

const outassetTypeMapping: Record<string, string> = {
  receive: '领用',
  borrow: '借用',
}
// 创建反向映射，将中文状态值转换为英文状态候// const reverseStatusMapping: Record<string, string> = {
//   在职员工: 'active',
//   离职员工: 'left',
//   退休员工: 'retirement',
// }
// 反转映射 效果同上
// const reverseUserStatusMapping: Record<string, string> = Object.fromEntries(
//   Object.entries(userStatusMapping).map(([key, value]) => [value, key]),
// )
// const userStatusSearchingMapping: Record<string, string> = {
//   active: '在职',
//   left: '离职',
//   retirement: '退伀,
// }

// 解析Excel中的日期数据，转换为后端需要的格式 (YYYY-MM-DD)
// 确保始终返回字符串，不会返回null
const parseExcelDate = (dateStr: string): string | null => {
  // if (!dateStr) return null
  if (!dateStr) {
    // 返回一个默认日期或空字符串，具体取决于后端API的要求求
    // 如果后端允许空日期，可以返回空字符串；否则返回一个默认日最
    return '' // 或者return '1970-01-01' 作为默认候
  }

  // 如果已经YYYY-MM-DD 格式，直接返回
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (dateRegex.test(dateStr)) {
    return dateStr
  }

  // 尝试解析各种可能的日期格开
  let date: Date | null = null

  // 尝试解析�MM-DD-�MM-DD-YYYY 格式
  if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(dateStr)) {
    date = new Date(dateStr.replace(/[\/\-]/g, '/'))
  }
  // 尝试解析 DD/MM/YYYY 格式 (欧洲格式)
  else if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(dateStr)) {
    const parts = dateStr.split(/[\/\-]/)
    if (parts.length === 3) {
      // 假设昀DD/MM/YYYY 格式，需要转换为 MM/DD/YYYY
      date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`)
    }
  }
  // 尝试解析Excel序列号日最(数字形式)
  else if (/^\d+$/.test(dateStr) && parseInt(dateStr) > 1) {
    // Excel日期是从1900幀最日开始计算的天数
    const excelDate = new Date(1900, 0, parseInt(dateStr) - 1)
    date = excelDate
  }
  // 尝试解析带有时区的ISO格式或其他常见格开
  else {
    date = new Date(dateStr)
  }

  // 验证日期是否有效
  if (date && !isNaN(date.getTime())) {
    // 转换一YYYY-MM-DD 格式
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // return null
  // 如果日期无效，返回空字符串或默认日期
  return '未知'
}

export {
  formatDate,
  formatPrice,
  formatNumber,
  contractiInfoFormate,
  // typeCasting,
  // assetAppearanceMapping,
  assetCurrentStatusMapping,
  assetStatusMapping,
  // assetUsingStatusMapping,
  contractTypeMapping,
  contractSettlementStatusMapping,
  assetTypeMapping,
  storageMapping,
  userStatusMapping,
  getStatusDisplay,
  USER_STATUS_INPUT_MAPPING,
  // 🌟 新增导出
  USER_STATUS_DISPLAY_MAPPING,
  validateUserStatus,
  transformAndValidateExcelUser,
  transformAndValidateExcelDepartment,
  outassetStatusMapping,
  outassetTypeMapping,
  // reverseUserStatusMapping,
  parseExcelDate,
}
