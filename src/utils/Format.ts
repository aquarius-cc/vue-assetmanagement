/**
 * @file 通用数据格式化工具集，提供日期、金额、状态映射、Excel数据校验等函数
 * @module src/utils/Format
 * @exports
 *   - formatDate: 将日期转为 YYYY-MM-DD 格式（[M-15] 纯日历日期直通；绝对时刻按 Asia/Shanghai 业务时区渲染）
 *   - formatDateTime: 将日期转为 MM-DD HH:mm 格式（[M-15] 业务时区）
 *   - formatDateTimeFull: 将日期转为完整日期时间格式
 *   - formatPrice: 金额格式化为两位小数
 *   - formatNumber: 数字千分位格式化
 *   - contractiInfoFormate: 合同信息上传数据格式化
 *   - assetCurrentStatusMapping: 资产状态枚举映射
 *   - contractTypeMapping / storageMapping / userStatusMapping: 各类业务枚举映射
 *   - getStatusDisplay: 用户状态中文显示
 *   - physicalGradeMapping / getPhysicalGradeDisplay: 资产物理成色映射与显示
 *   - USER_STATUS_INPUT_MAPPING / USER_STATUS_DISPLAY_MAPPING: 用户状态双向映射
 *   - validateUserStatus: 校验用户状态合法性
 *   - transformAndValidateExcelUser: Excel 用户数据转换与校验
 *   - transformAndValidateExcelDepartment: Excel 部门数据转换与校验
 *   - ASSET_STATUS_MAP / outassetTypeMapping: 资产状态与出库类型映射
 *   - parseExcelDate: 解析 Excel 中的日期字符串
 *   - getAssetStatusText: 获取资产状态中文文本
 *   - getOutAssetStatusText: 获取出库资产状态中文文本
 * @callers
 *   - stores/dashboard
 *   - composables/useAssetInfoCards, useAssetExtendedInfoCards, useOutAssetDetailCards, useRecycleAssetDetailCards, useAssetListConfig
 * @dependsOn
 *   - vue (isRef)
 *   - @/types/contract, @/types/user, @/types/department, @/types/asset, @/types/outasset
 */

import { isRef } from 'vue'
import type { Ref } from 'vue'
// import { ref } from 'vue'
// import type { Contract } from '@/types/asset'
import type { ContractCreateForm } from '@/types/contract'
import { EmployeeStatus } from '@/types/user'
import type { ExcelEmployeeData, ValidatedEmployeeData } from '@/types/user'
import type { ExcelDepartmentData, ValidatedDepartmentData } from '@/types/department'
import { logWarn } from '@/utils/logger'
import {
  ASSET_STATUS_MAP,
  getAssetStatusText as getAssetStatusTextFromStatusMapping,
} from './statusMapping'

// 日期格式化函数（修复类型错误）

/** [M-15] 产品口径：业务时刻统一按 Asia/Shanghai 渲染，与后端 TIME_ZONE 对齐，不随浏览器时区漂移 */
export const BUSINESS_TIME_ZONE = 'Asia/Shanghai'

const businessParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/**
 * [A4/MA-04] 业务时区星期中文 formatter（zh-CN 单独建，不并入 en-CA parts——
 * en-CA 的 weekday:'long' 输出 "Monday" 而非「星期一」）。
 */
const businessWeekday = new Intl.DateTimeFormat('zh-CN', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'long',
})

/** [A4/MA-04] 绝对时刻 → 业务时区星期中文（如「星期一」） */
export function toBusinessWeekday(d: Date): string {
  return businessWeekday.format(d)
}

/**
 * [M-15] 绝对时刻 → 东八区年月日时分秒。
 * formatDate / formatDateTime / formatDateTimeFull / formatRelativeTime / todayLocalISO 的唯一来源。
 * 与 toLocalDateString 职责边界：本函数处理「有时刻语义的绝对瞬间」，后者处理「无时刻语义的本地日历日期」。
 */
export function toBusinessDateTimeParts(d: Date) {
  const parts = businessParts.formatToParts(d)
  const pick = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    year: pick('year'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
    month: pick('month'),
    day: pick('day'),
  }
}

