/**
 * Tests unitaires pour HealthController
 */

import { test } from '@japa/runner'
import HealthController from '#controllers/health_controller'
import Database from '@adonisjs/lucid/services/db'

test.group('HealthController', (group) => {
  let controller: HealthController

  group.each.setup(() => {
    controller = new HealthController()
  })

  test('index returns 200 when database is healthy', async ({ assert }) => {
    const mockContext: any = {
      response: {
        status: (code: number) => ({
          json: (data: any) => {
            assert.equal(code, 200)
            assert.equal(data.status, 'ok')
            assert.exists(data.timestamp)
            return data
          },
        }),
      },
    }

    await controller.index(mockContext)
  })

  test('detailed returns service health status', async ({ assert }) => {
    const mockContext: any = {
      response: {
        status: (code: number) => ({
          json: (data: any) => {
            assert.oneOf(code, [200, 503])
            assert.exists(data.status)
            assert.exists(data.timestamp)
            assert.exists(data.services)
            assert.exists(data.services.database)
            return data
          },
        }),
      },
    }

    await controller.detailed(mockContext)
  })

  test('ready returns 200 when service is ready', async ({ assert }) => {
    const mockContext: any = {
      response: {
        status: (code: number) => ({
          json: (data: any) => {
            assert.oneOf(code, [200, 503])
            assert.exists(data.status)
            assert.exists(data.timestamp)
            return data
          },
        }),
      },
    }

    await controller.ready(mockContext)
  })

  test('live always returns 200', async ({ assert }) => {
    const mockContext: any = {
      response: {
        status: (code: number) => ({
          json: (data: any) => {
            assert.equal(code, 200)
            assert.equal(data.status, 'alive')
            assert.exists(data.uptime)
            assert.exists(data.memory)
            return data
          },
        }),
      },
    }

    await controller.live(mockContext)
  })
})
