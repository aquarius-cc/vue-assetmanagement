<!--
  HardDiskSNForm.vue
  硬盘序列号表单页面（新增/编辑＀  模式判断：route.query.id 存在为编辑模式，否则为新增模式）  功能＀    - 新增硬盘序列号记录    - 编辑已有硬盘序列号记录    - 资产编码联动（el-autocomplete＀    - 表单验证
-->
<template>
  <div class="harddisk-sn-form" v-loading="isLoading" element-loading-text="加载中...">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><EditPen /></el-icon>
          <span>{{ isEditMode ? '硬盘序列号编码' : '硬盘序列号录入' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">硬盘序列号信息</h3>
          </el-col>

          <!-- 资产编码（联动资产名称） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产编码" prop="asset_code">
              <el-autocomplete
                v-model="formData.asset_code"
                :fetch-suggestions="fetchAssetSuggestions"
                placeholder="请输入资产编码"
                clearable
                :disabled="isEditMode"
                @select="handleAssetSelect"
                @change="handleAssetCodeChange"
                @blur="handleAssetCodeBlur"
              >
                <template #default="{ item }">
                  <div>资产编码：{{ item.asset_code }} / 资产名称：{{ item.asset_name }}</div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>

          <!-- 硬盘数量 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="硬盘数量" prop="harddisk_number">
              <el-input-number
                v-model="formData.harddisk_number"
                :min="1"
                :max="999"
                @change="handleNumberChange"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 动态渲染硬盘组（只展示未移除的＀-->
        <div v-for="(disk, index) in activeDisks" :key="diskKey(disk, index)" class="disk-group">
          <el-divider content-position="left"> 硬盘 #{{ disk.harddisk_no }} </el-divider>

          <el-row :gutter="20">
            <!-- 硬盘编号 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item
                label="硬盘编号"
                :prop="`disks.${index}.harddisk_no`"
                :rules="rules.harddisk_no"
              >
                <el-input-number v-model="disk.harddisk_no" :min="1" style="width: 100%" />
              </el-form-item>
            </el-col>

            <!-- 硬盘序列号-->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item
                label="硬盘序列号"
                :prop="`disks.${index}.harddisk_sn_code`"
                :rules="rules.harddisk_sn_code"
              >
                <el-input v-model="disk.harddisk_sn_code" clearable />
              </el-form-item>
            </el-col>

            <!-- 硬盘类型 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="硬盘类型">
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

            <!-- 硬盘状态-->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="硬盘状态">
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
              <el-form-item label="描述">
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

        <el-row :gutter="20"> </el-row>

        <div class="form-actions">
          <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm" :loading="harddiskSnStore.loading">
            {{ isEditMode ? '保存修改' : '提交录入' }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HardDiskSNForm',
}
</script>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import { isAxiosError } from 'axios'
import { useAssetStore } from '@/stores/assetStore'
import { useHardDiskSnStore } from '@/stores/harddiskSnStore'
import type { DiskItem, HardDiskSNBatchSaveForm } from '@/utils/HardDiskSN'
import { HardDiskType, HardDiskStatus } from '@/utils/HardDiskSN'
import { harddiskSnAPI } from '@/api/harddiskSn'
import type { AssetDetail } from '@/types/asset'
import type { AssetSuggestion } from '@/types/form-helpers'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const harddiskSnStore = useHardDiskSnStore()
const formRef = ref()
const isLoading = ref(false)

// 编辑模式判断：route.query.code 存在则为编辑模式
const isEditMode = ref(!!route.query.code || !!route.query.id)
const assetCode = ref((route.query.assetCode as string) || '')
const harddiskSnCode = ref((route.query.harddiskSnCode as string) || '')

// ===== 硬盘类型选项 =====
const hardDiskTypeOptions = [
  { value: HardDiskType.HDD, label: '机械硬盘 (HDD)' },
  { value: HardDiskType.SSD, label: '固态硬盀(SSD)' },
  { value: HardDiskType.NVMe, label: 'NVMe硬盘' },
  { value: HardDiskType.OTHER, label: '其他' },
]

// ===== 硬盘状态选项 =====
const hardDiskStatusOptions = [
  { value: HardDiskStatus.ACTIVE, label: '正常' },
  { value: HardDiskStatus.REPAIR, label: '维修' },
  { value: HardDiskStatus.SCRAP, label: '报废' },
  { value: HardDiskStatus.LOST, label: '丢失' },
  { value: HardDiskStatus.DAMAGED, label: '损坏' },
]

// ===== 表单数据（数组结构，每组硬盘独立＀=====
interface FormDataType {
  asset_code: string
  harddisk_number: number
  disks: DiskItem[]
}

const formData = reactive<FormDataType>({
  asset_code: assetCode.value,
  harddisk_number: 1,
  disks: [
    {
      harddisk_no: 1,
      harddisk_sn_code: '',
      harddisk_type: null,
      harddisk_status: null,
      harddisk_sn_description: null,
    },
  ],
})

const originalFormData = ref<FormDataType | null>(null)

/**
 * 获取未标记为移除的硬盘列血 * 用于表单渲染
 */
const activeDisks = computed(() => formData.disks.filter((d) => d._status !== 'removed'))

/**
 * 生成稳定皀key
 * 编辑模式甀_id，新增模式用索引
 */
const diskKey = (disk: DiskItem, index: number): string =>
  disk._id ? `disk-${disk._id}` : `new-${index}`

/**
 * 硬盘数量变更处理
 * - 增加：追加新组，自动编号
 * - 减少：标记末尾项一removed（不物理删除＀ */
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
    // 增加数量：追加新记录
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

// ===== 表单验证规则 =====
const rules: FormRules = {
  asset_code: [{ required: true, message: '请输入或选择资产编码', trigger: 'blur' }],
  harddisk_sn_code: [{ required: true, message: '请输入硬盘序列号', trigger: 'blur' }],
  harddisk_number: [
    { required: true, message: '请输入硬盘数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '范围1-999', trigger: 'blur' },
  ],
  harddisk_no: [
    { required: true, message: '请输入硬盘编号', trigger: 'blur' },
    { type: 'number', min: 1, message: '编号必须大于0', trigger: 'blur' },
  ],
}

// ===== 资产编码联动 =====
const fetchAssetSuggestions = createSuggestionFetcher<AssetDetail, AssetSuggestion>({
  fetchData: (query: string) => assetStore.getByName(query),
  transform: (asset: AssetDetail): AssetSuggestion => ({
    value: asset.asset_code,
    asset_name: asset.asset_name,
    asset_code: asset.asset_code,
  }),
})

/** 资产选择回调 */
const handleAssetSelect = (item: AssetSuggestion) => {
  formData.asset_code = item.asset_code
}

/** 资产编码变更回调 */
const handleAssetCodeChange = (value: string) => {
  if (!value.trim()) {
    formData.asset_code = ''
  }
}

/** 资产编码失焦回调：自动匹酀*/
const handleAssetCodeBlur = async (event: FocusEvent) => {
  const currentValue = (event.target as HTMLInputElement).value
  if (!currentValue.trim()) {
    formData.asset_code = ''
    return
  }
  try {
    const assets = await assetStore.getByName(currentValue.trim())
    if (assets && assets.length > 0) {
      formData.asset_code = assets[0].asset_code
    } else {
      ElMessage.warning('未找到匹配的资产')
    }
  } catch {
    // 查询失败不阻塞
  }
}

// ===== 编辑模式：加载现有数捀=====
/**
 * 编辑模式加载数据
 * 根据 asset_code 查询该资产下所有硬盘记录 * 映射一disks 数组
 */
const loadEditData = async (_assetCode: string, harddiskSnCode: string) => {
  isLoading.value = true
  try {
    // 1. 获取该资产下的所有硬盘记录
    const response = await harddiskSnAPI.getHardDiskSNsByAsset(_assetCode)
    const records = response.results

    if (!records || records.length === 0) {
      ElMessage.warning('该资产暂无硬盘记录')
      return
    }
    let disksRecords: Array<Record<string, unknown>> = []
    if (harddiskSnCode) {
      disksRecords = records.filter(
        (record: Record<string, unknown>) => record.harddisk_sn_code === harddiskSnCode,
      )
    } else {
      disksRecords = records
    }

    // 2. 映射一disks 数组
    formData.disks = disksRecords.map((record: Record<string, unknown>) => ({
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
    ElMessage.error('加载数据失败，请刷新重试')
    router.back()
  } finally {
    isLoading.value = false
  }
}

/**
 * 检测单个硬盘是否有变更
 * 用于编辑模式判断是否需要提人 */
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
 * 监听 disks 变化，自动更斀_status
 */
watch(
  () => formData.disks,
  (newDisks: DiskItem[]) => {
    if (!isEditMode.value || !originalFormData.value) return

    newDisks.forEach((disk: DiskItem, index: number) => {
      if (disk._status === 'added' || disk._status === 'removed') return
      disk._status = hasDiskChanged(disk, index) ? 'modified' : 'unchanged'
    })
  },
  { deep: true },
)

/**
 * 统一提交方法（新增和编辑共用＀ * 始终通过 saveHardDiskSNBatch 提交 { asset_code, disks } 数组
 * - 新增模式：disks 不含 id，后端全部创廀 * - 编辑模式：disks 吀id 的记录后端更新，id 的后端创建，scrap 的标记失数 */
const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请完善必填信息！')
      return
    }

    try {
      const submitData: HardDiskSNBatchSaveForm = {
        asset_code: formData.asset_code,
        disks: formData.disks.map((disk) => ({
          // 编辑已有记录时传退id，新增时不传
          ...(disk._id ? { id: disk._id } : {}),
          harddisk_no: disk.harddisk_no,
          harddisk_sn_code: disk.harddisk_sn_code,
          harddisk_type: disk.harddisk_type,
          // removed 状态的记录提交harddisk_status 设为 scrap
          harddisk_status: disk._status === 'removed' ? HardDiskStatus.SCRAP : disk.harddisk_status,
          harddisk_sn_description: disk.harddisk_sn_description,
        })),
      }

      await harddiskSnAPI.saveHardDiskSNBatch(submitData)

      const activeCount = submitData.disks.filter(
        (d) => d.harddisk_status !== HardDiskStatus.SCRAP,
      ).length

      if (isEditMode.value) {
        ElMessage.success(`保存成功，当前共 ${activeCount} 条有效硬盘记录`)
      } else {
        ElMessage.success(`成功录入 ${activeCount} 条硬盘记录`)
      }
      harddiskSnStore.setRefreshFlag(true)
      router.push({ name: 'HardDiskSNDetails' })
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        ElMessage.error(`操作失败＀{error.response?.data?.message || error.message}`)
      } else if (error instanceof Error) {
        ElMessage.error(`操作失败＀{error.message}`)
      } else {
        ElMessage.error('操作失败，请重试')
      }
      console.error('硬盘序列号提交失贀', error)
    }
  })
}

/**
 * 重置表单
 * 恢复为初始状态（1 个空硬盘组）
 */
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
  ElMessage.info('表单已重置')
}

// ===== 返回 =====
const goBack = () => {
  router.go(-1)
}

/**
 * 生命周期：页面加载时判断模式
 * 编辑模式：通过 assetCode 查询该资产下所有硬盘记录 * 新增模式：初始化空表區 */
onMounted(async () => {
  if (isEditMode.value) {
    const code = assetCode.value
    const harddiskCode = harddiskSnCode.value
    if (!code) {
      ElMessage.error('编辑请求缺少资产编码')
      router.back()
      return
    }
    await loadEditData(code, harddiskCode)
  }
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.harddisk-sn-form {
  @include form-container;
}
</style>
