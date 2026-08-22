/**
 * 未登记资产「审批操作」逻辑（自 UnregisteredAssetBasicDetails.vue 物理提取，零逻辑变更）
 *
 * 包含：通过审批（含处理类型选择弹窗）、拒绝审批（含原因输入）。
 * 详情数据、store 与 API 以参数注入；交互分支与错误处理保持原实现。
 */
import { h, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { HandleType } from '@/types/unregisteredasset'
import type { UnregisteredAsset } from '@/types/unregisteredasset'

/** 审批操作依赖 */
export interface UnregisteredApprovalDeps {
  /** 详情数据（响应式引用） */
  detailData: Ref<UnregisteredAsset | null>
  /** store：仅用于通知列表刷新 */
  store: { setRefreshFlag: (flag: boolean) => void }
  /** 审批 API */
  api: {
    approveUnregisteredAsset: (
      code: string,
      payload: { handle_type: string; approval_remark: string },
    ) => Promise<unknown>
  }
  /** 审批成功后重新加载详情的回调 */
  loadDetail: (code: string) => Promise<void>
}

/** 创建审批操作函数 */
export function useUnregisteredApproval({ detailData, store, api, loadDetail }: UnregisteredApprovalDeps) {
  /** 通过审批 */
  const handleApprove = async () => {
    if (!detailData.value) return
    try {
      const selectedHandleType = await selectHandleType()
      if (!selectedHandleType) return

      await api.approveUnregisteredAsset(detailData.value.unregistered_code, {
        handle_type: selectedHandleType,
        approval_remark: '审批通过',
      })
      ElMessage.success('审批通过')
      // 重新加载详情
      await loadDetail(detailData.value.unregistered_code)
      store.setRefreshFlag(true)
    } catch (error) {
      console.error('审批操作失败:', error)
      ElMessage.error('审批操作失败，请重试')
    }
  }

  /** 拒绝审批 */
  const handleReject = async () => {
    if (!detailData.value) return
    try {
      const { value: remark } = await ElMessageBox.prompt('请输入拒绝原因（可选）：', '拒绝审批', {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入拒绝原因',
        inputType: 'textarea',
      })
      await api.approveUnregisteredAsset(detailData.value.unregistered_code, {
        handle_type: HandleType.REJECT,
        approval_remark: remark || '审批拒绝',
      })
      ElMessage.success('已拒绝')
      // 重新加载详情
      await loadDetail(detailData.value.unregistered_code)
      store.setRefreshFlag(true)
    } catch (error) {
      // 用户取消操作不提示错误
      if (error === 'cancel' || error === 'close') return
      console.error('拒绝操作失败:', error)
      ElMessage.error('拒绝操作失败，请重试')
    }
  }

  /**
   * 选择处理类型弹窗
   * 使用 beforeClose 回调将用户选中的值通过 done() 传递出来，
   * 避免 ElMessageBox.close() 无法传值的 Bug
   */
  const selectHandleType = async (): Promise<string | null> => {
    const handleTypes = [
      { value: HandleType.CREATE_AND_RECYCLE, label: '新建并回收' },
      { value: HandleType.CREATE_AND_DAMAGED, label: '新建并报废' },
      { value: HandleType.SUPPLEMENT_AND_RECYCLE, label: '补录并回收' },
      { value: HandleType.CORRECT_AND_RECYCLE, label: '纠正并回收' },
    ]

    return new Promise<string | null>((resolve) => {
      ElMessageBox({
        title: '选择处理类型',
        message: h('div', null, [
          h(
            'p',
            { style: 'margin-bottom: 12px; color: var(--text-regular);' },
            '请选择审批通过后的处理方式：',
          ),
          h(
            'div',
            { style: 'display: flex; flex-direction: column; gap: 8px;' },
            handleTypes.map((item) =>
              h(
                'div',
                {
                  key: item.value,
                  style:
                    'padding: 8px 12px; border: 1px solid var(--border-color-light); border-radius: 4px; cursor: pointer; transition: all 0.2s;',
                  onClick: () => resolve(item.value),
                },
                `${item.label}（${item.value}）`,
              ),
            ),
          ),
        ]),
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: '取消',
        closeOnClickModal: false,
        beforeClose: (_: string, __: unknown, done: () => void) => {
          done()
          resolve(null)
        },
      }).catch(() => {
        // 用户点击取消或关闭，resolve null
        resolve(null)
      })
    })
  }

  return { handleApprove, handleReject }
}
