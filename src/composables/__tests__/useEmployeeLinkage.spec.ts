import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useEmployeeLinkage } from '../useEmployeeLinkage'

describe('useEmployeeLinkage', () => {
  let mockGetCodeByName: ReturnType<typeof vi.fn>
  let mockGetNameByCode: ReturnType<typeof vi.fn>
  let mockOnUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCodeByName = vi.fn().mockResolvedValue(null)
    mockGetNameByCode = vi.fn().mockResolvedValue(null)
    mockOnUpdate = vi.fn()
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { name, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      expect(name.value).toBe('')
      expect(code.value).toBe('')
    })
  })

  describe('handleNameChange', () => {
    it('fetches code by name and updates', async () => {
      mockGetCodeByName.mockResolvedValue('EMP-001')

      const { handleNameChange, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleNameChange('John')

      expect(code.value).toBe('EMP-001')
      expect(mockOnUpdate).toHaveBeenCalledWith('John', 'EMP-001')
    })

    it('clears code when name is empty', async () => {
      const { handleNameChange, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      code.value = 'OLD-CODE'
      await handleNameChange('')

      expect(code.value).toBe('')
      expect(mockOnUpdate).toHaveBeenCalledWith('', '')
    })

    it('trims whitespace from name', async () => {
      mockGetCodeByName.mockResolvedValue('EMP-001')

      const { handleNameChange } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleNameChange('  John  ')

      expect(mockGetCodeByName).toHaveBeenCalledWith('John')
    })

    it('does not re-enter during update', async () => {
      mockGetCodeByName.mockImplementation(async () => {
        return 'EMP-001'
      })

      const { handleNameChange } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      const promise = handleNameChange('John')
      await promise

      expect(mockGetCodeByName).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleCodeChange', () => {
    it('fetches name by code and updates', async () => {
      mockGetNameByCode.mockResolvedValue('Alice')

      const { handleCodeChange, name } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleCodeChange('EMP-002')

      expect(name.value).toBe('Alice')
      expect(mockOnUpdate).toHaveBeenCalledWith('Alice', 'EMP-002')
    })

    it('clears name when code is empty', async () => {
      const { handleCodeChange, name } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      name.value = 'OLD-NAME'
      await handleCodeChange('')

      expect(name.value).toBe('')
      expect(mockOnUpdate).toHaveBeenCalledWith('', '')
    })

    it('trims whitespace from code', async () => {
      mockGetNameByCode.mockResolvedValue('Alice')

      const { handleCodeChange } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleCodeChange('  EMP-002  ')

      expect(mockGetNameByCode).toHaveBeenCalledWith('EMP-002')
    })
  })

  describe('setName', () => {
    it('sets name and triggers code lookup', async () => {
      mockGetCodeByName.mockResolvedValue('EMP-001')

      const { setName, name, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await setName('John')

      expect(name.value).toBe('John')
      expect(code.value).toBe('EMP-001')
      expect(mockOnUpdate).toHaveBeenCalledWith('John', 'EMP-001')
    })

    it('handles non-string input gracefully', async () => {
      mockGetCodeByName.mockResolvedValue(null)

      const { setName, name } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await setName(undefined as unknown as string)

      expect(name.value).toBe('')
    })
  })

  describe('setCode', () => {
    it('sets code and triggers name lookup', async () => {
      mockGetNameByCode.mockResolvedValue('Alice')

      const { setCode, name, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await setCode('EMP-002')

      expect(code.value).toBe('EMP-002')
      expect(name.value).toBe('Alice')
      expect(mockOnUpdate).toHaveBeenCalledWith('Alice', 'EMP-002')
    })

    it('handles non-string input gracefully', async () => {
      mockGetNameByCode.mockResolvedValue(null)

      const { setCode, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await setCode(undefined as unknown as string)

      expect(code.value).toBe('')
    })
  })

  describe('edge cases', () => {
    it('handles null return from getCodeByName', async () => {
      mockGetCodeByName.mockResolvedValue(null)

      const { handleNameChange, code } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleNameChange('Unknown')

      expect(code.value).toBe('')
      expect(mockOnUpdate).toHaveBeenCalledWith('Unknown', '')
    })

    it('handles null return from getNameByCode', async () => {
      mockGetNameByCode.mockResolvedValue(null)

      const { handleCodeChange, name } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleCodeChange('UNKNOWN')

      expect(name.value).toBe('')
      expect(mockOnUpdate).toHaveBeenCalledWith('', 'UNKNOWN')
    })

    it('handles undefined return from getNameByCode', async () => {
      mockGetNameByCode.mockResolvedValue(undefined)

      const { handleCodeChange, name } = useEmployeeLinkage(
        mockGetCodeByName, mockGetNameByCode, mockOnUpdate,
      )

      await handleCodeChange('EMP-001')

      expect(name.value).toBe('')
      expect(mockOnUpdate).toHaveBeenCalledWith('', 'EMP-001')
    })
  })
})
