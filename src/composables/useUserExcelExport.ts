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
 * 【可见性】由后端 EmployeeViewSet.get_queryset() 决定，与列表一致；
 * 导出权限走 CanExportExcel 矩阵（regular_user 403）。
 *
 * 【已知限制 BF-047】本批导出**不带筛选条件**：后端员工导出未接收
 * department_code / employee_status / search，与列表的筛选态不对齐。
 * 原因有二：① 列表搜索态由 SmartListContainer 内部持有，组件侧取不到；
 * ② 后端 EmployeeViewSet 导出未接 request 级过滤（已批准范围不含此项）。
 * 故这里刻意不提供 getFilters 入口 —— 与其留一个「看起来生效其实不生效」
 * 的参数，不如显式声明限制并登记待办。
 */
import { useServerExcelExport } from '@/composables/useServerExcelExport'
import { userAPI } from '@/api/user'
import type { EmployeeExtended } from '@/types/user'

/** 用户导出依赖的 store 最小接口 */
interface UserExportStore {
  list: EmployeeExtended[]
  pagination: { total: number }
}

/** 创建用户列表导出函数 handleExportExcel() */
export function createUserExcelExport(userStore: UserExportStore) {
  const { exportFromServer } = useServerExcelExport()

  return async function handleExportExcel() {
    await exportFromServer({
      entityName: '员工',
      totalCount: userStore.pagination.total,
      fetchExport: (params) => userAPI.exportExcel(params),
    })
  }
}
