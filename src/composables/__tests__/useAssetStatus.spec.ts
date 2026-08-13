import { describe, it, expect } from 'vitest'
import { computed, ref } from 'vue'
import { AssetCurrentStatus } from '@/types/asset'
import { useAssetStatusChecks } from '../useAssetStatus'

function statusChecksFor(status: AssetCurrentStatus | undefined) {
  return useAssetStatusChecks(computed(() => status))
}

describe('useAssetStatusChecks', () => {
  it('returns currentStatus reflecting the input ref', () => {
    const status = ref<AssetCurrentStatus | undefined>(AssetCurrentStatus.IN_STORE)
    const { currentStatus } = useAssetStatusChecks(status)
    expect(currentStatus.value).toBe(AssetCurrentStatus.IN_STORE)
  })

  it('reacts to input changes', () => {
    const status = ref<AssetCurrentStatus | undefined>(AssetCurrentStatus.IN_STORE)
    const { currentStatus, canScrap } = useAssetStatusChecks(status)
    status.value = AssetCurrentStatus.BROKEN
    expect(currentStatus.value).toBe(AssetCurrentStatus.BROKEN)
    expect(canScrap.value).toBe(true)
  })

  it('returns false for all checks when status is undefined', () => {
    const checks = statusChecksFor(undefined)
    expect(checks.canMarkBroken.value).toBe(false)
    expect(checks.canMarkLost.value).toBe(false)
    expect(checks.canFound.value).toBe(false)
    expect(checks.canRepair.value).toBe(false)
    expect(checks.canRepairDone.value).toBe(false)
    expect(checks.canRepairFailed.value).toBe(false)
    expect(checks.canScrap.value).toBe(false)
  })

  it('canMarkBroken and canMarkLost are true for in_store/in_use/recycled_pending', () => {
    for (const s of [
      AssetCurrentStatus.IN_STORE,
      AssetCurrentStatus.IN_USE,
      AssetCurrentStatus.RECYCLED_PENDING,
    ]) {
      const checks = statusChecksFor(s)
      expect(checks.canMarkBroken.value).toBe(true)
      expect(checks.canMarkLost.value).toBe(true)
    }
  })

  it('canMarkBroken and canMarkLost are false for other statuses', () => {
    for (const s of [
      AssetCurrentStatus.BROKEN,
      AssetCurrentStatus.REPAIRING,
      AssetCurrentStatus.LOST,
      AssetCurrentStatus.DAMAGED,
      AssetCurrentStatus.SCRAPPED,
    ]) {
      const checks = statusChecksFor(s)
      expect(checks.canMarkBroken.value).toBe(false)
      expect(checks.canMarkLost.value).toBe(false)
    }
  })

  it('canFound is true only for lost', () => {
    expect(statusChecksFor(AssetCurrentStatus.LOST).canFound.value).toBe(true)
    for (const s of [
      AssetCurrentStatus.IN_STORE,
      AssetCurrentStatus.IN_USE,
      AssetCurrentStatus.REPAIRING,
      AssetCurrentStatus.BROKEN,
      AssetCurrentStatus.RECYCLED_PENDING,
    ]) {
      expect(statusChecksFor(s).canFound.value).toBe(false)
    }
  })

  it('canRepair is true only for broken', () => {
    expect(statusChecksFor(AssetCurrentStatus.BROKEN).canRepair.value).toBe(true)
    expect(statusChecksFor(AssetCurrentStatus.REPAIRING).canRepair.value).toBe(false)
    expect(statusChecksFor(AssetCurrentStatus.IN_USE).canRepair.value).toBe(false)
  })

  it('canRepairDone and canRepairFailed are true only for repairing', () => {
    const repairing = statusChecksFor(AssetCurrentStatus.REPAIRING)
    expect(repairing.canRepairDone.value).toBe(true)
    expect(repairing.canRepairFailed.value).toBe(true)

    const broken = statusChecksFor(AssetCurrentStatus.BROKEN)
    expect(broken.canRepairDone.value).toBe(false)
    expect(broken.canRepairFailed.value).toBe(false)
  })

  it('canScrap is true for broken/lost/recycled_pending', () => {
    for (const s of [
      AssetCurrentStatus.BROKEN,
      AssetCurrentStatus.LOST,
      AssetCurrentStatus.RECYCLED_PENDING,
    ]) {
      expect(statusChecksFor(s).canScrap.value).toBe(true)
    }
  })

  it('canScrap is false for in_use/in_store/repairing', () => {
    for (const s of [
      AssetCurrentStatus.IN_USE,
      AssetCurrentStatus.IN_STORE,
      AssetCurrentStatus.REPAIRING,
    ]) {
      expect(statusChecksFor(s).canScrap.value).toBe(false)
    }
  })
})
