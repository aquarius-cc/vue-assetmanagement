# RecycleAssetBasicDetails 卡片化重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 RecycleAssetBasicDetails.vue 从单卡片布局重构为 5 个语义卡片，通过关联查询填充数据，复用 InfoCard 组件

**架构：** 新建 useRecycleAssetDetailCards composable（接收主详情+4个关联数据，返回5个 InfoCardConfig）→ 重构页面模板和脚本（Promise.all 并行加载关联数据）→ 验证

**技术栈：** Vue 3 + TypeScript + Element Plus + Pinia

---

## 文件清单

| 文件 | 变更类型 | 职责 |
|------|---------|------|
| `src/composables/useRecycleAssetDetailCards.ts` | **新建** | 数据驱动生成 5 个 InfoCardConfig |
| `src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue` | 修改 | 使用 InfoCard + composable 重构模板，新增 Promise.all 关联查询 |

---

## 任务 1：新建 useRecycleAssetDetailCards composable

**文件：**
- 新建：`src/composables/useRecycleAssetDetailCards.ts`

**前置条件：** 无（InfoCard.vue 和 info-card.ts 已在前序任务中扩展）

- [ ] **步骤 1：确认 Contract 类型可用**

  运行：`node -e "const {Contract} = require('./src/utils/Contract.ts'); console.log('Contract type exists')"`
  预期：不报错（或手动检查 `src/utils/Contract.ts` 存在）

