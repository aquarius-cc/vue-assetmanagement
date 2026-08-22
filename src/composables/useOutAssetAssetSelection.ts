/**
 * 出库表单「资产选择与校验」逻辑（自 OutAssetForm.vue 物理提取，零逻辑变更）
 *
 * 包含：资产名称自动完成、编码校验、名称失焦校验、清空资产信息。
 * 表单对象与 assetStore 以参数注入，selectedAsset 状态由本组合式函数持有并返回。
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { AssetDetail } from '@/types/asset'
import type { OutAssetCreateExtended, AssetAutocompleteItem } from '@/types/outasset'

/** assetStore 的最小类型（与组件内的 ExtendedAssetStore 一致的子集） */
interface AssetSelectionStore {
  getByName: (name: string) => Promise<AssetDetail[]>
  getById: (code: string) => Promise<AssetDetail | null>
}

/**
 * @param form - 出库表单（reactive 对象）
 * @param assetStore - 资产 store
 */
export function useOutAssetAssetSelection(
  form: OutAssetCreateExtended,
  assetStore: AssetSelectionStore,
) {
  // ========== 资产选择相关逻辑（用于自动完成） ==========
  const selectedAsset = ref<AssetAutocompleteItem | null>(null)

  /** 从下拉选择资产 */
  const handleAssetNameSelect = (item: AssetAutocompleteItem) => {
    selectedAsset.value = item
    form.outasset_name = item.asset_name
    form.outasset_code = item.asset_code
  }

  /** 手动输入资产名称变化时，清空已选资人*/
  const handleAssetNameChange = (value: string) => {
    if (selectedAsset.value?.asset_name !== value) selectedAsset.value = null
  }

  /** 资产名称失焦验证（确保输入的有效性） */
  const handleAssetNameBlur = async (event: FocusEvent) => {
    const currentValue = (event.target as HTMLInputElement).value
    if (selectedAsset.value?.asset_name === currentValue) return
    if (!currentValue) {
      clearAssetInfo()
      return
    }
    await validateAssetByName(currentValue)
  }

  /** 资产编码手动输入验证 */
  const handleAssetCodeChange = async (code: string) => {
    if (!code.trim()) {
      clearAssetInfo()
      return
    }
    try {
      const asset = await assetStore.getById(code)
      if (asset) {
        form.outasset_name = asset.asset_name
        selectedAsset.value = {
          value: asset.asset_name,
          asset_name: asset.asset_name,
          asset_code: asset.asset_code,
          asset_current_status: asset.asset_current_status ?? '',
        }
      } else {
        form.outasset_code = '编码错误，无此资产'
        form.outasset_name = ''
        selectedAsset.value = null
      }
    } catch (error) {
      console.error('资产编码校验失败:', error)
      ElMessage.error('系统错误，请稍后再试')
      clearAssetInfo()
    }
  }

  /** 根据资产名称校验并自动补入*/
  const validateAssetByName = async (name: string) => {
    if (!name.trim()) {
      clearAssetInfo()
      return
    }
    try {
      const assets = await assetStore.getByName(name.trim())
      if (!assets || assets.length === 0) {
        form.outasset_code = '名称错误，请重新输入'
        selectedAsset.value = null
      } else if (assets.length === 1) {
        const asset = assets[0]
        form.outasset_name = asset.asset_name
        form.outasset_code = asset.asset_code
        selectedAsset.value = {
          value: asset.asset_name,
          asset_name: asset.asset_name,
          asset_code: asset.asset_code,
          asset_current_status: asset.asset_current_status ?? '',
        }
      } else {
        form.outasset_code = '(请从下拉列表中选择正确的资人'
        selectedAsset.value = null
      }
    } catch (error) {
      console.error('资产名称校验失败:', error)
      form.outasset_code = '验证失败'
      selectedAsset.value = null
    }
  }

  /** 清空资产信息 */
  const clearAssetInfo = () => {
    form.outasset_name = ''
    form.outasset_code = ''
    selectedAsset.value = null
  }

  /** 资产选择组件回调（ExportableAssetsSearch 的 select 事件） */
  const handleAssetSelect = (asset: AssetDetail) => {
    form.outasset_code = asset.asset_code
    form.outasset_name = asset.asset_name
    selectedAsset.value = {
      value: asset.asset_name,
      asset_name: asset.asset_name,
      asset_code: asset.asset_code,
      asset_current_status: asset.asset_current_status || '',
    }
    ElMessage.success('资产已选择')
  }

  return {
    selectedAsset,
    handleAssetNameSelect,
    handleAssetNameChange,
    handleAssetNameBlur,
    handleAssetCodeChange,
    validateAssetByName,
    clearAssetInfo,
    handleAssetSelect,
  }
}
