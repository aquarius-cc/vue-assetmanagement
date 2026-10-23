/**
 * @file keep-alive 列表页「返回即最新」：路由进入本页父路由时触发一次 reload（BF-138 A+D）
 * @module composables/useKeepAliveReload
 * @exports
 *   - useKeepAliveReload: 路由激活刷新 composable（单 watch 同时覆盖 A 跨板块再激活与 D 板块内返回）
 * @callers
 *   - components/componentsdetails/ContractDetails.vue
 *   - components/componentsdetails/AssetTypeDetails.vue
 *   - components/componentsdetails/StorageDetails.vue
 *   - components/componentsdetails/UserDetails.vue
 *   - components/componentsdetails/DepartmentDetails.vue
 * @dependsOn
 *   - vue-router: useRoute（route.name / route.matched 读取）
 *   - utils/logger: logError（reload 失败只记日志，列表由调用点既有兜底保留旧数据）
 *
 * 设计要点（BF-138 §六）：
 *   1. selfName 在 setup 时从 route.matched 的 keepAlive+componentName meta 派生
 *      —— 单一事实来源为路由 meta，调用点不传路由名，杜绝字面量拼写失配的静默失效。
 *   2. watch 非 immediate：首挂由页面自身 onMounted/初始加载负责，天然跳过双取。
 *   3. 触发条件为 route.name === selfName（父页自身名）：板块内子路由间切换（如
 *      ContractForm → ContractBatchImport）不触发；进入父页路由（跨板块返回 / 子页返回）触发。
 *   4. reload 失败吞掉并 logError：loadList 失败路径已弹 ElMessage，此处不重复提示；
 *      失败不改写 store.list，表格保留旧数据（「reload 失败不清空列表」）。
 */
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { logError } from '@/utils/logger'

/**
 * 路由进入本 keep-alive 父页时触发一次 reload（离开本页路由名的每次进入恰好一次）
 * @param reload 刷新入口（通常为 `() => smartListRef.value?.refresh()` 或页面自身的重取函数）
 */
export function useKeepAliveReload(reload: () => unknown): void {
  const route = useRoute()
  // setup 时锚定自身 keep-alive 父路由名：页面必在其 matched 链上挂载（列表页/其子路由均命中）
  const selfName = route.matched.find((m) => m.meta?.keepAlive && m.meta?.componentName)?.name
  if (!selfName) return

  watch(
    () => route.name,
    (name) => {
      if (name !== selfName) return
      void Promise.resolve()
        .then(reload)
        .catch((err: unknown) => {
          logError(
            'composables/useKeepAliveReload',
            '[useKeepAliveReload] reload failed (list keeps previous data):',
            err,
          )
        })
    },
  )
}