- [ ] **步骤 2：创建 composable 文件**

  新建 `src/composables/useRecycleAssetDetailCards.ts`，内容如下：

  ```ts
  /**
   * useRecycleAssetDetailCards.ts
   * 回收资产详情卡片配置 composable
   *
   * @module composables/useRecycleAssetDetailCards
   * @description 根据回收资产详情数据及其关联数据，生成 5 个 InfoCardConfig 配置对象，
   * 用于驱动 InfoCard 组件展示基本信息、合同信息、使用人信息、回收人信息、仓库信息。
   */

  import { computed, type Ref } from 'vue'
  import type { InfoCardConfig } from '@/types/info-card'
  import type { RecycleAssetExtended } from '@/utils/RecycleAsset'
  import type { EmployeeExtended } from '@/utils/User'
  import type { Contract } from '@/utils/Contract'
  import type { Storage } from '@/utils/Storage'
  import { formatDate } from '@/utils/Format'

  /**
   * 回收资产详情卡片数据源
   *
   * @description 包含回收资产主详情及其关联数据（合同、使用人、回收人、仓库）
   */
  export interface RecycleAssetDetailCardData {
    /** 回收资产主详情 */
    detail: RecycleAssetExtended | null
    /** 通过 assetAPI.getContractByAssetCode(recycle_asset_code) 获取 */
    contractDetail: Contract | null
    /** 通过 userStore.getById(recycle_asset_using_person_jobcode) 获取 */
    usingPerson: EmployeeExtended | null
    /** 通过 userStore.getById(recycle_asset_recycle_person_jobcode) 获取 */
    recyclePerson: EmployeeExtended | null
    /** 通过 storageStore.getById(recycle_asset_storage_code) 获取 */
    storageDetail: Storage | null
  }

  /**
   * 回收资产详情卡片配置 composable
   *
   * @description
   * 接收回收资产详情数据源，返回 5 个计算属性（InfoCardConfig）：
   * - basicInfoConfig: 基本信息卡片（8 个字段，双列布局）
   * - contractInfoConfig: 合同信息卡片（8 个字段，双列布局）
   * - usingPersonInfoConfig: 使用人信息卡片（2 个字段，单列布局）
   * - recyclePersonInfoConfig: 回收人信息卡片（2 个字段，单列布局）
   * - storageInfoConfig: 仓库信息卡片（5 个字段，双列布局）
   *
   * @param data - 响应式数据源，包含 detail、contractDetail、usingPerson、recyclePerson、storageDetail
   * @returns 5 个 InfoCardConfig 计算属性
   *
   * @example
   * ```ts
   * const cardData = computed(() => ({
   *   detail: detailData.value,
   *   contractDetail: contractDetail.value,
   *   usingPerson: usingPerson.value,
   *   recyclePerson: recyclePerson.value,
   *   storageDetail: storageDetail.value,
   * }))
   * const { basicInfoConfig, contractInfoConfig, usingPersonInfoConfig, recyclePersonInfoConfig, storageInfoConfig }
   *   = useRecycleAssetDetailCards(cardData)
   * ```
   */
  export function useRecycleAssetDetailCards(data: Ref<RecycleAssetDetailCardData>) {
    /**
     * 基本信息卡片配置
     *
     * 包含 8 个字段，双列网格布局：
     * - 左列：ID、资产编码、资产名称、规格型号
     * - 右列：回收时间、回收数量、回收描述、出库记录编码
     */
    const basicInfoConfig = computed<InfoCardConfig>(() => {
      const d = data.value.detail
      return {
        title: '基本信息',
        icon: 'Document',
        fields: [
          [
            { label: 'ID', value: d?.id, defaultValue: 'N/A' },
            { label: '资产编码', value: d?.recycle_asset_code, defaultValue: 'N/A' },
            { label: '资产名称', value: d?.recycle_asset_name, defaultValue: 'N/A' },
            { label: '规格型号', value: d?.recycle_asset_specification, defaultValue: '无' },
          ],
          [
            {
              label: '回收时间',
              value: d?.recycle_asset_date,
              formatter: (v) => formatDate(v as string) ?? '无',
            },
            { label: '回收数量', value: d?.recycle_asset_number },
            { label: '回收描述', value: d?.recycle_asset_description, defaultValue: '无' },
            { label: '出库记录编码', value: d?.outasset_recordcode, defaultValue: 'N/A' },
          ],
        ],
      }
    })

    /**
     * 合同信息卡片配置
     *
     * 包含 8 个字段，双列网格布局：
     * - 左列：合同编码、合同名称、合同金额、合同供应商
     * - 右列：签订日期、保修期、初验日期、终验日期
     * 数据来源：通过 assetAPI.getContractByAssetCode 直接获取的 Contract 对象
     */
    const contractInfoConfig = computed<InfoCardConfig>(() => {
      const c = data.value.contractDetail
      return {
        title: '合同信息',
        icon: 'Tickets',
        fields: [
          [
            { label: '合同编码', value: c?.contract_code, defaultValue: 'N/A' },
            { label: '合同名称', value: c?.contract_name, defaultValue: 'N/A' },
            { label: '合同金额', value: c?.contract_price, isPrice: true },
            { label: '合同供应商', value: c?.contract_supplier, defaultValue: 'N/A' },
          ],
          [
            {
              label: '签订日期',
              value: c?.contract_signing_date,
              formatter: (v) => formatDate(v as string) ?? '无',
            },
            {
              label: '保修期',
              value: c?.contract_warranty_period,
              formatter: (v) => (v !== null && v !== undefined ? `${v} 年` : '无'),
            },
            {
              label: '初验日期',
              value: c?.contract_preliminary_acceptance_date,
              formatter: (v) => formatDate(v as string) ?? '无',
            },
            {
              label: '终验日期',
              value: c?.contract_final_acceptance_date,
              formatter: (v) => formatDate(v as string) ?? '无',
            },
          ],
        ],
      }
    })

    /**
     * 使用人信息卡片配置
     *
     * 包含 2 个字段，单列布局：使用人（姓名/部门）、使用人工号
     * 数据来源：通过 userStore.getById 获取的 EmployeeExtended 对象
     */
    const usingPersonInfoConfig = computed<InfoCardConfig>(() => {
      const u = data.value.usingPerson
      const d = data.value.detail
      return {
        title: '使用人信息',
        icon: 'User',
        fields: [
          [
            {
              label: '使用人',
              value:
                u?.employee_name && u?.employee_department?.department_name
                  ? `${u.employee_name} / ${u.employee_department.department_name}`
                  : null,
              defaultValue: 'N/A',
            },
          ],
          [{ label: '使用人工号', value: d?.recycle_asset_using_person_jobcode, defaultValue: 'N/A' }],
        ],
      }
    })

    /**
     * 回收人信息卡片配置
     *
     * 包含 2 个字段，单列布局：回收人（姓名/部门）、回收人工号
     * 数据来源：通过 userStore.getById 获取的 EmployeeExtended 对象
     */
    const recyclePersonInfoConfig = computed<InfoCardConfig>(() => {
      const u = data.value.recyclePerson
      const d = data.value.detail
      return {
        title: '回收人信息',
        icon: 'UserFilled',
        fields: [
          [
            {
              label: '回收人',
              value:
                u?.employee_name && u?.employee_department?.department_name
                  ? `${u.employee_name} / ${u.employee_department.department_name}`
                  : null,
              defaultValue: 'N/A',
            },
          ],
          [{ label: '回收人工号', value: d?.recycle_asset_recycle_person_jobcode, defaultValue: 'N/A' }],
        ],
      }
    })

    /**
     * 仓库信息卡片配置
     *
     * 包含 5 个字段，双列网格布局：
     * - 左列：仓库编码、仓库名称、仓库地址
     * - 右列：仓库类型、仓库描述
     * 数据来源：通过 storageStore.getById 获取的 Storage 对象
     */
    const storageInfoConfig = computed<InfoCardConfig>(() => {
      const s = data.value.storageDetail
      return {
        title: '仓库信息',
        icon: 'Location',
        fields: [
          [
            { label: '仓库编码', value: s?.storage_code, defaultValue: 'N/A' },
            { label: '仓库名称', value: s?.storage_name, defaultValue: 'N/A' },
            { label: '仓库地址', value: s?.storage_address, defaultValue: '无' },
          ],
          [
            { label: '仓库类型', value: s?.storage_type, defaultValue: '无' },
            { label: '仓库描述', value: s?.storage_description, defaultValue: '无' },
          ],
        ],
      }
    })

    return {
      basicInfoConfig,
      contractInfoConfig,
      usingPersonInfoConfig,
      recyclePersonInfoConfig,
      storageInfoConfig,
    }
  }
  ```

