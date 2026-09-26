/**
 * 员工列表 Excel 导出（服务端导出）
 *
 * 【为什么改为服务端导出】原实现在浏览器侧用 ExcelJS 组装全量数据：
 * 需用 `getList({ page_size: total })` 把全部员工拉进内存，受分页上限 100
 * 钳制，需 N 次请求；改为后端写盘 + 流式回传后浏览器只收到一个 xlsx。
 *
 * 【两处行为变更，均为收敛而非新增】
 * 1. 导出列不含手机号：后端 export_columns 刻意排除 employee_phone
 *    （批量落盘行为，最小化 PII 外泄面）。原前端列里有「电话」列。
 * 2. 不再需要 departmentStore：部门名称由后端沿关联字段带出，
 *    前端无需再拉全量部门 code 到 name 的映射表。
 *
 * 【可见性】由后端 EmployeeViewSet.get_export_queryset() 决定，默认与列表同源；
 * 导出权限走 CanExportExcel 矩阵（regular_user 403）。
 *
 * 【筛选口径 BF-047 已闭环】本批导出**跟随当前可见范围**：
 * 搜索态转发 store 的当前搜索词（后端 /users/employees/export/ 与列表、/search/
 * 共用 `_filtered_employee_queryset` 口径），普通列表态不带参数导全量。
 * 搜索词由 usePaginationSearchState.onSearchStateChange 单点写入 userStore
 * （含清空搜索态），故此处只读不解析，DR-1。
 *
 * 【仍存限制 BF-048】导出为**全公司口径**，未做行级数据权限过滤：
 * 有导出权限的部门经理可导出全部员工档案。属独立安全待办，不在此处伪装成已修复。
 */
import { useServerExcelExport } from '@/composables/useServerExcelExport'
import { userAPI } from '@/api/user'
import { useUserCurrentKeyword } from '@/stores/userStore'
import type { EmployeeExtended } from '@/types/user'

/** 用户导出依赖的 store 最小接口 */
interface UserExportStore {
  list: EmployeeExtended[]
  pagination: { total: number }
}

/** 创建用户列表导出函数 handleExportExcel() */
export function createUserExcelExport(userStore: UserExportStore) {
  const { exportFromServer } = useServerExcelExport()
  const currentKeyword = useUserCurrentKeyword()

  return async function handleExportExcel() {
    const keyword = currentKeyword.value
    await exportFromServer({
      entityName: '员工',
      totalCount: userStore.pagination.total,
      fetchExport: (params) => userAPI.exportExcel(params),
      // limit/offset 由 useServerExcelExport 按 EXPORT_MAX_ROWS 叠加，此处只补业务筛选参数
      params: keyword ? { keyword } : {},
    })
  }
}
