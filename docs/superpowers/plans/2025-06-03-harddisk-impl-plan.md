# 硬盘序列号多盘录入改造实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 根据 v3.0 设计文档，将硬盘序列号表单改造为数组驱动，新增和编辑统一使用 `saveHardDiskSNBatch` 接口。

**架构：** 前端维护 `disks: DiskItem[]` 数组驱动表单渲染，统一通过 `saveHardDiskSNBatch` 提交 `{ asset_code, disks }` 数组。后端根据 `disks.length` 自动生成 `harddisk_number`，根据 `id` 区分新增/更新。

**技术栈：** Vue 3 + TypeScript + Element Plus + Pinia

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/utils/HardDiskSN.ts` | 数据模型定义 | 新增 `DiskItem`、`HardDiskSNBatchSaveForm` |
| `src/api/harddiskSn.ts` | API 接口 | 新增 `saveHardDiskSNBatch` |
| `src/stores/harddiskSnStore.ts` | 状态管理 | 新增 `saveBatch` 方法 |
| `src/components/componentsdetails/detils/HardDiskSNForm.vue` | 硬盘表单页面 | 核心改造 |

---

## 任务 1：新增 DiskItem 和 HardDiskSNBatchSaveForm 接口

**文件：**
- 修改：`src/utils/HardDiskSN.ts`

**目标：** 在 `HardDiskSN.ts` 中新增 `DiskItem` 和 `HardDiskSNBatchSaveForm` 接口定义。

- [ ] **步骤 1：在 HardDiskSN.ts 末尾新增接口**

```typescript
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
```

- [ ] **步骤 2：运行 type-check 验证**

运行：`npm run type-check`
预期：零错误

- [ ] **步骤 3：Commit**

```bash
git add src/utils/HardDiskSN.ts
git commit -m "feat(harddisk): 新增 DiskItem 和 HardDiskSNBatchSaveForm 接口"
```

---

## 任务 2：新增 saveHardDiskSNBatch API 接口

**文件：**
- 修改：`src/api/harddiskSn.ts`

**目标：** 在 `harddiskSnAPI` 对象中新增 `saveHardDiskSNBatch` 方法。

**依赖：** 任务 1 完成（`HardDiskSNBatchSaveForm` 接口已定义）

- [ ] **步骤 1：导入 HardDiskSNBatchSaveForm 类型**

修改 `src/api/harddiskSn.ts` 的 import 部分：

```typescript
import type {
  HardDiskSN,
  HardDiskSNCreateForm,
  HardDiskSNUpdateForm,
  HardDiskSNBatchSaveForm,
} from '@/utils/HardDiskSN'
```

- [ ] **步骤 2：在 harddiskSnAPI 对象中新增 saveHardDiskSNBatch 方法**

在 `deleteHardDiskSN` 方法之后、`getHardDiskSNsByAsset` 之前插入：

```typescript
  /**
   * 批量保存硬盘序列号记录（新增和编辑统一）
   * 提交 { asset_code, disks } 数组
   * 后端根据每条记录是否有 id 决定新增或更新
   * @param data 批量保存表单数据
   * @returns 保存结果
   */
  saveHardDiskSNBatch: (data: HardDiskSNBatchSaveForm): Promise<unknown> => {
    return unwrapResponse(request.post('/assets/harddisk-sn/batch/', data))
  },
```

- [ ] **步骤 3：运行 type-check 验证**

运行：`npm run type-check`
预期：零错误

- [ ] **步骤 4：Commit**

```bash
git add src/api/harddiskSn.ts
git commit -m "feat(harddisk): 新增 saveHardDiskSNBatch 批量保存 API"
```

---

## 任务 3：新增 saveBatch Store 方法

**文件：**
- 修改：`src/stores/harddiskSnStore.ts`

**目标：** 在 Store 中新增 `saveBatch` 方法，封装 `saveHardDiskSNBatch` API 调用。

**依赖：** 任务 2 完成（`saveHardDiskSNBatch` API 已定义）

- [ ] **步骤 1：导入 HardDiskSNBatchSaveForm 类型**

修改 `src/stores/harddiskSnStore.ts` 的 import 部分：

```typescript
import type { HardDiskSN, HardDiskSNCreateForm, HardDiskSNUpdateForm, HardDiskSNBatchSaveForm } from '@/utils/HardDiskSN'
```

- [ ] **步骤 2：在 api 对象中新增 saveBatch 方法**

在 `delete` 方法之后添加：

```typescript
    /** 批量保存硬盘序列号记录（新增和编辑统一） */
    saveBatch: (data: HardDiskSNBatchSaveForm) => harddiskSnAPI.saveHardDiskSNBatch(data),