- [ ] **步骤 3：验证 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 4：验证 lint**

  运行：`npm run lint -- src/composables/useRecycleAssetDetailCards.ts`
  预期：零新增警告

- [ ] **步骤 5：Commit**

  ```bash
  git add src/composables/useRecycleAssetDetailCards.ts
  git commit -m "feat: 新建 useRecycleAssetDetailCards composable，生成 5 个 InfoCardConfig"
  ```

---

## 任务 2：重构 RecycleAssetBasicDetails.vue

**文件：**
- 修改：`src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue`

**前置条件：** 任务 1 完成（composable 已创建）

- [ ] **步骤 1：修改模板部分**

  将 `<div class="child-page-content">` 内的内容替换为：

  ```html
  <div class="child-page-content">
    <template v-if="detailData">
      <InfoCard :config="basicInfoConfig" />
      <InfoCard :config="contractInfoConfig" />
      <InfoCard :config="usingPersonInfoConfig" />
      <InfoCard :config="recyclePersonInfoConfig" />
      <InfoCard :config="storageInfoConfig" />
    </template>
    <div v-else-if="!isLoading">
      <el-empty description="未找到回收资产详情数据" />
    </div>
  </div>
  ```

- [ ] **步骤 2：修改脚本导入**

  在现有导入后新增：
  ```ts
  import InfoCard from '@/components/commoncomponents/InfoCard.vue'
  import { useRecycleAssetDetailCards } from '@/composables/useRecycleAssetDetailCards'
  import { assetAPI } from '@/api/asset'
  import { useUserStore } from '@/stores/userStore'
  import { useStorageStore } from '@/stores/storageStore'
  import type { Contract } from '@/utils/Contract'
  import type { EmployeeExtended } from '@/utils/User'
  import type { Storage } from '@/utils/Storage'
  ```

