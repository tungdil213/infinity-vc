import { test } from '@japa/runner'
import { buildDevRoutesSnapshot } from '../../../app/controllers/dev_routes_controller.js'

test.group('buildDevRoutesSnapshot', () => {
  test('groups routes by feature area and keeps deterministic ordering', ({ assert }) => {
    const groups = buildDevRoutesSnapshot({
      root: [
        { methods: ['GET', 'HEAD'], pattern: '/', name: 'home' },
        { methods: ['GET'], pattern: '/auth/login', name: 'auth.login.show' },
        { methods: ['POST'], pattern: '/auth/logout', name: 'auth.logout' },
        { methods: ['GET'], pattern: '/lobbies', name: 'lobbies.index' },
        { methods: ['GET'], pattern: '/api/v1/auth/check', name: 'api.auth.check' },
        { methods: ['POST'], pattern: '/__transmit/subscribe', name: 'transmit.subscribe' },
        { methods: ['GET'], pattern: '/dev/routes', name: 'dev.routes' },
      ],
    })

    assert.deepEqual(
      groups.map((group) => group.group),
      [
        'Public Routes',
        'Authentication Routes (Public)',
        'Authentication Routes (Protected)',
        'Lobbies Routes (Protected)',
        'API Routes',
        'Transmit Routes (Protected)',
        'Development Routes',
      ]
    )

    const publicRoutes = groups.find((group) => group.group === 'Public Routes')
    assert.deepEqual(publicRoutes?.routes, [
      { method: 'GET', path: '/', name: 'home', description: 'Home page' },
    ])
  })

  test('deduplicates same method/path/name across domains', ({ assert }) => {
    const groups = buildDevRoutesSnapshot({
      root: [{ methods: ['GET'], pattern: '/api/v1/auth/check', name: 'api.auth.check' }],
      'example.com': [{ methods: ['GET'], pattern: '/api/v1/auth/check', name: 'api.auth.check' }],
    })

    const apiGroup = groups.find((group) => group.group === 'API Routes')
    assert.exists(apiGroup)
    assert.lengthOf(apiGroup!.routes, 1)
    assert.deepEqual(apiGroup!.routes[0], {
      method: 'GET',
      path: '/api/v1/auth/check',
      name: 'api.auth.check',
      description: 'API endpoint',
    })
  })
})
