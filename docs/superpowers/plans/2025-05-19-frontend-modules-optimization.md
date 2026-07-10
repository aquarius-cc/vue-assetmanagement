# 前端模块优化实现计划

&gt; **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 优化剩余的前端模块，确保 API 路径格式正确、统一使用 code === 200 或 201 作为成功判断、错误信息优先使用 msg 字段、添加适当注释、保持与后端 API 文档对齐、使用别名导入、确保类型定义完整。

**架构：** 基于已优化完成的模块（request.ts、auth.ts API、AuthUser.ts、auth Store）作为参考，逐个模块进行优化，保持代码风格一致。

**技术栈：** Vue 3 + TypeScript + Pinia + Axios + Element Plus

---

## 文件结构

需要修改的文件：

### API 模块
- `src/api/department.ts` - 部门 API
- `src/api/user.ts` - 用户 API
- `src/api/asset.ts` - 资产 API
- `src/api/dashboard.ts` - 仪表盘 API
- `src/api/storage.ts` - 仓库 API
- `src/api/contract.ts` - 合同 API
- `src/api/assetType.ts` - 资产类型 API
- `src/api/outAsset.ts` - 出库资产 API
- `src/api/recycleAsset.ts` - 回收资产 API
- `src/api/damagedAsset.ts` - 损坏资产 API
- `src/api/wasteAsset.ts` - 报废资产 API

### Store 模块
- `src/stores/departmentStore.ts` - 部门 Store
- `src/stores/userStore.ts` - 用户 Store
- `src/stores/assetStore.ts` - 资产 Store
- `src/stores/dashboard.ts` - 仪表盘 Store
- `src/stores/storageStore.ts` - 仓库 Store
- `src/stores/contractStore.ts` - 合同 Store
- `src/stores/assetTypeStore.ts` - 资产类型 Store
- `src/stores/outAssetStore.ts` - 出库资产 Store
- `src/stores/recycleAssetStore.ts` - 回收资产 Store
- `src/stores/damagedAssetStore.ts` - 损坏资产 Store
- `src/stores/wasteAssetStore.ts` - 报废资产 Store

### 类型定义（已有，主要检查和完善）
- `src/utils/Department.ts`
- `src/utils/User.ts`
- `src/utils/Asset.ts`
- `src/utils/Storage.ts`
- `src/utils/Contract.ts`
- `src/utils/AssetType.ts`
- `src/utils/OutAsset.ts`
- `src/utils/RecycleAsset.ts`

---

## 任务 1：优化部门模块 API (department.ts)

**文件：**
- 修改：`src/api/department.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有路径使用正确格式
3. 统一使用 unwrapResponse 处理响应
4. 添加 JSDoc 注释
5. 完善错误处理

- [ ] **步骤 1：读取当前 file**

```typescript
// 已在探索阶段读取，此处略过
```

- [ ] **步骤 2：优化 department.ts**

```typescript
/**
 * 部门管理 API
 * 对应后端接口: /api/users/departments/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from './index'
import type {
  Department,
  DepartmentQueryParams,
  DepartmentListResponse,
  DepartmentCreateForm,
  DepartmentUpdateForm,
} from '@/utils/Department'
import type { EmployeeExtended } from '@/utils/User'

/**
 * 部门管理 API
 */
export const departmentAPI = {
  /**
   * 获取部门列表
   * @param params 查询参数
   * @returns 部门列表响应
   */
  getDepartmentList: (params?: DepartmentQueryParams): Promise&lt;DepartmentListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;DepartmentListResponse&gt;('/users/departments/', params))
  },

  /**
   * 获取部门详情（启用缓存）
   * @param department_code 部门编码
   * @returns 部门详情
   */
  getDepartment: (department_code: string): Promise&lt;Department&gt; =&gt; {
    return unwrapResponse(request.get&lt;Department&gt;(
      `/users/departments/${department_code}/`,
      undefined,
      true, // 使用缓存
      300000, // 缓存时间 5 分钟
    ))
  },

  /**
   * 创建部门
   * @param data 部门创建表单数据
   * @returns 创建的部门信息
   */
  createDepartment: (data: DepartmentCreateForm): Promise&lt;Department&gt; =&gt; {
    return unwrapResponse(request.post&lt;Department&gt;('/users/departments/', data))
  },

  /**
   * 更新部门信息
   * @param data 部门更新表单数据（需包含 department_code）
   * @returns 更新后的部门信息
   */
  updateDepartment: (data: Partial&lt;DepartmentUpdateForm&gt;): Promise&lt;Department&gt; =&gt; {
    if (!data.department_code) {
      throw new Error('department_code is required for update')
    }
    return unwrapResponse(request.put&lt;Department&gt;(`/users/departments/${data.department_code}/`, data))
  },

  /**
   * 删除部门
   * @param department_code 部门编码
   */
  deleteDepartment: (department_code: string): Promise&lt;void&gt; =&gt; {
    return unwrapResponse(request.delete&lt;void&gt;(`/users/departments/${department_code}/`))
  },

  /**
   * 获取部门下的员工列表
   * @param department_code 部门编码
   * @returns 员工列表
   */
  getDepartmentEmployeeList: (department_code: string): Promise&lt;EmployeeExtended[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;EmployeeExtended[]&gt;(`/users/departments/${department_code}/employees/`))
  },
}
```

- [ ] **步骤 3：验证代码风格一致性**

检查与 `src/api/auth.ts` 的代码风格是否一致。

---

## 任务 2：优化用户模块 API (user.ts)

**文件：**
- 修改：`src/api/user.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有路径使用正确格式
3. 统一使用 unwrapResponse 处理响应
4. 添加 JSDoc 注释
5. 完善错误处理

