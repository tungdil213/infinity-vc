import { test } from '@japa/runner'

test.group('Security routes', () => {
  test('/dev/routes is not exposed outside development mode', async ({ client }) => {
    const response = await client.get('/dev/routes')
    response.assertStatus(404)
  })
})
