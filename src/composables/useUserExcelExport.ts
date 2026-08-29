/**
 * 用户列表 Excel 导出逻辑（自 UserDetails.vue 的 handleExportExcel 物理提取，零逻辑变更）
 *
 * store 实例以参数注入；导出列配置、范围选择交互、大数据量确认、
 * 当前页/全量数据的分支处理均保持原实现。
 */
import { h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { showErrorMessage } from '@/utils/errorHandler'
import { USER_STATUS_INPUT_MAPPING } from '@/utils/Format'
import { exportToExcel, type ColumnConfig } from '@/utils/excelExporter'
import type { EmployeeExtended } from '@/types/user'

/** 用户导出依赖的 store 最小接口 */
interface UserExportStores {
  userStore: {
    list: EmployeeExtended[]
    pagination: { page: number; total: number }
    getList: (params: { page: number; page_size: number }) => Promise<EmployeeExtended[]>
  }
  departmentStore: {
    list: Array<{ department_code: string; department_name: string }>
  }
}

/** 创建用户列表导出函数 handleExportExcel() */
export function createUserExcelExport({ userStore, departmentStore }: UserExportStores) {
  return async function handleExportExcel() {
    // 创建部门映射，用于导出时显示部门名称
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

    // 询问用户希望导出哪种数据
    let userConfirmedCurrent = false
    let userRequestedAll = false

    try {
      const result = await ElMessageBox({
        title: '选择导出范围',
        message: h('div', null, [
          h('p', null, `当前页面显示 ${userStore.list.length} 条数据`),
          h('p', null, `总共有 ${userStore.pagination.total} 条数据`),
          h('br'),
          h('p', null, '请选择导出范围：'),
        ]),
        showCancelButton: true,
        confirmButtonText: '导出当前页面',
        cancelButtonText: '导出全部数据',
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
      })

      // 用户点击了确认按钮（导出当前页面）
      if (result === 'confirm') {
        userConfirmedCurrent = true
      }
    } catch (error) {
      // 检查错误是否是因为点击了取消按钮
      if (error === 'cancel') {
        // 用户点击了取消按钮（导出全部数据）
        userRequestedAll = true
      } else if (error === 'close') {
        // 用户关闭了对话框
        return
      } else {
        // 其他错误
        return
      }
    }

    let exportData: EmployeeExtended[]
    let exportFileName: string

    if (userConfirmedCurrent) {
      // 导出当前页面数据
      exportData = userStore.list
      exportFileName = `用户列表_当前页面_${userStore.pagination.page}_${userStore.list.length}条.xlsx`
    } else if (userRequestedAll) {
      // 用户选择导出全部数据
      try {
        ElMessage.info('正在获取全部数据...')

        // 获取所有数据（一次性获取全部，注意：如果数据量很大，可能需要分页获取）
        if (userStore.pagination.total > 1000) {
          const confirmLargeExport = await ElMessageBox.confirm(
            `数据量较大(${userStore.pagination.total}条)，可能会消耗较长时间和资源，是否继续？`,
            '确认导出',
            {
              confirmButtonText: '继续导出',
              cancelButtonText: '取消',
              type: 'warning',
            },
          ).catch(() => {
            return false
          })

          if (!confirmLargeExport) {
            return
          }
        }

        // 一次性获取全部数据
        const response = await userStore.getList({
          page: 1,
          page_size: userStore.pagination.total,
        })
        exportData = response
        exportFileName = `用户列表_全部_${response.length}条.xlsx`
      } catch (error) {
        showErrorMessage(error, '获取全部数据失败，请重试')
        return
      }
    } else {
      // 用户关闭对话框，取消操作
      return
    }

    // 使用通用导出工具
    await exportToExcel<EmployeeExtended>({
      data: exportData,
      columns: exportColumns,
      fileName: exportFileName,
      sheetName: '用户列表',
      confirmMessage: `确定要导出 ${exportData.length} 条用户数据吗？`,
      emptyMessage: '暂无用户数据可导出',
      successMessage: '用户数据导出成功',
      errorMessage: '用户数据导出失败，请重试',
      additionalData: { departmentMapping },
    })
  }
}