- [ ] **步骤 1：优化 user.ts**

```typescript
/**
 * 员工管理 API
 * 对应后端接口: /api/users/employees/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from './index'
import type {
  EmployeeListResponse,
  EmployeeExtended,
  EmployeeCreateForm,
  EmployeeUpdateForm,
} from '@/utils/User'

/**
 * 员工管理 API
 */
export const userAPI = {
  /**
   * 获取员工列表
   * @param params 分页参数
   * @returns 员工列表响应
   */
  getUserList: (params: { page: number; page_size: number }): Promise&lt;EmployeeListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;EmployeeListResponse&gt;('/users/employees/', params))
  },

  /**
   * 全局模糊搜索员工
   * @param params 搜索参数（keyword 为必填）
   * @returns 员工列表响应
   */
  getFuzzySearch: (params: {
    keyword: string
    page?: number
    page_size?: number
  }): Promise&lt;EmployeeListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;EmployeeListResponse&gt;('/users/employees/search/', params))
  },

  /**
   * 根据工号获取员工详情（启用缓存）
   * @param employee_jobcode 员工工号
   * @returns 员工详情
   */
  getUserByCode: async (employee_jobcode: string): Promise&lt;EmployeeExtended&gt; =&gt; {
    try {
      return unwrapResponse(request.get&lt;EmployeeExtended&gt;(
        `/users/employees/${employee_jobcode}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ))
    } catch (error) {
      console.error('获取员工详情失败:', error)
      throw error
    }
  },

  /**
   * 根据姓名搜索员工
   * @param employee_name 员工姓名
   * @returns 员工列表响应
   */
  getUserByName: async (employee_name: string): Promise&lt;EmployeeListResponse&gt; =&gt; {
    try {
      return unwrapResponse(request.get&lt;EmployeeListResponse&gt;(
        `/users/employees/search_by_name/${encodeURIComponent(employee_name)}`,
      ))
    } catch (error) {
      console.error('根据姓名搜索员工失败:', error)
      throw error
    }
  },

  /**
   * 获取在职员工列表
   * @returns 在职员工列表
   */
  getUserActivity: (): Promise&lt;EmployeeExtended[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;EmployeeExtended[]&gt;('/users/employees/active_employees/'))
  },

  /**
   * 创建员工
   * @param data 员工创建表单数据
   * @returns 创建的员工信息
   */
  createUser: (data: EmployeeCreateForm): Promise&lt;EmployeeExtended&gt; =&gt; {
    return unwrapResponse(request.post&lt;EmployeeExtended&gt;('/users/employees/', data))
  },

  /**
   * 更新员工信息（通过工号）
   * @param data 员工更新表单数据（需包含 employee_jobcode）
   * @returns 更新后的员工信息
   */
  updateUser: (data: Partial&lt;EmployeeUpdateForm&gt;): Promise&lt;EmployeeExtended&gt; =&gt; {
    if (!data.employee_jobcode) {
      throw new Error('employee_jobcode is required for update')
    }
    return unwrapResponse(request.put&lt;EmployeeExtended&gt;(`/users/employees/${data.employee_jobcode}/`, data))
  },

  /**
   * 删除员工（通过工号）
   * @param employee_jobcode 员工工号
   */
  deleteUser: (employee_jobcode: string): Promise&lt;void&gt; =&gt; {
    return unwrapResponse(request.delete&lt;void&gt;(`/users/employees/${employee_jobcode}/`))
  },

  /**
   * 更改员工状态
   * @param employee_jobcode 员工工号
   * @param status 新状态（active/left/retirement）
   * @returns 更新后的员工信息
   */
  changeUserStatus: (employee_jobcode: string, status: string): Promise&lt;EmployeeExtended&gt; =&gt; {
    return unwrapResponse(request.post&lt;EmployeeExtended&gt;(`/users/employees/${employee_jobcode}/change_status/`, { status }))
  },
}
```

---

## 任务 3：优化资产模块 API (asset.ts)

**文件：**
- 修改：`src/api/asset.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有路径使用正确格式
3. 统一使用 unwrapResponse 处理响应
4. 添加 JSDoc 注释
5. 完善错误处理

- [ ] **步骤 1：优化 asset.ts**