const formatDate = (date: Date | number | string | null | undefined): string | null => {
  // 处理空值情况
  if (!date) return null

  // [M-15] 纯 YYYY-MM-DD 日历日期直通：无时刻语义，不经任何时区换算（防 UTC-12/+14 跨日）
  if (typeof date === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
    return date
  }

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

  // [M-15] 绝对时刻按业务时区（Asia/Shanghai）渲染年月日
  return toBusinessDateTimeParts(dateObj).date
}

/**
 * [M-33] 本地日历日期拼接的唯一底层（YYYY-MM-DD），全仓禁止再手写 getFullYear 拼接。
 * [M-15] 仅用于「无时刻语义」的本地日历日期：DashboardAssetTrend.vue / readExcelFile.ts / parseExcelDate；
 * 有时刻语义的绝对瞬间一律走 toBusinessDateTimeParts。
 */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** [M-15] 返回业务时区（Asia/Shanghai）的今天 YYYY-MM-DD；必须走 toBusinessDateTimeParts，不得回落 toLocalDateString(new Date()) 的本地日历语义 */
const todayLocalISO = (): string => {
  return toBusinessDateTimeParts(new Date()).date
}

const pad = (n: number): string => String(n).padStart(2, '0')

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  // [M-15] 按业务时区渲染月日时分
  const p = toBusinessDateTimeParts(d)
  return `${p.month}-${p.day} ${p.hour}:${p.minute}`
}

const formatDateTimeFull = (dateStr: string | null | undefined): string => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  // [M-15] 按业务时区渲染完整日期时间
  const p = toBusinessDateTimeParts(d)
  return `${p.date} ${p.hour}:${p.minute}:${p.second}`
}

const exactFormatDate = (date: string | null | undefined): string => {
  // [M-33] 与 formatDateTimeFull 逐字节相同的重复实现，收敛为委托（导出名保留）
  return formatDateTimeFull(date)
}

