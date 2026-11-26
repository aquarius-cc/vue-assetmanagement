/**
 * @file 图片懒加载 Vue 自定义指令（批次5 M-45 批B 收敛：5/6 死导出删除，仅保留唯一存活的
 * lazyLoadDirective——main.ts:10 注册为全局指令 v-lazy）。
 * preloadImage / compressImage / convertImageToWebP / getImageDimensions / supportsWebP
 * 删除依据：merge-audit-20261107 M-45③（全仓剔除自身后零外部调用）。
 *
 * 批次 5 M-FE-01 重写（修复两项真实缺陷）：
 * ① 原实现无 unmounted 钩子 → 元素经 v-if/列表销毁后 IntersectionObserver 泄漏；
 * ② 原 mounted 回调闭包捕获旧 src，updated 直改 img.src 未重建 observer →
 *    入视口时旧 src 回写覆盖新值。现改为双 WeakMap 单源（observers / sources），
 *    回调经 entry.target 只释放自己并写前校验当前生效 src，竞态从根上消除。
 * @module src/utils/Image
 * @callers
 *   - main.ts（注册全局指令）
 * @dependsOn
 *   - vue (DirectiveBinding)
 */

import type { DirectiveBinding } from 'vue'

/** 占位图（灰底 320x240 SVG，加载完成前显示） */
const PLACEHOLDER_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWVrIjwvdGV4dD48L3N2Zz4='

/** el → 当前 observer 实例（释放时按表定位，防旧回调误释放新 observer） */
const observers = new WeakMap<HTMLImageElement, IntersectionObserver>()

/** el → 当前生效 src（回调写入前读取，保证迟到回调也写新值而非闭包旧值） */
const sources = new WeakMap<HTMLImageElement, string>()

/** 释放 el 的 observer 并移出表 */
function releaseObserver(el: HTMLImageElement): void {
  observers.get(el)?.disconnect()
  observers.delete(el)
}

/** 为 el 建 observer 并入表；回调仅释放自己，写 src 前校验当前生效值 */
function startObserve(el: HTMLImageElement): void {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const target = entry.target as HTMLImageElement
      const currentSrc = sources.get(target)
      if (currentSrc) {
        target.src = currentSrc
      }
      // 只释放自己：作用于本闭包 observer，不影响 updated 重建的新 observer
      observer.unobserve(target)
    }
  })
  observers.set(el, observer)
  observer.observe(el)
}

export const lazyLoadDirective = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    sources.set(el, binding.value)
    el.src = PLACEHOLDER_SRC
    startObserve(el)
  },
  updated(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    const next = binding.value
    // 空值：释放 observer 并回置占位图
    if (!next) {
      releaseObserver(el)
      sources.delete(el)
      el.src = PLACEHOLDER_SRC
      return
    }
    // 同值短路：不释放、不重建、已加载的 src 不重置
    if (sources.get(el) === next) return
    // src 变更：释放旧 observer → 置占位图 → 重建，杜绝旧回调回写旧值
    releaseObserver(el)
    sources.set(el, next)
    el.src = PLACEHOLDER_SRC
    startObserve(el)
  },
  unmounted(el: HTMLImageElement) {
    // 元素经 v-if/列表项销毁时断开观察并清表，防 observer 泄漏
    releaseObserver(el)
    sources.delete(el)
  },
}