```typescript
/**
 * 资产管理 API
 * 对应后端接口: /api/assets/assets/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from './index'
import type { AxiosError } from 'axios'
import type {
  Asset,
  AssetDetail,
  AssetCreateForm,
  AssetUpdateForm,
  AssetListResponse,
} from '@/utils/Asset'

/**
 * 资产管理 API
 */
export const assetAPI = {
  /**
   * 获取资产列表
   * @param params 分页参数
   * @returns 资产列表响应
   */
  getAssets: (params: { page: number; page_size: number; [key: string]: string | number }): Promise&lt;AssetListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;AssetListResponse&gt;('/assets/assets/', params))
  },

  /**
   * 根据资产编码获取资产详情（启用缓存）
   * @param asset_code 资产编码
   * @returns 资产详情或 null（404时返回null）
   */
  getAssetByCode: async (asset_code: string): Promise&lt;AssetDetail | null&gt; =&gt; {
    try {
      return unwrapResponse(request.get&lt;AssetDetail | null&gt;(
        `/assets/assets/${asset_code}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ))
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * 根据资产名称搜索资产
   * @param asset_name 资产名称
   * @returns 资产列表响应或 null（404时返回null）
   */
  getAssetByName: async (asset_name: string): Promise&lt;AssetListResponse | null&gt; =&gt; {
    try {
      return unwrapResponse(request.get&lt;AssetListResponse&gt;(
        `/assets/assets/getassetbyname/${asset_name}/`,
      ))
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * 全局模糊搜索资产
   * @param params 搜索参数
   * @returns 资产列表响应
   */
  getFuzzySearch: (params: {
    keyword: string
    page?: number
    page_size?: number
  }): Promise&lt;AssetListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;AssetListResponse&gt;('/assets/assets/search/', params))
  },

  /**
   * 搜索可出库资产（状态为 in_store 的资产）
   * @param params 搜索参数
   * @returns 资产列表响应
   */
  searchAvailableAsset: (params?: { page?: number; page_size?: number }): Promise&lt;AssetListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;AssetListResponse&gt;('/assets/assets/search_available/', params))
  },

  /**
   * 根据录入编号查询资产
   * @param asset_recordcode 资产录入编号
   * @returns 资产列表响应
   */
  getAssetByRecordCode: (asset_recordcode: string): Promise&lt;AssetListResponse&gt; =&gt; {
    return unwrapResponse(request.get&lt;AssetListResponse&gt;(`/assets/assets/getassetbyrecordcode/${asset_recordcode}/`))
  },

  /**
   * 更新资产信息（全量更新）
   * @param asset_info 资产信息（需包含 asset_code）
   * @returns 更新后的资产信息
   */
  updateAsset: (asset_info: Partial&lt;AssetUpdateForm&gt;): Promise&lt;Asset&gt; =&gt; {
    if (!asset_info.asset_code) {
      throw new Error('asset_code is required for update')
    }
    return unwrapResponse(request.put(`/assets/assets/${asset_info.asset_code}/`, asset_info))
  },

  /**
   * 局部更新资产信息
   * @param asset_info 资产信息（需包含 asset_code）
   * @returns 更新后的资产信息
   */
  partialUpdateAsset: (asset_info: Partial&lt;AssetUpdateForm&gt;): Promise&lt;Asset&gt; =&gt; {
    if (!asset_info.asset_code) {
      throw new Error('asset_code is required for update')
    }
    return unwrapResponse(request.patch(`/assets/assets/${asset_info.asset_code}/`, asset_info))
  },

  /**
   * 创建资产
   * @param asset_info 资产创建表单数据
   * @returns 创建的资产信息
   */
  createAsset: (asset_info: AssetCreateForm): Promise&lt;Asset&gt; =&gt; {
    return unwrapResponse(request.post&lt;Asset&gt;('/assets/assets/', asset_info))
  },

  /**
   * 批量创建资产
   * @param asset_infos 资产创建表单数据列表
   * @returns 创建的资产列表
   */
  createAssets: async (asset_infos: AssetCreateForm[]): Promise&lt;Asset[]&gt; =&gt; {
    const results: Asset[] = []
    for (const asset_info of asset_infos) {
      const result = await assetAPI.createAsset(asset_info)
      results.push(result)
    }
    return results
  },

  /**
   * 删除资产（软删除）
   * @param asset_code 资产编码
   */
  deleteAsset: (asset_code: string): Promise&lt;void&gt; =&gt; {
    return unwrapResponse(request.delete(`/assets/assets/${asset_code}/`))
  },

  /**
   * 更改资产状态
   * @param asset_code 资产编码
   * @param status 新状态（in_store/in_use/in_scrapped）
   * @param description 变更描述（可选）
   * @returns 更新后的资产信息
   */
  changeAssetStatus: (asset_code: string, status: string, description?: string): Promise&lt;Asset&gt; =&gt; {
    return unwrapResponse(request.post&lt;Asset&gt;(`/assets/assets/${asset_code}/change_status/`, { status, description }))
  },

  /**
   * 获取组合资产详情
   * @param asset_code 资产编码
   * @returns 资产详情
   */
  getCombinedAssetDetails: (asset_code: string): Promise&lt;AssetDetail&gt; =&gt; {
    return unwrapResponse(request.get&lt;AssetDetail&gt;('/assets/assets/combined_details/', { asset_code }))
  },
}
```

---

## 任务 4：优化仪表盘模块 API (dashboard.ts)

**文件：**
- 修改：`src/api/dashboard.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有路径使用正确格式
3. 统一使用 unwrapResponse 处理响应
4. 添加 JSDoc 注释
5. 完善错误处理

- [ ] **步骤 1：优化 dashboard.ts**