/**
 * [M-33] 相对时间文案（与 NotificationBell 原 formatTime 行为逐字节对齐后收敛单源）：
 * 刚刚 / N分钟前 / N小时前 / M/D HH:mm
 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  // [M-15] 落到业务时区渲染；月/日沿用原不补零形态（M-33 逐字节对齐 NotificationBell）
  const p = toBusinessDateTimeParts(d)
  return `${Number(p.month)}/${Number(p.day)} ${p.hour}:${p.minute}`
}

// 金额格式化函数：转为 ￥xxxxx.xx 格式
const formatPrice = (price: number | string | null | undefined): string => {
  // 1. 先将输入转为数字（处理字符串格式的金额，测试"1000" 转 "1000.5"）
  const num = typeof price === 'number' ? price : Number(price)
  // 2. 处理非数字、NaN 或 null 的情况，返回默认值
  if (isNaN(num) || price === null || price === undefined) {
    return Number(0).toFixed(2)
  }
  // const num = Number(price)
  // 3. 保留两位小数，再拼接 "￥" 前缀
  return num.toFixed(2)
}

// 格式化数字为千分位（修复类型错误）
const formatNumber = (num: number | string | null | undefined) => {
  // 处理空值情况
  if (num === undefined || num === null || num === '') return '0'

  // 将输入转换为数字（处理字符串类型的数字，如"1234"）
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

  // 若 rawData 为空（undefined 或 null），返回空对象（或抛出错误，根据业务需求）
  if (!rawData) {
    logWarn('utils/Format', '格式化合同数据失败：原始数据为空')
    return {}
  }

  // ----- 安全获取枚举状态的辅助函数 -----
  // 格式化 + 修正字段 + 确保类型正确
  // 第二步：格式化数据（确保 rawData 是对象类型，可安入spread）
  const formattedData = {
    ...rawData,
    // 日期字段格式化（兼容 undefined，formatDate 需处理空值）
    contract_start_date: formatDate(rawData.contract_start_date),
    initial_check_date: formatDate(rawData.initial_check_date),
    final_check_date: formatDate(rawData.final_check_date),
    // 数字字段处理（兼容 undefined/null，避免 Number(undefined) 转为 NaN）
    contract_amount: rawData.contract_amount != null ? Number(rawData.contract_amount) : undefined,
    contract_warranty_period:
      rawData.contract_warranty_period != null
        ? Number(rawData.contract_warranty_period)
        : undefined,
    settlemented_price:
      rawData.settlemented_price != null ? Number(rawData.settlemented_price) : null,
    amount_paid: rawData.amount_paid != null ? Number(rawData.amount_paid) : 0,
    // 字符串字段处理（兼容 undefined，避免 String(undefined) 转为 "undefined"）
    contract_type:
      rawData.contract_type !== null ? String(rawData.contract_type).trim() : undefined,
    contract_status: rawData.contract_status || undefined,
  }
  return formattedData
}

// const typeCasting = (data: string) => {
//   const result = ref('')
//   if (data === 'purchase') result.value = '采购合同'
//   else if (data === 'service') result.value = '服务合同'
//   else if (data === 'information_construction') result.value = '信息化建设合同
//   else if (data === 'direct_procurement') result.value = '直接采购合同'
//   else if (data === 'pending') result.value = '待结算
//   else if (data === 'settled') result.value = '已结算
//   else result.value = '未知类型'
//   return result
// }

// const assetAppearanceMapping: Record<string, string> = {
//   newly: '新增资产',
//   used: '已用资产',
//   damaged: '待报废资人,
//   waste: '已报废资人,
// }

// 资产当前状态映射（单一来源：statusMapping.ASSET_STATUS_MAP，DR-1/DR-2 消除重复字面量定义）
const assetCurrentStatusMapping: Record<string, string> = Object.fromEntries(
  Object.entries(ASSET_STATUS_MAP).map(([status, info]) => [status, info.label]),
)

/**
 * 根据英文状态获取中文显示文本
 * 未知状态回退返回原始值（C-1 决策，2026-08-13），与 statusMapping.getAssetStatusText 语义一致
 * @param status - 英文状态（可能为 undefined 或 null）
 * @returns 中文状态，未知状态返回原始值，空值返回 '未知'
 */
export function getAssetStatusText(status?: string | null): string {
  if (!status) return '未知'
  return getAssetStatusTextFromStatusMapping(status)
}

// // 资产使用状态映射// const assetUsingStatusMapping: Record<string, string> = {
//   idle: '闲置',
//   in_use: '在用',
//   under_maintenance: '维修中',
//   out_of_service: '停用',
//   allocated: '已分配',
//   pending_allocation: '待分配',
// }

const contractTypeMapping: Record<string, string> = {
  tender_procurement: '招标采购合同',
  service: '服务合同',
  information_construction: '信息化建设合同',
  direct_procurement: '直接采购合同',
}

const storageMapping: Record<string, string> = {
  newasset: '新货仓库',
  recycle: '回收仓库',
  broken: '损坏存放仓库',
  damaged: '待报废仓库',
}

// 🌟 新增：用户状态反向映射（枚举→中文）——单一事实源
const USER_STATUS_DISPLAY_MAPPING: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: '在职',
  [EmployeeStatus.LEFT]: '离职',
  [EmployeeStatus.RETIREMENT]: '退休',
}

// 用户状态映射（从单一事实源派生，保持向后兼容）
const userStatusMapping: Record<string, string> = Object.fromEntries(
  Object.entries(USER_STATUS_DISPLAY_MAPPING).map(([k, v]) => [k, v + '员工']),
)
const getStatusDisplay = (status: string | undefined): string => {
  if (!status) return '未知'
  return userStatusMapping[status] ?? status
}

const physicalGradeMapping: Record<string, string> = {
  excellent: '全新',
  good: '良好',
  fair: '一般',
  poor: '较差',
}
const getPhysicalGradeDisplay = (grade: string | undefined): string => {
  if (!grade) return '-'
  return physicalGradeMapping[grade] ?? grade
}