```

- [ ] **步骤 3：运行 type-check 验证**

运行：`npm run type-check`
预期：零错误

- [ ] **步骤 4：Commit**

```bash
git add src/stores/harddiskSnStore.ts
git commit -m "feat(harddisk): 新增 saveBatch 批量保存 Store 方法"
```

---

## 任务 4：改造 HardDiskSNForm.vue 核心逻辑

**文件：**
- 修改：`src/components/componentsdetails/detils/HardDiskSNForm.vue`

**目标：** 将表单从扁平结构改造为数组结构，统一使用 `saveHardDiskSNBatch` 提交。

**依赖：** 任务 1、2、3 完成

### 4.1 修改导入和类型定义

- [ ] **步骤 1：更新导入语句**

将：
```typescript
import type { HardDiskSNCreateForm } from '@/utils/HardDiskSN'
```

改为：
```typescript
import type { DiskItem, HardDiskSNBatchSaveForm } from '@/utils/HardDiskSN'
import { HardDiskStatus } from '@/utils/HardDiskSN'
```

### 4.2 修改表单数据结构

- [ ] **步骤 2：改造 formData 为数组结构**

将：
```typescript
const formData = reactive({
  asset_code: '',
  harddisk_number: 1,
  harddisk_no: 1,
  harddisk_sn_code: '',
  harddisk_type: '',
  harddisk_status: '',
  harddisk_sn_description: '',
})
```

改为：
```typescript
const formData = reactive({
  asset_code: '',
  harddisk_number: 1,
  disks: [
    {
      harddisk_no: 1,
      harddisk_sn_code: '',
      harddisk_type: null,
      harddisk_status: null,
      harddisk_sn_description: null,
    },
  ] as DiskItem[],
})
```

### 4.3 新增计算属性和辅助函数

- [ ] **步骤 3：新增 activeDisks 计算属性**

在 `formData` 定义之后添加：

```typescript
/**
 * 获取未标记为移除的硬盘列表
 * 用于表单渲染
 */
const activeDisks = computed(() =>
  formData.disks.filter((d) => d._status !== 'removed')
)

/**
 * 生成稳定的 key
 * 编辑模式用 _id，新增模式用索引
 */
const diskKey = (disk: DiskItem, index: number): string =>
  disk._id ? `disk-${disk._id}` : `new-${index}`
```

### 4.4 修改硬盘数量变更处理

- [ ] **步骤 4：改造 handleNumberChange 方法**

将：
```typescript
const handleNumberChange = () => {
  if (formData.harddisk_number < 1) {
    formData.harddisk_number = 1
  }
  if (formData.harddisk_number > 999) {
    formData.harddisk_number = 999
  }
}
```

改为：
```typescript
/**
 * 硬盘数量变更处理
 * - 增加：追加新组，自动编号
 * - 减少：标记末尾项为 removed（不物理删除）
 */