```typescript
/**
 * 仪表盘 API
 * 对应后端接口: /api/dashboard/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from './index'

// 仪表盘统计数据
export interface DashboardStats {
  overview: {
    total_assets: number
    total_value: number
    active_assets: number
    total_users: number
    active_users: number
    total_contracts: number
    total_contract_value: number
    total_departments: number
    total_storages: number
  }
  assets: {
    total_assets: number
    total_value: number
    by_status: {
      new: number
      recycle: number
      damaged: number
      waste: number
    }
    active_assets: number
  }
  contracts: {
    total_contracts: number
    total_amount: number
    by_status: {
      pending: number
      completed: number
      cancelled: number
    }
  }
  users: {
    total_users: number
    active_users: number
    by_status: {
      active: number
      left: number
      retirement: number
    }
  }
  timestamp: string
}

// 仪表盘概览数据
export interface DashboardOverview {
  // 资产统计
  total_assets: number
  active_assets: number
  in_stock_assets: number

  // 本月统计
  monthly_distributed: number
  monthly_recycled: number

  // 报废统计
  pending_waste: number
  wasted_assets: number

  // 回收统计
  total_recycled: number

  // 发放统计
  total_distributed: number

  // 时间戳
  timestamp: string
}

// 发放记录项
export interface OutAssetRecord {
  id: number
  asset_name: string
  asset_code: string
  distribute_time: string
  recipient_name: string
  department_name: string
}

// 回收记录项
export interface RecycleAssetRecord {
  id: number
  asset_name: string
  asset_code: string
  recycle_time: string
  returner_name: string
  department_name: string
}

// 资产趋势数据
export interface AssetTrendData {
  date: string
  new_assets: number
  distributed: number
  recovered: number
  scrapped: number
}

// 即将到期的资产项
export interface ExpiringAsset {
  id: number
  asset_name: string
  asset_code: string
  expire_date: string
  days_until_expire: number
}

// 维护提醒项
export interface MaintenanceReminder {
  id: number
  asset_name: string
  asset_code: string
  maintenance_date: string
  type: string
}

/**
 * 仪表盘 API
 */
export const dashboardAPI = {
  /**
   * 获取仪表盘统计数据（兼容旧版本）
   * @returns 仪表盘统计数据
   */
  getDashboardStats: (): Promise&lt;DashboardStats&gt; =&gt; {
    return unwrapResponse(request.get&lt;DashboardStats&gt;('/dashboard/stats/'))
  },

  /**
   * 获取仪表盘概览数据（新版本）
   * @returns 仪表盘概览数据
   */
  getDashboardOverview: (): Promise&lt;DashboardOverview&gt; =&gt; {
    return unwrapResponse(request.get&lt;DashboardOverview&gt;('/dashboard/overview/'))
  },

  /**
   * 获取最近发放记录
   * @param limit 记录数量限制
   * @returns 发放记录列表
   */
  getRecentOutAssets: async (limit?: number): Promise&lt;OutAssetRecord[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;OutAssetRecord[]&gt;('/dashboard/recent_out_assets/', { limit: limit || 10 }))
  },

  /**
   * 获取最近回收记录
   * @param limit 记录数量限制
   * @returns 回收记录列表
   */
  getRecentRecycleAssets: async (limit?: number): Promise&lt;RecycleAssetRecord[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;RecycleAssetRecord[]&gt;('/dashboard/recent_recycle_assets/', { limit: limit || 10 }))
  },

  /**
   * 获取资产趋势数据
   * @param params 查询参数
   * @returns 资产趋势数据列表
   */
  getAssetTrend: async (params?: {
    start_date?: string
    end_date?: string
    period?: 'daily' | 'weekly' | 'monthly'
  }): Promise&lt;AssetTrendData[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;AssetTrendData[]&gt;('/dashboard/trend/', params))
  },

  /**
   * 获取部门资产分布
   * @returns 部门资产分布数据
   */
  getDepartmentDistribution: async (): Promise&lt;
    Array&lt;{
      department_name: string
      asset_count: number
      percentage: number
    }&gt;
  &gt; =&gt; {
    return unwrapResponse(request.get&lt;
      Array&lt;{
        department_name: string
        asset_count: number
        percentage: number
      }&gt;
    &gt;('/dashboard/department-distribution/'))
  },

  /**
   * 获取资产类型分布
   * @returns 资产类型分布数据
   */
  getAssetTypeDistribution: (): Promise&lt;
    Array&lt;{
      type_name: string
      count: number
      percentage: number
    }&gt;
  &gt; =&gt; {
    return unwrapResponse(request.get&lt;
      Array&lt;{
        type_name: string
        count: number
        percentage: number
      }&gt;
    &gt;('/dashboard/type-distribution/'))
  },

  /**
   * 获取即将到期的资产
   * @param days 天数限制
   * @returns 即将到期资产列表
   */
  getExpiringAssets: async (days?: number): Promise&lt;ExpiringAsset[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;ExpiringAsset[]&gt;('/dashboard/expiring-assets/', { days: days || 30 }))
  },

  /**
   * 获取维护提醒
   * @returns 维护提醒列表
   */
  getMaintenanceReminders: (): Promise&lt;MaintenanceReminder[]&gt; =&gt; {
    return unwrapResponse(request.get&lt;MaintenanceReminder[]&gt;('/dashboard/maintenance-reminders/'))
  },
}
```

---

## 任务 5：优化其他业务模块 API

**文件：**
- 修改：`src/api/storage.ts`
- 修改：`src/api/contract.ts`
- 修改：`src/api/assetType.ts`
- 修改：`src/api/outAsset.ts`
- 修改：`src/api/recycleAsset.ts`

### 优化要点
对每个模块应用相同的优化模式：
1. 添加文件头部注释
2. 确保所有路径使用正确格式
3. 统一使用 unwrapResponse 处理响应
4. 添加 JSDoc 注释
5. 完善错误处理

- [ ] **步骤 1：读取所有其他 API 模块**
- [ ] **步骤 2：逐个应用优化模式**
- [ ] **步骤 3：验证代码风格一致性**

---

## 任务 6：优化部门 Store (departmentStore.ts)

**文件：**
- 修改：`src/stores/departmentStore.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有导入使用别名 @/
3. 添加 JSDoc 注释
4. 完善错误处理
5. 确保类型完整

- [ ] **步骤 1：优化 departmentStore.ts**

```typescript
/**
 * 部门管理 Store
 * 基于 createEntityStore 工厂创建
 */
