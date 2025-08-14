import { beforeEach, afterEach } from '@jest/globals'

// Global test setup
beforeEach(() => {
  // Reset any global state before each test
  // This ensures test isolation
})

afterEach(() => {
  // Clean up after each test
  // Clear any timers, mocks, etc.
})

// Mock crypto.randomUUID for consistent testing
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
  } as any
}

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Custom matchers can be added here
    }
  }
}