const handleNumberChange = (newVal: number, oldVal: number) => {
  // 边界校验
  if (newVal < 1) {
    formData.harddisk_number = 1
    return
  }
  if (newVal > 999) {
    formData.harddisk_number = 999
    return
  }

  if (newVal > oldVal) {
    // 增加数量：追加新组
    for (let i = oldVal; i < newVal; i++) {
      formData.disks.push({
        harddisk_no: i + 1,
        harddisk_sn_code: '',
        harddisk_type: null,
        harddisk_status: null,
        harddisk_sn_description: null,
        _status: 'added',
      })
    }
  } else if (newVal < oldVal) {
    // 减少数量：从末尾开始标记为 removed
    let removedCount = 0
    for (let i = formData.disks.length - 1; i >= 0; i--) {
      if (removedCount >= oldVal - newVal) break
      const disk = formData.disks[i]
      if (disk._status !== 'removed') {
        disk._status = 'removed'
        removedCount++
      }
    }
  }
}
```

### 4.5 修改表单验证规则

- [ ] **步骤 5：更新表单验证规则**

将：
```typescript
const rules = {
  asset_code: [
    { required: true, message: '请输入资产编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9-]+$/, message: '只能包含字母、数字和连字符', trigger: 'blur' },
  ],
  harddisk_number: [
    { required: true, message: '请输入硬盘数量', trigger: 'blur' },
    { type: 'number', min: 1, max: 999, message: '范围1-999', trigger: 'blur' },
  ],
  harddisk_sn_code: [
    { required: true, message: '请输入硬盘序列号', trigger: 'blur' },
  ],
}
```

改为：
```typescript
const rules = {
  asset_code: [
    { required: true, message: '请输入资产编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9-]+$/, message: '只能包含字母、数字和连字符', trigger: 'blur' },
  ],
  harddisk_number: [
    { required: true, message: '请输入硬盘数量', trigger: 'blur' },
    { type: 'number', min: 1, max: 999, message: '范围1-999', trigger: 'blur' },
  ],
  harddisk_sn_code: [
    { required: true, message: '请输入硬盘序列号', trigger: 'blur' },
  ],
  // 动态表单项的验证规则通过 :rules 绑定到每个 el-form-item 上
}
```

### 4.6 修改模板渲染

- [ ] **步骤 6：改造模板为数组驱动**

将现有的表单字段部分替换为：

```vue
<!-- 硬盘数量控制 -->
<el-form-item label="硬盘数量" prop="harddisk_number">
  <el-input-number
    v-model="formData.harddisk_number"
    :min="1"
    :max="999"
    @change="handleNumberChange"
  />
</el-form-item>

<!-- 动态渲染硬盘组（只展示未移除的） -->
<div
  v-for="(disk, index) in activeDisks"
  :key="diskKey(disk, index)"
  class="disk-group"
>
  <el-divider content-position="left">
    硬盘 #{{ disk.harddisk_no }}
  </el-divider>

  <el-row :gutter="20">
    <!-- 硬盘编号 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item
        :label="`硬盘编号`"
        :prop="`disks.${index}.harddisk_no`"
        :rules="rules.harddisk_no"
      >
        <el-input-number
          v-model="disk.harddisk_no"
          :min="1"
          style="width: 100%"
        />
      </el-form-item>
    </el-col>

    <!-- 硬盘序列号 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item
        :label="`硬盘序列号`"
        :prop="`disks.${index}.harddisk_sn_code`"
        :rules="rules.harddisk_sn_code"
      >
        <el-input v-model="disk.harddisk_sn_code" clearable />
      </el-form-item>
    </el-col>

    <!-- 硬盘类型 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item :label="`硬盘类型`">
        <el-select v-model="disk.harddisk_type" clearable style="width: 100%">
          <el-option
            v-for="opt in hardDiskTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
    </el-col>

    <!-- 硬盘状态 -->
    <el-col :xs="24" :sm="12" :md="8">
      <el-form-item :label="`硬盘状态`">
        <el-select v-model="disk.harddisk_status" clearable style="width: 100%">
          <el-option
            v-for="opt in hardDiskStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
    </el-col>

    <!-- 描述 -->
    <el-col :span="24">
      <el-form-item :label="`描述`">
        <el-input
          v-model="disk.harddisk_sn_description"
          type="textarea"
          :rows="2"
          clearable
        />
      </el-form-item>
    </el-col>
  </el-row>
</div>
```

### 4.7 修改提交逻辑

- [ ] **步骤 7：改造 submitForm 为统一提交方法**

将 `submitForm` 方法替换为：

```typescript
/**
 * 统一提交方法（新增和编辑共用）
 * 始终通过 saveHardDiskSNBatch 提交 { asset_code, disks } 数组
 * - 新增模式：disks 不含 id，后端全部创建
 * - 编辑模式：disks 含 id 的记录后端更新，无 id 的后端创建，scrap 的标记失效
 */
const submitForm = async (): Promise<void> => {
  try {
    const submitData: HardDiskSNBatchSaveForm = {
      asset_code: formData.asset_code,
      disks: formData.disks.map((disk) => ({
        // 编辑已有记录时传递 id，新增时不传
        ...(disk._id ? { id: disk._id } : {}),
        harddisk_no: disk.harddisk_no,
        harddisk_sn_code: disk.harddisk_sn_code,
        harddisk_type: disk.harddisk_type,
        // removed 状态的记录提交时 harddisk_status 设为 scrap
        harddisk_status: disk._status === 'removed'
          ? HardDiskStatus.SCRAP
          : disk.harddisk_status,
        harddisk_sn_description: disk.harddisk_sn_description,
      })),
    }

    await harddiskSnAPI.saveHardDiskSNBatch(submitData)

    const activeCount = submitData.disks.filter(
      (d) => d.harddisk_status !== HardDiskStatus.SCRAP
    ).length

    if (isEditMode.value) {
      ElMessage.success(`保存成功，当前共 ${activeCount} 条有效硬盘记录`)
    } else {
      ElMessage.success(`成功录入 ${activeCount} 条硬盘记录`)
    }
    router.push({ name: 'HardDiskSNDetails' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    ElMessage.error(msg)
  }
}
```

### 4.8 修改编辑模式加载逻辑

- [ ] **步骤 8：改造 loadEditData 方法**

将 `loadEditData` 方法替换为：

```typescript
/**
 * 编辑模式加载数据
 * 根据 asset_code 查询该资产下所有硬盘记录
 * 映射为 disks 数组
 */
const loadEditData = async (assetCode: string) => {
  isLoading.value = true
  try {
    // 1. 获取该资产下的所有硬盘记录
    const response = await harddiskSnAPI.getHardDiskSNsByAsset(assetCode)
    const records = response.results

    if (!records || records.length === 0) {
      ElMessage.warning('该资产暂无硬盘记录')
      return
    }

    // 2. 映射为 disks 数组
    formData.disks = records.map((record) => ({
      harddisk_no: record.harddisk_no,
      harddisk_sn_code: record.harddisk_sn_code,
      harddisk_type: record.harddisk_type,
      harddisk_status: record.harddisk_status,
      harddisk_sn_description: record.harddisk_sn_description,
      _status: 'unchanged' as const,
      _id: record.id,
    }))

    // 3. 同步硬盘数量（仅控制 UI 渲染，不提交给后端）
    formData.harddisk_number = formData.disks.length

    // 4. 保存原始数据用于变更对比
    originalFormData.value = JSON.parse(JSON.stringify(formData))
  } catch (error) {
    console.error('加载硬盘记录失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}
```

### 4.9 新增变更检测

- [ ] **步骤 9：新增 hasDiskChanged 和 watch 监听**

在 `loadEditData` 之后添加：

```typescript
/**
 * 检测单个硬盘是否有变更
 * 用于编辑模式判断是否需要提交
 */
const hasDiskChanged = (disk: DiskItem, index: number): boolean => {
  if (!originalFormData.value) return true
  const original = originalFormData.value.disks[index]
  if (!original) return true

  return (
    disk.harddisk_no !== original.harddisk_no ||
    disk.harddisk_sn_code !== original.harddisk_sn_code ||
    disk.harddisk_type !== original.harddisk_type ||
    disk.harddisk_status !== original.harddisk_status ||
    disk.harddisk_sn_description !== original.harddisk_sn_description
  )
}

/**
 * 监听 disks 变化，自动更新 _status
 */
watch(
  () => formData.disks,
  (newDisks) => {
    if (!isEditMode.value || !originalFormData.value) return

    newDisks.forEach((disk, index) => {
      if (disk._status === 'added' || disk._status === 'removed') return
      disk._status = hasDiskChanged(disk, index) ? 'modified' : 'unchanged'
    })
  },
  { deep: true }
)
```

### 4.10 修改重置逻辑

- [ ] **步骤 10：改造 resetForm 方法**

将 `resetForm` 方法替换为：

```typescript
const resetForm = () => {
  formRef.value?.resetFields()
  formData.asset_code = ''
  formData.harddisk_number = 1
  formData.disks = [
    {
      harddisk_no: 1,
      harddisk_sn_code: '',
      harddisk_type: null,
      harddisk_status: null,
      harddisk_sn_description: null,
    },
  ]
}
```

### 4.11 验证和提交

- [ ] **步骤 11：运行 type-check 验证**

运行：`npm run type-check`
预期：零错误

- [ ] **步骤 12：运行 lint 验证**

运行：`npm run lint`
预期：零警告

- [ ] **步骤 13：Commit**

```bash
git add src/components/componentsdetails/detils/HardDiskSNForm.vue
git commit -m "feat(harddisk): 改造表单为数组驱动，统一使用 saveHardDiskSNBatch 提交"
```

---

## 任务 5：全局验证

**目标：** 确保所有修改后的文件通过类型检查和代码规范检查。

- [ ] **步骤 1：运行全局 type-check**

运行：`npm run type-check`
预期：零错误

- [ ] **步骤 2：运行全局 lint**

运行：`npm run lint`
预期：零警告

- [ ] **步骤 3：运行测试（如有）**

运行：`npm run test:unit`
预期：通过

- [ ] **步骤 4：最终 Commit**

```bash
git commit -m "feat(harddisk): 完成多盘录入改造 v3.0"
```

---

## 自检清单

- [ ] 所有新增接口已导出
- [ ] 所有文件使用 `@/` 别名导入，无相对路径
- [ ] `type-check` 零错误
- [ ] `lint` 零警告
- [ ] 代码注释完整，关键逻辑有说明
- [ ] 无 `any` 类型，宽泛用 `unknown` + 类型守卫
