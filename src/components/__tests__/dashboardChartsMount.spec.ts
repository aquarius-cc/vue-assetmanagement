/**
 * M-26 echarts 引入收敛冒烟：两组件单独挂载不依赖同页注册副作用。
 * VChart 改从 plugins/echarts.ts 导入后，mount 无 "component not registered" 类失败。
 * jsdom 无 canvas 实现（getContext 返回 null 使 zrender 初始化即崩），
 * 故注入最小 2D context 桩——本 spec 只验证「注册面齐全可初始化」，不验证绘制结果。
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardDistribution from '../DashboardDistribution.vue'
import DashboardAssetTrend from '../DashboardAssetTrend.vue'

const ctx2dStub = {
  save() {},
  restore() {},
  beginPath() {},
  closePath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  fill() {},
  arc() {},
  arcTo() {},
  rect() {},
  clearRect() {},
  fillRect() {},
  strokeRect() {},
  clip() {},
  quadraticCurveTo() {},
  bezierCurveTo() {},
  translate() {},
  rotate() {},
  scale() {},
  setTransform() {},
  transform() {},
  resetTransform() {},
  drawImage() {},
  fillText() {},
  strokeText() {},
  setLineDash() {},
  getLineDash() {
    return []
  },
  createLinearGradient() {
    return { addColorStop() {} }
  },
  createRadialGradient() {
    return { addColorStop() {} }
  },
  createPattern() {
    return null
  },
  measureText() {
    return { width: 0 }
  },
  getImageData() {
    return { data: new Uint8ClampedArray() }
  },
  putImageData() {},
  isPointInPath() {
    return false
  },
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  textAlign: 'left',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  lineDashOffset: 0,
  miterLimit: 10,
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalCompositeOperation: 'source-over',
  direction: 'ltr',
  filter: 'none',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low',
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ctx2dStub as unknown as CanvasRenderingContext2D,
  )
})

const pieOption = {
  tooltip: { show: true },
  legend: { show: true },
  title: { show: false },
  series: [{ type: 'pie' as const, data: [{ name: 'A', value: 1 }] }],
}

const lineOption = {
  tooltip: { show: true, trigger: 'axis' as const },
  grid: {},
  xAxis: { type: 'category' as const, data: ['1月', '2月'] },
  yAxis: { type: 'value' as const },
  series: [{ type: 'line' as const, data: [1, 2] }],
}

describe('M-26 echarts 按需注册冒烟', () => {
  // jsdom 零尺寸下 zrender 不落 canvas，但 echarts init 成功会在宿主元素上
  // 打 _echarts_instance_ 属性——注册面齐全（图表/组件未注册会在此前抛错）
  it('DashboardDistribution 单独挂载（饼图，仅依赖插件注册面）', () => {
    const wrapper = mount(DashboardDistribution, {
      props: { chartOption: pieOption },
    })
    expect(wrapper.html()).toContain('_echarts_instance_')
  })

  it('DashboardAssetTrend 单独挂载（折线图，Grid/Tooltip 均由插件注册）', () => {
    const wrapper = mount(DashboardAssetTrend, {
      props: { chartOption: lineOption },
    })
    expect(wrapper.html()).toContain('_echarts_instance_')
  })
})