- [ ] **步骤 3：新增 Store/API 实例和关联数据 ref**

  在 `const recycleAssetStore = useRecycleAssetStore()` 之后添加：

  ```ts
  // ========== 关联数据 Store/API 实例 ==========
  /** 用户 Store：用于查询使用人、回收人详细信息 */
  const userStore = useUserStore()
  /** 仓库 Store：用于查询仓库详细信息 */
  const storageStore = useStorageStore()

  // ========== 关联数据 ref ==========
  /** 合同详情：通过 assetAPI.getContractByAssetCode 获取 */
  const contractDetail = ref<Contract | null>(null)
  /** 使用人详情：通过 userStore.getById 获取 */
  const usingPerson = ref<EmployeeExtended | null>(null)
  /** 回收人详情：通过 userStore.getById 获取 */
  const recyclePerson = ref<EmployeeExtended | null>(null)
  /** 仓库详情：通过 storageStore.getById 获取 */
  const storageDetail = ref<Storage | null>(null)
  ```

- [ ] **步骤 4：新增 composable 调用**

  在 `const detailData = ref<RecycleAssetExtended | null>(null)` 之后添加：

  ```ts
  // ========== InfoCard 卡片配置：通过 composable 生成 5 个语义卡片 ==========
  /**
   * 卡片数据源：将页面中的响应式数据聚合为 composable 所需的格式
   * 包含回收资产主详情、合同详情、使用人、回收人、仓库信息
   */
  const cardData = computed(() => ({
    detail: detailData.value,
    contractDetail: contractDetail.value,
    usingPerson: usingPerson.value,
    recyclePerson: recyclePerson.value,
    storageDetail: storageDetail.value,
  }))

  /**
   * 使用 useRecycleAssetDetailCards composable 生成 5 个 InfoCardConfig：
   * - basicInfoConfig: 基本信息卡片（8 个字段，Document 图标）
   * - contractInfoConfig: 合同信息卡片（8 个字段，Tickets 图标）
   * - usingPersonInfoConfig: 使用人信息卡片（2 个字段，User 图标）
   * - recyclePersonInfoConfig: 回收人信息卡片（2 个字段，UserFilled 图标）
   * - storageInfoConfig: 仓库信息卡片（5 个字段，Location 图标）
   */
  const {
    basicInfoConfig,
    contractInfoConfig,
    usingPersonInfoConfig,
    recyclePersonInfoConfig,
    storageInfoConfig,
  } = useRecycleAssetDetailCards(cardData)
  ```

