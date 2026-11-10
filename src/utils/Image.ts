/**
 * @file 图片懒加载 Vue 自定义指令（批次5 M-45 批B 收敛：5/6 死导出删除，仅保留唯一存活的
 * lazyLoadDirective——main.ts:10 注册为全局指令 v-lazy）。
 * preloadImage / compressImage / convertImageToWebP / getImageDimensions / supportsWebP
 * 删除依据：merge-audit-20261107 M-45③（全仓剔除自身后零外部调用）。
 * @module src/utils/Image
 * @callers
 *   - main.ts（注册全局指令）
 * @dependsOn
 *   - vue (DirectiveBinding)
 */

import type { DirectiveBinding } from 'vue'

export const lazyLoadDirective = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    const img = el
    const src = binding.value

    // 创建 Intersection Observer 实例
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 当图片进入视口时加载图片
          img.src = src
          observer.unobserve(img)
        }
      })
    })

    // 开始观察元素
    observer.observe(img)

    // 设置占位符图片
    img.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWVrIjwvdGV4dD48L3N2Zz4='
  },
  updated(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    const img = el
    // 注意：oldValue 在首次绑定时为 undefined，需要兼容处理
    if (binding.value !== binding.oldValue) {
      // 当图片 URL 变化时，重新开始懒加载流程（重置观察者）
      // 这里简单处理：直接设置 src（可能破坏懒加载，但业务场景很少变化）
      img.src = binding.value
    }
  },
}
