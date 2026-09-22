/**
 * 用户列表 Excel 导出（DR-1：列配置 + 通用导出组装，流程收敛至 useExcelExport）
 *
 * store 实例以参数注入；部门映射以闭包供列 formatter 使用；范围选择/
 * 大数据确认/全量拉取等流程全部委托通用 exportList。
 */
import { useExcelExport } from '@/composables/useExcelExport'
import { USER_STATUS_INPUT_MAPPING } from '@/utils/Format'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { EmployeeExtended } from '@/types/user'

/** 用户导出依赖的 store 最小接口 */
interface UserExportStores {
  userStore: {
    list: EmployeeExtended[]
    pagination: { total: number }
    getList: (params: { page: number; page_size: number }) => Promise<EmployeeExtended[]>
  }
  departmentStore: {
    list: Array<{ department_code: string; department_name: string }>
  }
}

/** 创建用户列表导出函数 handleExportExcel() */
export function createUserExcelExport({ userStore, departmentStore }: UserExportStores) {
  const { exportList } = useExcelExport()

  return async function handleExportExcel() {
    // 创建部门映射，用于导出时显示部门名称（列 formatter 闭包消费）
    const departmentMapping = departmentStore.list.reduce<Record<string, string>>((acc, dept) => {
      acc[dept.department_code] = dept.department_name
      return acc
    }, {})

    // 定义导出列配置
    const exportColumns: ColumnConfig<EmployeeExtended>[] = [
      { title: '姓名', key: 'employee_name', default: '未填写' },
      { title: '工号', key: 'employee_jobcode', default: '未设置' },
      {
        title: '状态',
        key: 'employee_status',
        default: '未知',
        formatter: (value: unknown) =>
          USER_STATUS_INPUT_MAPPING[String(value)] || String(value) || '未知',
      },
      { title: '电话', key: 'employee_phone', default: '未填写' },
      { title: '位置', key: 'employee_location', default: '未填写' },
      { title: '部门代码', key: 'employee_department_code', default: 'JTGS' },
      {
        title: '部门',
        key: 'employee_department_name',
        default: '无部门',
        formatter: (value: unknown, row: EmployeeExtended) => {
          // 如果员工数据中有完整的部门对象，则使用其名称
          if (
            value &&
            typeof value === 'object' &&
            'department_name' in value &&
            (value as { department_name?: string }).department_name
          ) {
            return (value as { department_name: string }).department_name
          }
          // 否则通过部门代码查找部门名称
          return departmentMapping[row.employee_department_code] || '无部门'
        },
      },
      { title: '描述', key: 'employee_description', default: '无' },
    ]

    await exportList<EmployeeExtended>({
      entityName: '用户',
      columns: exportColumns,
      currentData: userStore.list,
      totalCount: userStore.pagination.total,
      fetchAllData: () => userStore.getList({ page: 1, page_size: userStore.pagination.total }),
      sheetName: '用户列表',
    })
  }
}
