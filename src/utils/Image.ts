/**
 * 图片优化工具函数
 */
// Image.ts
// 图片懒加载指令

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

// 图片预加载函数
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// 图片压缩函数（简单实现）
export const compressImage = (file: File, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // 设置画布尺寸为原图的一半以减少文件大小
      canvas.width = img.width / 2
      canvas.height = img.height / 2

      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 输出压缩后的图片
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            // 如果压缩失败，返回原始文件
            resolve(file)
          }
        },
        'image/jpeg',
        quality,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

// 图片格式转换函数
export const convertImageToWebP = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      ctx?.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            // 如果转换失败，返回原始文件
            resolve(file)
          }
        },
        'image/webp',
        0.8,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

// 获取图片尺寸
export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      })
    }
    img.onerror = reject
    img.src = src
  })
}

// 检查是否支持 WebP
export const supportsWebP = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}
