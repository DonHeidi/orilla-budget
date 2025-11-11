import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

/**
 * useIsMobile Hook Tests
 *
 * Tests the mobile breakpoint detection hook that uses window.matchMedia
 * and window.innerWidth to determine if the viewport is mobile-sized.
 *
 * Mobile breakpoint: < 768px
 */

describe('useIsMobile', () => {
  // Store original window properties
  let originalInnerWidth: number
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    // Save original values
    originalInnerWidth = window.innerWidth
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    window.matchMedia = originalMatchMedia
  })

  describe('initial viewport detection', () => {
    it('should return true when viewport is mobile-sized (< 768px)', () => {
      // Arrange - Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone size
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(true)
    })

    it('should return false when viewport is desktop-sized (>= 768px)', () => {
      // Arrange - Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(false)
    })

    it('should return false when viewport is exactly at breakpoint (768px)', () => {
      // Arrange - Mock viewport at exact breakpoint
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert - 768px is NOT mobile (>= 768 is desktop)
      expect(result.current).toBe(false)
    })

    it('should return true when viewport is 1px below breakpoint (767px)', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(true)
    })
  })

  describe('common device sizes', () => {
    it('should detect iPhone SE (375px) as mobile', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(true)
    })

    it('should detect iPhone 12/13 Pro (390px) as mobile', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 390,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(true)
    })

    it('should detect iPad Mini (768px) as desktop', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(false)
    })

    it('should detect iPad Air (820px) as desktop', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 820,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(false)
    })

    it('should detect laptop (1024px) as desktop', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(false)
    })
  })

  describe('MediaQueryList integration', () => {
    it('should register MediaQueryList change listener', () => {
      // Arrange
      const listeners: Array<() => void> = []
      let addEventListenerCalled = false

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          addEventListenerCalled = true
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      renderHook(() => useIsMobile())

      // Assert
      expect(addEventListenerCalled).toBe(true)
      expect(listeners.length).toBe(1)
    })

    it('should use correct media query string', () => {
      // Arrange
      let capturedQuery = ''

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      window.matchMedia = (query: string) => {
        capturedQuery = query
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        } as MediaQueryList
      }

      // Act
      renderHook(() => useIsMobile())

      // Assert
      expect(capturedQuery).toBe('(max-width: 767px)')
    })

    it('should update when MediaQueryList change event fires', () => {
      // Arrange
      const listeners: Array<() => void> = []

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Start desktop
      })

      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      const { result, rerender } = renderHook(() => useIsMobile())

      // Assert initial state
      expect(result.current).toBe(false)

      // Act - Simulate viewport resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      // Trigger the change listener
      listeners.forEach(listener => listener())
      rerender()

      // Assert - Should now be mobile
      expect(result.current).toBe(true)
    })
  })

  describe('cleanup and memory management', () => {
    it('should remove event listener on unmount', () => {
      // Arrange
      const listeners: Array<() => void> = []
      let removeEventListenerCalled = false

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          removeEventListenerCalled = true
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { unmount } = renderHook(() => useIsMobile())
      unmount()

      // Assert
      expect(removeEventListenerCalled).toBe(true)
      expect(listeners.length).toBe(0)
    })

    it('should not have memory leaks on multiple mount/unmount cycles', () => {
      // Arrange
      const listeners: Array<() => void> = []

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act - Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() => useIsMobile())
        unmount()
      }

      // Assert - No listeners should remain
      expect(listeners.length).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very small viewport (320px)', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(true)
    })

    it('should handle very large viewport (4K: 3840px)', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 3840,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(result.current).toBe(false)
    })

    it('should return boolean (not undefined) after initial render', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      const listeners: Array<() => void> = []
      window.matchMedia = (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener)
          if (index > -1) listeners.splice(index, 1)
        },
        dispatchEvent: () => true,
      }) as MediaQueryList

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      expect(typeof result.current).toBe('boolean')
      expect(result.current).not.toBeUndefined()
    })
  })
})
