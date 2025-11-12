import { describe, it, expect } from 'bun:test'
import { cn } from './utils'

/**
 * cn() Utility Function Tests
 *
 * Tests the className utility that combines clsx and tailwind-merge
 * to conditionally join classNames and resolve Tailwind conflicts.
 */

describe('cn', () => {
  describe('basic functionality', () => {
    it('should return empty string when no arguments provided', () => {
      // Act
      const result = cn()

      // Assert
      expect(result).toBe('')
    })

    it('should return single className unchanged', () => {
      // Act
      const result = cn('text-red-500')

      // Assert
      expect(result).toBe('text-red-500')
    })

    it('should combine multiple classNames', () => {
      // Act
      const result = cn('text-red-500', 'bg-blue-500', 'p-4')

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500 p-4')
    })

    it('should handle array of classNames', () => {
      // Act
      const result = cn(['text-red-500', 'bg-blue-500'])

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle nested arrays', () => {
      // Act
      const result = cn(['text-red-500', ['bg-blue-500', 'p-4']])

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500 p-4')
    })
  })

  describe('conditional classNames (clsx behavior)', () => {
    it('should include className when condition is true', () => {
      // Act
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': false,
      })

      // Assert
      expect(result).toBe('text-red-500')
    })

    it('should handle multiple conditional classNames', () => {
      // Arrange
      const isError = true
      const isLoading = false
      const isSuccess = true

      // Act
      const result = cn({
        'text-red-500': isError,
        'animate-spin': isLoading,
        'bg-green-500': isSuccess,
      })

      // Assert - twMerge keeps last text color when there's a conflict
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-green-500')
      expect(result).not.toContain('animate-spin')
    })

    it('should mix conditional and static classNames', () => {
      // Act
      const result = cn(
        'p-4',
        {
          'text-red-500': true,
          'bg-blue-500': false,
        },
        'm-2'
      )

      // Assert
      expect(result).toContain('p-4')
      expect(result).toContain('text-red-500')
      expect(result).toContain('m-2')
      expect(result).not.toContain('bg-blue-500')
    })
  })

  describe('Tailwind conflict resolution (twMerge behavior)', () => {
    it('should resolve conflicting text colors (last one wins)', () => {
      // Act
      const result = cn('text-red-500', 'text-blue-500')

      // Assert
      expect(result).toBe('text-blue-500')
      expect(result).not.toContain('text-red-500')
    })

    it('should resolve conflicting background colors', () => {
      // Act
      const result = cn('bg-red-500', 'bg-blue-500', 'bg-green-500')

      // Assert
      expect(result).toBe('bg-green-500')
      expect(result).not.toContain('bg-red-500')
      expect(result).not.toContain('bg-blue-500')
    })

    it('should resolve conflicting padding utilities', () => {
      // Act
      const result = cn('p-4', 'p-8')

      // Assert
      expect(result).toBe('p-8')
      expect(result).not.toContain('p-4')
    })

    it('should resolve conflicting margin utilities', () => {
      // Act
      const result = cn('m-2', 'm-4', 'm-8')

      // Assert
      expect(result).toBe('m-8')
    })

    it('should keep non-conflicting utilities', () => {
      // Act
      const result = cn('text-red-500', 'bg-blue-500', 'p-4', 'bg-green-500')

      // Assert
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-green-500')
      expect(result).toContain('p-4')
      expect(result).not.toContain('bg-blue-500')
    })

    it('should resolve directional conflicts (px overrides pl and pr)', () => {
      // Act
      const result = cn('pl-4', 'pr-4', 'px-8')

      // Assert
      expect(result).toBe('px-8')
      expect(result).not.toContain('pl-4')
      expect(result).not.toContain('pr-4')
    })

    it('should resolve responsive variants correctly', () => {
      // Act
      const result = cn('text-base', 'md:text-lg', 'md:text-xl')

      // Assert
      expect(result).toContain('text-base')
      expect(result).toContain('md:text-xl')
      expect(result).not.toContain('md:text-lg')
    })
  })

  describe('edge cases and special values', () => {
    it('should handle undefined values', () => {
      // Act
      const result = cn('text-red-500', undefined, 'bg-blue-500')

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle null values', () => {
      // Act
      const result = cn('text-red-500', null, 'bg-blue-500')

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle false values', () => {
      // Act
      const result = cn('text-red-500', false, 'bg-blue-500')

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle empty strings', () => {
      // Act
      const result = cn('text-red-500', '', 'bg-blue-500')

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle mixed falsy values', () => {
      // Act
      const result = cn(
        'text-red-500',
        undefined,
        null,
        false,
        '',
        'bg-blue-500'
      )

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should trim whitespace', () => {
      // Act
      const result = cn('  text-red-500  ', '  bg-blue-500  ')

      // Assert
      expect(result).toBe('text-red-500 bg-blue-500')
    })
  })

  describe('real-world component usage patterns', () => {
    it('should handle button variant pattern', () => {
      // Arrange
      const variant = 'primary'
      const size = 'lg'

      // Act
      const result = cn('btn', {
        'btn-primary': variant === 'primary',
        'btn-secondary': variant === 'secondary',
        'btn-sm': size === 'sm',
        'btn-lg': size === 'lg',
      })

      // Assert
      expect(result).toBe('btn btn-primary btn-lg')
    })

    it('should handle disabled state pattern', () => {
      // Arrange
      const isDisabled = true

      // Act
      const result = cn('px-4 py-2 rounded', {
        'bg-blue-500 hover:bg-blue-600': !isDisabled,
        'bg-gray-300 cursor-not-allowed': isDisabled,
      })

      // Assert
      expect(result).toContain('px-4')
      expect(result).toContain('py-2')
      expect(result).toContain('rounded')
      expect(result).toContain('bg-gray-300')
      expect(result).toContain('cursor-not-allowed')
      expect(result).not.toContain('bg-blue-500')
    })

    it('should handle override pattern (base + props.className)', () => {
      // Arrange - Component default classes
      const baseClasses = 'text-sm text-gray-700 p-2'
      // User wants to override text color and size
      const propsClassName = 'text-lg text-red-500'

      // Act
      const result = cn(baseClasses, propsClassName)

      // Assert - User overrides should win
      expect(result).toContain('text-lg')
      expect(result).toContain('text-red-500')
      expect(result).toContain('p-2')
      expect(result).not.toContain('text-sm')
      expect(result).not.toContain('text-gray-700')
    })

    it('should handle complex conditional with multiple states', () => {
      // Arrange
      const isActive = true
      const isHovered = false
      const hasError = false

      // Act
      const result = cn(
        'flex items-center gap-2',
        {
          'bg-blue-50 border-blue-500': isActive && !hasError,
          'bg-blue-100': isActive && isHovered && !hasError,
          'bg-red-50 border-red-500': hasError,
          'border-gray-200': !isActive && !hasError,
        },
        'p-4 rounded-lg'
      )

      // Assert
      expect(result).toContain('flex')
      expect(result).toContain('items-center')
      expect(result).toContain('gap-2')
      expect(result).toContain('bg-blue-50')
      expect(result).toContain('border-blue-500')
      expect(result).toContain('p-4')
      expect(result).toContain('rounded-lg')
      expect(result).not.toContain('bg-red-50')
      expect(result).not.toContain('border-gray-200')
    })

    it('should handle responsive design pattern', () => {
      // Act
      const result = cn(
        'text-sm md:text-base lg:text-lg',
        'p-2 md:p-4 lg:p-6',
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      )

      // Assert
      expect(result).toContain('text-sm')
      expect(result).toContain('md:text-base')
      expect(result).toContain('lg:text-lg')
      expect(result).toContain('grid-cols-1')
      expect(result).toContain('md:grid-cols-2')
      expect(result).toContain('lg:grid-cols-3')
    })

    it('should handle dark mode pattern', () => {
      // Act
      const result = cn(
        'bg-white dark:bg-gray-900',
        'text-gray-900 dark:text-gray-100',
        'border-gray-200 dark:border-gray-700'
      )

      // Assert
      expect(result).toContain('bg-white')
      expect(result).toContain('dark:bg-gray-900')
      expect(result).toContain('text-gray-900')
      expect(result).toContain('dark:text-gray-100')
    })
  })

  describe('performance and edge cases', () => {
    it('should handle many classNames efficiently', () => {
      // Arrange
      const classes = Array(50)
        .fill(0)
        .map((_, i) => `class-${i}`)

      // Act
      const result = cn(...classes)

      // Assert
      expect(result).toContain('class-0')
      expect(result).toContain('class-49')
    })

    it('should handle duplicate classNames', () => {
      // Act
      const result = cn(
        'text-red-500',
        'bg-blue-500',
        'text-red-500',
        'bg-blue-500'
      )

      // Assert - twMerge should keep last occurrence of conflicts
      const parts = result.split(' ')
      expect(
        parts.filter((p) => p === 'text-red-500').length
      ).toBeLessThanOrEqual(1)
      expect(
        parts.filter((p) => p === 'bg-blue-500').length
      ).toBeLessThanOrEqual(1)
    })
  })
})