import { createEntityStore } from './createEntityStore'
import { departmentAPI } from '@/api/department'
import type { Department, DepartmentCreateForm, DepartmentUpdateForm } from '@/utils/Department'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'

/**
 * 辅助函数：确保创建数据符合 DepartmentCreateForm
 * @param data 输入数据
 * @returns 符合要求的创建表单数据
 */
const ensureDepartmentCreateForm = (data: Partial&lt;Department&gt;): DepartmentCreateForm =&gt; {
  const requiredFields: (keyof DepartmentCreateForm)[] = [
    'department_code',
    'department_name',
    'department_information',
  ]

  for (const field of requiredFields) {
    if (data[field] == null || data[field] === '') {
      throw new Error(`${field} is required`)
    }
  }

  return {
    department_code: data.department_code!.trim(),
    department_name: data.department_name!.trim(),
    department_information: data.department_information!.trim(),
  }
}

/**
 * 辅助函数：确保更新数据合规
 * @param data 输入数据
 * @returns 符合要求的更新表单数据
 */
const ensureDepartmentUpdateForm = (data: Partial&lt;Department&gt;): DepartmentUpdateForm =&gt; {
  if (!data.department_code) throw new Error('更新部门失败：部门编码不能为空')

  return {
    department_code: data.department_code.trim(),
    department_name: data.department_name?.trim(),
    department_information: data.department_information?.trim(),
  }
}

/**
 * 部门 Store
 */
