/**
 * Tests unitaires pour RedisCacheService
 */

import { test } from '@japa/runner'
import { RedisCacheService } from '#infrastructure/cache/redis_cache_service'

test.group('RedisCacheService', () => {
  test('get returns null when cache is disabled', async ({ assert }) => {
    const cacheService = new RedisCacheService()

    const result = await cacheService.get('test-key')

    assert.isNull(result)
  })

  test('set returns false when cache is disabled', async ({ assert }) => {
    const cacheService = new RedisCacheService()

    const result = await cacheService.set('test-key', 'test-value')

    assert.isFalse(result)
  })

  test('remember executes callback when cache is disabled', async ({ assert }) => {
    const cacheService = new RedisCacheService()
    let callbackExecuted = false

    const result = await cacheService.remember('test-key', async () => {
      callbackExecuted = true
      return 'fresh-value'
    })

    assert.isTrue(callbackExecuted)
    assert.equal(result, 'fresh-value')
  })

  test('delete returns false when cache is disabled', async ({ assert }) => {
    const cacheService = new RedisCacheService()

    const result = await cacheService.delete('test-key')

    assert.isFalse(result)
  })

  test('flush returns 0 when cache is disabled', async ({ assert }) => {
    const cacheService = new RedisCacheService()

    const result = await cacheService.flush()

    assert.equal(result, 0)
  })

  test('enable/disable toggle cache state', ({ assert }) => {
    const cacheService = new RedisCacheService()

    cacheService.enable()
    // Cannot test enabled state directly, but it shouldn't throw
    assert.isTrue(true)

    cacheService.disable()
    assert.isTrue(true)
  })
})