- [ ] **步骤 5：修改 loadDetail 方法，新增 Promise.all 并行加载关联数据**

  将 `loadDetail` 方法替换为：

  ```ts
  /**
   * 加载回收资产详情及关联数据
   *
   * @description
   * 1. 先获取回收资产主详情
   * 2. 根据主详情中的外键字段，通过 Promise.all 并行加载 4 个关联数据：
   *    - 合同：通过 assetAPI.getContractByAssetCode(recycle_asset_code)
   *    - 使用人：通过 userStore.getById(recycle_asset_using_person_jobcode)
   *    - 回收人：通过 userStore.getById(recycle_asset_recycle_person_jobcode)
   *    - 仓库：通过 storageStore.getById(recycle_asset_storage_code)
   * 3. 每个查询前检查外键字段是否存在，避免空值调用
   */
  const loadDetail = async (code: string) => {
    try {
      isLoading.value = true
      const detail = await recycleAssetStore.getById(code)

      if (!detail) {
        ElMessage.error('未找到对应回收资产')
        router.back()
        return
      }

      detailData.value = detail

      // 并行加载关联数据（提升性能）
      const promises: Promise<unknown>[] = []

      // 合同：直接调用 API（Store 未封装此方法）
      if (detail.recycle_asset_code) {
        promises.push(
          assetAPI.getContractByAssetCode(detail.recycle_asset_code).then((contract) => {
            contractDetail.value = contract
          }),
        )
      }

      // 使用人
      if (detail.recycle_asset_using_person_jobcode) {
        promises.push(
          userStore.getById(detail.recycle_asset_using_person_jobcode).then((user) => {
            usingPerson.value = user
          }),
        )
      }

      // 回收人
      if (detail.recycle_asset_recycle_person_jobcode) {
        promises.push(
          userStore.getById(detail.recycle_asset_recycle_person_jobcode).then((user) => {
            recyclePerson.value = user
          }),
        )
      }

      // 仓库
      if (detail.recycle_asset_storage_code) {
        promises.push(
          storageStore.getById(detail.recycle_asset_storage_code).then((storage) => {
            storageDetail.value = storage
          }),
        )
      }

      await Promise.all(promises)
    } catch (error) {
      console.error('获取详情失败:', error)
      ElMessage.error('加载回收资产详情失败，请稍后重试')
    } finally {
      isLoading.value = false
    }
  }
  ```

- [ ] **步骤 6：删除手写网格样式**

  从 `<style>` 中删除以下样式类：
  - `.main-info-card`
  - `.section-header`
  - `.section-title`
  - `.info-grid`
  - `.info-column`
  - `.info-item`
  - `.info-label`
  - `.info-value`

  保留：`.recycle-asset-detail-page`、`.child-page-header`、`.page-title`、`.action-buttons`、`.child-page-content` 及响应式规则

- [ ] **步骤 7：验证 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 8：验证 lint**

  运行：`npm run lint -- src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue`
  预期：零新增警告

- [ ] **步骤 9：Commit**

  ```bash
  git add src/components/componentsdetails/detils/RecycleAssetBasicDetails.vue
  git commit -m "refactor: RecycleAssetBasicDetails 使用 InfoCard 组件重构为 5 卡片布局，新增关联查询"
  ```

---

## 任务 3：最终验证

**文件：** 全部 2 个文件

**前置条件：** 任务 1-2 全部完成

- [ ] **步骤 1：全量 type-check**

  运行：`npm run type-check`
  预期：零错误

- [ ] **步骤 2：全量 lint**

  运行：`npm run lint`
  预期：零新增警告

- [ ] **步骤 3：手动代码审查**

  检查清单：
  - [ ] 25 个字段在 5 个卡片中无遗漏（8 + 8 + 2 + 2 + 5 = 25）
  - [ ] Promise.all 并行加载 4 个关联数据，每个查询前检查外键字段是否存在
  - [ ] 空值处理与原页面一致（'N/A' / '无'）
  - [ ] 导出功能未受影响（exportColumns 配置未改动）
  - [ ] 全项目使用 `@/` 别名导入，无相对路径
  - [ ] 响应式布局规则保留
  - [ ] 数据加载逻辑完整（含 try/catch/finally）

- [ ] **步骤 4：Commit（可选，如有审查修复）**

  ```bash
  git add .
  git commit -m "fix: 审查修复"
  ```

---

## 自检

**规格覆盖度：**
- ✅ 新建 composable → 任务 1
- ✅ 重构页面模板和脚本 → 任务 2
- ✅ Promise.all 关联查询 → 任务 2 步骤 5
- ✅ 验证 → 任务 3

**占位符扫描：** 无 TODO/待定/后续实现

**类型一致性：**
- `RecycleAssetDetailCardData` 字段名与 RecycleAssetBasicDetails.vue 中 ref 名一致
- `Contract` 类型字段名与 composable 中使用的一致
- `Storage` 类型字段名与 composable 中使用的一致
