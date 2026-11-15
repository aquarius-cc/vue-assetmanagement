import { onDeactivated, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * [M-10] 成功后的延时跳转，保证至多一次且可取消。
 *
 * 取消时机（三钩子覆盖全部离场路径）：
 * - onBeforeRouteLeave：用户主动导航，路由变更先于组件卸载
 * - onDeactivated：父页 keepAlive 失活时子树不卸载，仅触发 deactivated
 * - onUnmounted：板块内返回等 v-if 容器卸载
 *
 * 重复提交会先取消旧计时器，避免叠加多次跳转。
 */
export function useDelayedRoute() {
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = () => {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
  }

  const schedule = (navigate: () => void, delay: number) => {
    cancel()
    timer = setTimeout(() => {
      timer = null
      navigate()
    }, delay)
  }

  onBeforeRouteLeave(cancel)
  onDeactivated(cancel)
  onUnmounted(cancel)

  return { schedule, cancel }
}