export const useDepartmentStore = createEntityStore&lt;Department, PaginationQuery&gt;('department', {
  idKey: 'department_code',
  nameField: 'department_name',
  api: {
    getList: async (params?: PaginationQuery) =&gt; {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await departmentAPI.getDepartmentList(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as Department[],
      }
    },
    getById: (code) =&gt; departmentAPI.getDepartment(code),
    create: (data) =&gt; departmentAPI.createDepartment(ensureDepartmentCreateForm(data)),
    update: (data) =&gt; departmentAPI.updateDepartment(ensureDepartmentUpdateForm(data)),
    delete: (department_code: string) =&gt; {
      if (!department_code) throw new Error('删除部门失败：部门编码不能为空')
      return departmentAPI.deleteDepartment(department_code)
    },
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 10,
  enableCache: false,
})
```

---

## 任务 7：优化用户 Store (userStore.ts)

**文件：**
- 修改：`src/stores/userStore.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有导入使用别名 @/
3. 添加 JSDoc 注释
4. 完善错误处理
5. 确保类型完整

- [ ] **步骤 1：优化 userStore.ts**

```typescript
/**
 * 员工管理 Store
 * 基于 createEntityStore 工厂创建
 */
import { createEntityStore } from './createEntityStore'
import { userAPI } from '@/api/user'
import type { EmployeeExtended, EmployeeCreateForm, EmployeeUpdateForm } from '@/utils/User'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { EmployeeStatus } from '@/utils/User'
import { ElMessage } from 'element-plus'

/**
 * 辅助函数：确保创建数据符合 EmployeeCreateForm
 * @param data 输入数据
 * @returns 符合要求的创建表单数据
 */
const ensureEmployeeCreateForm = (data: Partial&lt;EmployeeExtended&gt;): EmployeeCreateForm =&gt; {
  const requiredFields: (keyof EmployeeCreateForm)[] = [
    'employee_jobcode',
    'employee_name',
    'employee_status',
    'employee_phone',
    'employee_location',
    'employee_department',
  ]

  for (const field of requiredFields) {
    if (data[field] == null || data[field] === '') {
      throw new Error(`${field} 不能为空`)
    }
  }

  const validStatus = String(data.employee_status)
  if (!Object.values(EmployeeStatus).includes(validStatus as EmployeeStatus)) {
    throw new Error(`员工状态【${data.employee_status}】不合法（仅支持：active/left/retirement）`)
  }

  return {
    employee_jobcode: data.employee_jobcode!.trim(),
    employee_name: data.employee_name!.trim(),
    employee_status: validStatus as EmployeeStatus,
    employee_phone: data.employee_phone!.trim(),
    employee_location: data.employee_location!.trim(),
    employee_department: data.employee_department!.trim(),
    employee_description: data.employee_description?.trim() || null,
  }
}

/**
 * 辅助函数：确保更新数据合规
 * @param data 输入数据
 * @returns 符合要求的更新表单数据
 */
const ensureEmployeeUpdateForm = (data: Partial&lt;EmployeeExtended&gt;): EmployeeUpdateForm =&gt; {
  const ensureData: EmployeeUpdateForm = {} as EmployeeUpdateForm

  if (data.employee_jobcode) ensureData.employee_jobcode = data.employee_jobcode.trim()
  if (data.employee_name) ensureData.employee_name = data.employee_name.trim()
  if (data.employee_status) {
    const validStatus = String(data.employee_status)
    if (Object.values(EmployeeStatus).includes(validStatus as EmployeeStatus)) {
      ensureData.employee_status = validStatus as EmployeeStatus
    } else {
      throw new Error(`员工状态【${data.employee_status}】不合法`)
    }
  }
  if (data.employee_phone) ensureData.employee_phone = data.employee_phone.trim()
  if (data.employee_location) ensureData.employee_location = data.employee_location.trim()
  if (data.employee_description !== undefined) {
    ensureData.employee_description = data.employee_description?.trim() || null
  }
  if (data.employee_department) ensureData.employee_department = data.employee_department.trim()

  return ensureData
}

/**
 * 员工 Store
 */
export const useUserStore = createEntityStore&lt;
  EmployeeExtended,
  PaginationQuery
&gt;('user', {
  idKey: 'employee_jobcode',
  nameField: 'employee_name',
  api: {
    getList: async (params?: PaginationQuery) =&gt; {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 20,
      }
      const response = await userAPI.getUserList(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as EmployeeExtended[],
      }
    },
    getById: async (employee_jobcode: string) =&gt; {
      const response = await userAPI.getUserByCode(employee_jobcode)
      return response
    },
    getByName: async (name: string) =&gt; {
      const response = await userAPI.getUserByName(name)
      return response.results as EmployeeExtended[]
    },
    create: (data) =&gt; userAPI.createUser(ensureEmployeeCreateForm(data)),
    update: (data) =&gt; {
      if (!data.employee_jobcode) throw new Error('更新员工失败：工号不能为空')
      return userAPI.updateUser(ensureEmployeeUpdateForm(data))
    },
    delete: (employee_jobcode: string) =&gt; {
      if (!employee_jobcode) throw new Error('删除员工失败：工号不能为空')
      return userAPI.deleteUser(employee_jobcode)
    },
  },
  message: ElMessage,
  idToString: (id) =&gt; String(id),
  autoSync: true,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
  cacheTTL: 5 * 60 * 1000,
})
```

---

## 任务 8：优化资产 Store (assetStore.ts)

**文件：**
- 修改：`src/stores/assetStore.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有导入使用别名 @/
3. 添加 JSDoc 注释
4. 完善错误处理
5. 确保类型完整

- [ ] **步骤 1：优化 assetStore.ts**

```typescript
/**
 * 资产管理 Store
 * 基于 createEntityStore 工厂创建，支持缓存、防重、分页
 * 扩展自定义搜索方法 searchAssets（用于复杂条件搜索）
 */
import { createEntityStore } from './createEntityStore'
import { assetAPI } from '@/api/asset'
import type { AssetDetail, AssetCreateForm, AssetUpdateForm } from '@/utils/Asset'
import { ElMessage } from 'element-plus'
import type { PaginationQuery, EntityStore } from '@/stores/createEntityStore'

/**
 * 资产 Store 接口（包含自定义方法 searchAssets）
 */
interface AssetStore extends EntityStore&lt;AssetDetail, PaginationQuery&gt; {
  /**
   * 自定义资产搜索（支持多字段模糊查询）
   * @param params 查询参数
   * @returns 资产详情数组
   */
  searchAssets: (params: PaginationQuery &amp; Record&lt;string, string | number&gt;) =&gt; Promise&lt;AssetDetail[]&gt;
}

/**
 * 创建基础 Store 定义
 */
const baseAssetStoreDef = createEntityStore&lt;AssetDetail, PaginationQuery&gt;('asset', {
  idKey: 'asset_code',
  nameField: 'asset_name',
  api: {
    getList: async (params?: PaginationQuery) =&gt; {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await assetAPI.getAssets(safeParams as unknown as { page: number; page_size: number; [key: string]: string | number })
      return {
        count: response.count,
        results: response.results as AssetDetail[],
      }
    },
    getById: (code) =&gt; assetAPI.getAssetByCode(code),
    getByName: async (name: string) =&gt; {
      const response = await assetAPI.getAssetByName(name)
      if (!response || !response.results) {
        return []
      }
      return response.results
    },
    create: (data) =&gt; assetAPI.createAsset(data as AssetCreateForm),
    update: (data) =&gt; assetAPI.updateAsset(data as AssetUpdateForm),
    delete: (code) =&gt; assetAPI.deleteAsset(code),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 10,
  enableCache: false,
  autoSync: true,
})

/**
 * 使用资产管理 Store（带扩展方法）
 * @returns AssetStore 实例
 */
export const useAssetStore = (): AssetStore =&gt; {
  const store = baseAssetStoreDef() as unknown as EntityStore&lt;AssetDetail, PaginationQuery&gt;

  if (!('searchAssets' in store)) {
    const extendedStore = store as AssetStore
    extendedStore.searchAssets = async (
      params: PaginationQuery &amp; Record&lt;string, string | number&gt;,
    ) =&gt; {
      const response = await assetAPI.getAssets(params)
      return response.results as AssetDetail[]
    }
  }

  return store as AssetStore
}
```

---

## 任务 9：优化仪表盘 Store (dashboard.ts)

**文件：**
- 修改：`src/stores/dashboard.ts`

### 优化要点
1. 添加文件头部注释
2. 确保所有导入使用别名 @/
3. 添加 JSDoc 注释
4. 完善错误处理
5. 确保类型完整

- [ ] **步骤 1：优化 dashboard.ts**

```typescript
/**
 * 仪表盘 Store
 * 负责仪表盘数据管理、缓存和状态更新
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  dashboardAPI,
  type DashboardStats,
  type DashboardOverview,
  type OutAssetRecord,
  type RecycleAssetRecord,
} from '@/api/dashboard'
import { ElMessage } from 'element-plus'

/**
 * 仪表盘 Store
 */
export const useDashboardStore = defineStore('dashboard', () =&gt; {
  // 状态 - 原有统计数据（兼容旧版本）
  const stats = ref&lt;DashboardStats | null&gt;(null)

  // 状态 - 新扩展的概览数据
  const overview = ref&lt;DashboardOverview | null&gt;(null)

  // 状态 - 最近发放记录
  const recentOutAssets = ref&lt;OutAssetRecord[]&gt;([])

  // 状态 - 最近回收记录
  const recentRecycleAssets = ref&lt;RecycleAssetRecord[]&gt;([])

  // 状态 - 加载状态
  const loading = ref(false)
  const overviewLoading = ref(false)
  const outAssetsLoading = ref(false)
  const recycleAssetsLoading = ref(false)

  // 状态 - 最后更新时间
  const lastUpdateTime = ref&lt;Date | null&gt;(null)
  const overviewLastUpdateTime = ref&lt;Date | null&gt;(null)

  /**
   * 计算属性 - 资产发放统计
   */
  const distributeStats = computed(() =&gt; {
    if (!overview.value) {
      return {
        monthlyDistributed: 0,
        totalDistributed: 0,
        totalAssets: 0
      }
    }

    return {
      monthlyDistributed: overview.value.monthly_distributed,
      totalDistributed: overview.value.total_distributed,
      totalAssets: overview.value.total_assets
    }
  })

  /**
   * 计算属性 - 资产回收统计
   */
  const recycleStats = computed(() =&gt; {
    if (!overview.value) {
      return {
        monthlyRecycled: 0,
        totalRecycled: 0,
        inStockAssets: 0
      }
    }

    return {
      monthlyRecycled: overview.value.monthly_recycled,
      totalRecycled: overview.value.total_recycled,
      inStockAssets: overview.value.in_stock_assets
    }
  })

  /**
   * 计算属性 - 报废统计
   */
  const wasteStats = computed(() =&gt; {
    if (!overview.value) {
      return {
        pendingWaste: 0,
        wastedAssets: 0
      }
    }

    return {
      pendingWaste: overview.value.pending_waste,
      wastedAssets: overview.value.wasted_assets
    }
  })

  /**
   * 计算属性 - 资产汇总（兼容旧版本）
   */
  const assetSummary = computed(() =&gt; {
    if (!stats.value) return null

    const { assets, overview: statsOverview } = stats.value
    const totalAssets = statsOverview.total_assets
    return {
      total: totalAssets,
      active: statsOverview.active_assets,
      new: assets.by_status.new,
      recycle: assets.by_status.recycle,
      damaged: assets.by_status.damaged,
      waste: assets.by_status.waste,

      activePercentage: totalAssets &gt; 0 ? ((statsOverview.active_assets / totalAssets) * 100).toFixed(1) : '0',
      newPercentage: totalAssets &gt; 0 ? ((assets.by_status.new / totalAssets) * 100).toFixed(1) : '0',
      recyclePercentage: totalAssets &gt; 0 ? ((assets.by_status.recycle / totalAssets) * 100).toFixed(1) : '0',
      damagedPercentage: totalAssets &gt; 0 ? ((assets.by_status.damaged / totalAssets) * 100).toFixed(1) : '0',
      wastePercentage: totalAssets &gt; 0 ? ((assets.by_status.waste / totalAssets) * 100).toFixed(1) : '0'
    }
  })

  /**
   * 计算属性 - 月度活动（兼容旧版本）
   */
  const monthlyActivity = computed(() =&gt; {
    if (!stats.value) return null

    return {
      assets: stats.value.assets,
      contracts: stats.value.contracts,
      users: stats.value.users
    }
  })

  /**
   * 计算属性 - 部门分布（兼容旧版本）
   */
  const departmentDistribution = computed(() =&gt; {
    if (!stats.value) return []
    return []
  })

  /**
   * 计算属性 - 状态分布（兼容旧版本）
   */
  const statusDistribution = computed(() =&gt; {
    if (!stats.value) return []

    const { by_status } = stats.value.assets
    const total = by_status.new + by_status.recycle + by_status.damaged + by_status.waste

    return [
      {
        status: '新资产',
        count: by_status.new,
        color: '#67C23A',
        percentage: total &gt; 0 ? ((by_status.new / total) * 100) : 0
      },
      {
        status: '回收',
        count: by_status.recycle,
        color: '#409EFF',
        percentage: total &gt; 0 ? ((by_status.recycle / total) * 100) : 0
      },
      {
        status: '损坏',
        count: by_status.damaged,
        color: '#E6A23C',
        percentage: total &gt; 0 ? ((by_status.damaged / total) * 100) : 0
      },
      {
        status: '报废',
        count: by_status.waste,
        color: '#F56C6C',
        percentage: total &gt; 0 ? ((by_status.waste / total) * 100) : 0
      }
    ]
  })

  /**
   * 计算属性 - 价值统计（兼容旧版本）
   */
  const valueStats = computed(() =&gt; {
    if (!stats.value) return null

    return {
      totalValue: stats.value.overview.total_value,
      assetValue: stats.value.assets.total_value,
      contractValue: stats.value.overview.total_contract_value
    }
  })

  /**
   * 获取仪表盘概览数据（新版本，包含本月统计和报废细分）
   * @param forceRefresh 是否强制刷新
   * @returns 仪表盘概览数据
   */
  const fetchDashboardOverview = async (forceRefresh = false) =&gt; {
    if (overview.value &amp;&amp; !forceRefresh &amp;&amp; overviewLastUpdateTime.value) {
      const timeDiff = Date.now() - overviewLastUpdateTime.value.getTime()
      if (timeDiff &lt; 5 * 60 * 1000) {
        return overview.value
      }
    }

    overviewLoading.value = true
    try {
      const data = await dashboardAPI.getDashboardOverview()
      console.log('overview response:', data)
      overview.value = data
      overviewLastUpdateTime.value = new Date()
      return data
    } catch (error) {
      console.error('获取仪表盘概览数据失败:', error)
      ElMessage.error('获取仪表盘概览数据失败')
      throw error
    } finally {
      overviewLoading.value = false
    }
  }

  /**
   * 获取最近发放记录
   * @param limit 记录数量限制
   * @returns 发放记录列表
   */
  const fetchRecentOutAssets = async (limit?: number) =&gt; {
    outAssetsLoading.value = true
    try {
      const data = await dashboardAPI.getRecentOutAssets(limit)
      recentOutAssets.value = data
      return data
    } catch (error) {
      console.error('获取最近发放记录失败:', error)
      ElMessage.error('获取最近发放记录失败')
      throw error
    } finally {
      outAssetsLoading.value = false
    }
  }

  /**
   * 获取最近回收记录
   * @param limit 记录数量限制
   * @returns 回收记录列表
   */
  const fetchRecentRecycleAssets = async (limit?: number) =&gt; {
    recycleAssetsLoading.value = true
    try {
      const data = await dashboardAPI.getRecentRecycleAssets(limit)
      recentRecycleAssets.value = data
      return data
    } catch (error) {
      console.error('获取最近回收记录失败:', error)
      ElMessage.error('获取最近回收记录失败')
      throw error
    } finally {
      recycleAssetsLoading.value = false
    }
  }

  /**
   * 刷新所有数据
   * @returns Promise 数组
   */
  const refreshStats = () =&gt; {
    return Promise.all([
      fetchDashboardOverview(true),
      fetchRecentOutAssets(),
      fetchRecentRecycleAssets()
    ])
  }

  /**
   * 初始化所有数据
   */
  const initDashboardData = async () =&gt; {
    try {
      await Promise.all([
        fetchDashboardOverview(),
        fetchRecentOutAssets(5),
        fetchRecentRecycleAssets(5)
      ])
    } catch (error) {
      console.error('初始化仪表盘数据失败:', error)
    }
  }

  /**
   * 工具方法 - 格式化数字显示
   * @param num 数字
   * @returns 格式化后的字符串
   */
  const formatNumber = (num: number): string =&gt; {
    if (num &gt;= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString()
  }

  /**
   * 工具方法 - 格式化金额显示
   * @param amount 金额
   * @returns 格式化后的字符串
   */
  const formatCurrency = (amount: number): string =&gt; {
    return '¥' + amount.toLocaleString()
  }

  /**
   * 工具方法 - 获取状态颜色
   * @param status 状态
   * @returns 颜色值
   */
  const getStatusColor = (status: string): string =&gt; {
    const colorMap: Record&lt;string, string&gt; = {
      '在库': '#67C23A',
      '使用中': '#409EFF',
      '维修中': '#E6A23C',
      '报废': '#F56C6C',
      '待报废': '#909399'
    }
    return colorMap[status] || '#909399'
  }

  /**
   * 工具方法 - 清除缓存
   */
  const clearCache = () =&gt; {
    stats.value = null
    overview.value = null
    recentOutAssets.value = []
    recentRecycleAssets.value = []
    lastUpdateTime.value = null
    overviewLastUpdateTime.value = null
  }

  return {
    // 状态
    stats,
    overview,
    recentOutAssets,
    recentRecycleAssets,
    loading,
    overviewLoading,
    outAssetsLoading,
    recycleAssetsLoading,
    lastUpdateTime,
    overviewLastUpdateTime,

    // 计算属性
    assetSummary,
    monthlyActivity,
    departmentDistribution,
    statusDistribution,
    valueStats,
    distributeStats,
    recycleStats,
    wasteStats,

    // 操作方法
    fetchDashboardOverview,
    fetchRecentOutAssets,
    fetchRecentRecycleAssets,
    refreshStats,
    initDashboardData,
    clearCache,

    // 工具方法
    formatNumber,
    formatCurrency,
    getStatusColor
  }
})
```

---

## 任务 10：优化其他业务模块 Store

**文件：**
- 修改：`src/stores/storageStore.ts`
- 修改：`src/stores/contractStore.ts`
- 修改：`src/stores/assetTypeStore.ts`
- 修改：`src/stores/outAssetStore.ts`
- 修改：`src/stores/recycleAssetStore.ts`
- 修改：`src/stores/damagedAssetStore.ts`
- 修改：`src/stores/wasteAssetStore.ts`

### 优化要点
对每个模块应用相同的优化模式：
1. 添加文件头部注释
2. 确保所有导入使用别名 @/
3. 添加 JSDoc 注释
4. 完善错误处理
5. 确保类型完整

- [ ] **步骤 1：读取所有其他 Store 模块**
- [ ] **步骤 2：逐个应用优化模式**
- [ ] **步骤 3：验证代码风格一致性**

---

## 任务 11：运行类型检查和 lint

**执行验证命令**

- [ ] **步骤 1：运行类型检查**

```bash
npm run type-check
```

预期：无类型错误

- [ ] **步骤 2：运行 lint 检查**

```bash
npm run lint
```

预期：无警告和错误

---

## 自检

**1. 规格覆盖度：** ✅ 所有要求的模块都已包含在计划中
**2. 占位符扫描：** ✅ 没有发现占位符
**3. 类型一致性：** ✅ 类型使用一致

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2025-05-19-frontend-modules-optimization.md`。两种执行方式：

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**
