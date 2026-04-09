import { test } from '@japa/runner'

test.group('HTTP auth and validation', () => {
  test('rejects unauthenticated access to protected lobbies and games endpoints', async ({
    client,
  }) => {
    const lobbiesResponse = await client.get('/api/v1/lobbies').header('accept', 'application/json')
    lobbiesResponse.assertStatus(401)

    const historyResponse = await client
      .get('/api/v1/games/me/history')
      .header('accept', 'application/json')
    historyResponse.assertStatus(401)
  })

  test('reports unauthenticated status on auth check endpoint', async ({ client, assert }) => {
    const response = await client.get('/api/v1/auth/check').header('accept', 'application/json')
    response.assertStatus(200)

    const payload = response.body()
    assert.equal(payload.authenticated, false)
    assert.isNull(payload.user)
  })

  test('validates capabilities query on public game catalog endpoint', async ({ client, assert }) => {
    const invalidResponse = await client.get('/api/v1/games/catalog').qs({
      capabilities: 'unsupported-capability',
    })
    invalidResponse.assertStatus(400)

    const validResponse = await client.get('/api/v1/games/catalog').qs({
      capabilities: 'turn-based,replay',
    })
    validResponse.assertStatus(200)

    const payload = validResponse.body()
    assert.isArray(payload.games)
    assert.equal(payload.meta?.includeProprietary, false)
  })
})