// ✓中文/别名 后端需要的 key
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
// 🌟 新增：验证用户状态合法性校验
const validateUserStatus = (status: string): EmployeeStatus | null => {
  const normalizedStatus = status.trim().toLowerCase()
  return USER_STATUS_INPUT_MAPPING[normalizedStatus] || null
}
/** 表格字段字符串兜底（吸收 `|| ''` 分支税，语义与原表达式逐字等价） */
const orEmpty = (v: string | null | undefined): string => v || ''

// 🌟 新增：Excel用户数据转换+验证
const transformAndValidateExcelUser = (
  excelData: ExcelEmployeeData,
  departmentCodeMap: Record<string, string>, // 部门代码→部门名称映射
): ValidatedEmployeeData => {
  const result: ValidatedEmployeeData = {
    user_name: orEmpty(excelData.姓名),
    user_jobcode: orEmpty(excelData.工号),
    user_phone: orEmpty(excelData.电话),
    user_location: orEmpty(excelData.位置),
    user_status: '',
    user_department_code: orEmpty(excelData.部门代码),
    user_department_name: departmentCodeMap[excelData.部门代码 ?? ''] || '',
    user_description: orEmpty(excelData.描述),
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

const outassetTypeMapping: Record<string, string> = {
  receive: '领用',
  borrow: '借用',
  reissue: '重新发放',
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
//   retirement: '退休',
// }

// 解析Excel中的日期数据，转换为后端需要的格式 (YYYY-MM-DD)
// 确保始终返回字符串，不会返回null
const parseExcelDate = (dateStr: string): string | null => {
  // if (!dateStr) return null
  if (!dateStr) {
    // 返回一个默认日期或空字符串，具体取决于后端API的要求
    // 如果后端允许空日期，可以返回空字符串；否则返回一个默认日期
    return '' // 或者return '1970-01-01' 作为默认候
  }

  // 如果已经YYYY-MM-DD 格式，直接返回
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (dateRegex.test(dateStr)) {
    return dateStr
  }

  // 尝试解析各种可能的日期格式
  let date: Date | null = null

  // MM/DD/YYYY 或 DD/MM/YYYY 格式
  if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(dateStr)) {
    const parts = dateStr.split(/[\/\-]/)
    if (parts.length === 3) {
      const a = parseInt(parts[0], 10)
      // 第一个数 > 12 → 必为 DD/MM/YYYY；否则按 MM/DD/YYYY（美式）
      if (a > 12) {
        date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`)
      } else {
        date = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`)
      }
    }
  }
  // 尝试解析Excel序列号日期(数字形式)
  else if (/^\d+$/.test(dateStr) && parseInt(dateStr) > 1) {
    // Excel日期是从1900年1月1日开始计算的天数
    const excelDate = new Date(1900, 0, parseInt(dateStr) - 1)
    date = excelDate
  }
  // 尝试解析带有时区的ISO格式或其他常见格式
  else {
    date = new Date(dateStr)
  }

  // 验证日期是否有效
  if (date && !isNaN(date.getTime())) {
    // [M-33] 转换为YYYY-MM-DD 格式（收敢单源）
    // [M-15] Excel 日期序列号按本地日历解析（new Date(1900, 0, n) 无时刻语义），不走业务时区
    return toLocalDateString(date)
  }

  // return null
  // 如果日期无效，返回空字符串
  return ''
}

export {
  formatDate,
  formatDateTime,
  exactFormatDate,
  todayLocalISO,
  formatDateTimeFull,
  formatPrice,
  formatNumber,
  contractiInfoFormate,
  // typeCasting,
  // assetAppearanceMapping,
  assetCurrentStatusMapping,
  // assetUsingStatusMapping,
  contractTypeMapping,
  storageMapping,
  userStatusMapping,
  getStatusDisplay,
  physicalGradeMapping,
  getPhysicalGradeDisplay,
  USER_STATUS_INPUT_MAPPING,
  // 🌟 新增导出
  USER_STATUS_DISPLAY_MAPPING,
  validateUserStatus,
  transformAndValidateExcelUser,
  transformAndValidateExcelDepartment,
  outassetTypeMapping,
  // reverseUserStatusMapping,
  parseExcelDate,
}
