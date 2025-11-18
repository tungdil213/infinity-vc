/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import transmit from '@adonisjs/transmit/services/main'
import './transmit.js'

/**
 * DDD Controllers - Using lazy loading
 * Format: '#path/to/controller' loads the default export
 */

// Public routes (using new DDD controller)
router.get('/', '#domains/lobby/presentation/controllers/lobbies_controller.welcome').as('home')

// Development routes (only in dev mode)
router.get('/dev/routes', '#infrastructure/dev/dev_routes_controller.index').as('dev.routes')

// Health check
router.get('/health', '#infrastructure/health/health_controller.check').as('health')

// Authentication routes (DDD Controllers)
router
  .group(() => {
    router
      .get('/login', '#domains/iam/presentation/controllers/auth_controller.showLogin')
      .as('auth.login.show')
    router
      .post('/login', '#domains/iam/presentation/controllers/auth_controller.login')
      .as('auth.login')
    router
      .get('/register', '#domains/iam/presentation/controllers/auth_controller.showRegister')
      .as('auth.register.show')
    router
      .post('/register', '#domains/iam/presentation/controllers/auth_controller.register')
      .as('auth.register')
  })
  .prefix('/auth')

// Authentication required routes
router
  .group(() => {
    // Auth actions (DDD Controller)
    router
      .post('/auth/logout', '#domains/iam/presentation/controllers/auth_controller.logout')
      .as('auth.logout')

    // Lobbies routes (DDD Controller)
    router
      .get('/lobbies', '#domains/lobby/presentation/controllers/lobbies_controller.index')
      .as('lobbies.index')
    router
      .get(
        '/lobbies/create',
        '#domains/lobby/presentation/controllers/lobbies_controller.showCreateForm'
      )
      .as('lobbies.create')
    router
      .post('/lobbies', '#domains/lobby/presentation/controllers/lobbies_controller.store')
      .as('lobbies.store')
    router
      .get('/lobbies/:uuid', '#domains/lobby/presentation/controllers/lobbies_controller.show')
      .as('lobbies.show')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/join',
        '#domains/lobby/presentation/controllers/lobbies_controller.join'
      )
      .as('lobbies.join')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/leave',
        '#domains/lobby/presentation/controllers/lobbies_controller.leave'
      )
      .as('lobbies.leave')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/start',
        '#domains/lobby/presentation/controllers/lobbies_controller.start'
      )
      .as('lobbies.start')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/kick',
        '#domains/lobby/presentation/controllers/lobbies_controller.kickPlayer'
      )
      .as('lobbies.kick')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    // Debug route
    router
      .get('/transmit-debug', async ({ inertia }) => {
        return inertia.render('dev/transmit')
      })
      .as('transmit.debug')

    // Games routes (DDD Controller)
    router
      .get('/games/:uuid', '#domains/game_engine/presentation/controllers/games_controller.show')
      .as('games.show')
    router
      .post(
        '/games/:uuid/leave',
        '#domains/game_engine/presentation/controllers/games_controller.leave'
      )
      .as('games.leave')

    // TODO: Routes à implémenter dans les domaines
    // router.post('/lobbies/:uuid/transfer', '#domains/lobby/presentation/controllers/lobbies_controller.transferOwnership').as('lobbies.transfer')
    // router.post('/lobbies/leave-on-close', '#domains/lobby/presentation/controllers/lobbies_controller.leaveOnClose').as('lobbies.leave.close')
  })
  .use(middleware.auth())

// Public invitation routes (no auth required)
router
  .get(
    '/lobbies/join/:invitationCode',
    '#domains/lobby/presentation/controllers/lobbies_controller.showJoinByInvite'
  )
  .as('lobbies.join.invite.show')
router
  .post(
    '/lobbies/join/:invitationCode',
    '#domains/lobby/presentation/controllers/lobbies_controller.joinByInvite'
  )
  .as('lobbies.join.invite')

// API routes (DDD Controllers)
router
  .group(() => {
    // Auth API
    router
      .get('/auth/me', '#domains/iam/presentation/controllers/auth_controller.me')
      .as('api.auth.me')
    router
      .get('/auth/check', '#domains/iam/presentation/controllers/auth_controller.check')
      .as('api.auth.check')

    // Lobbies API
    router
      .get('/lobbies', '#domains/lobby/presentation/controllers/lobbies_controller.index')
      .as('api.lobbies.index')
    router
      .get('/lobbies/:uuid', '#domains/lobby/presentation/controllers/lobbies_controller.showApi')
      .as('api.lobbies.show')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/join',
        '#domains/lobby/presentation/controllers/lobbies_controller.join'
      )
      .as('api.lobbies.join')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/leave',
        '#domains/lobby/presentation/controllers/lobbies_controller.leave'
      )
      .as('api.lobbies.leave')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/kick',
        '#domains/lobby/presentation/controllers/lobbies_controller.kickPlayer'
      )
      .as('api.lobbies.kick')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    router
      .post(
        '/lobbies/:uuid/start',
        '#domains/lobby/presentation/controllers/lobbies_controller.startGame'
      )
      .as('api.lobbies.start')
      .where('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    // Games API
    router
      .get('/games/:uuid', '#domains/game_engine/presentation/controllers/games_controller.show')
      .as('api.games.show')

    // SSE (Server-Sent Events) routes
    router
      .get('/sse/connect', '#domains/lobby/infrastructure/sse/sse_http_controller.connect')
      .as('api.sse.connect')
    router
      .post('/sse/subscribe', '#domains/lobby/infrastructure/sse/sse_http_controller.subscribe')
      .as('api.sse.subscribe')
    router
      .post('/sse/unsubscribe', '#domains/lobby/infrastructure/sse/sse_http_controller.unsubscribe')
      .as('api.sse.unsubscribe')
    router
      .get('/sse/stats', '#domains/lobby/infrastructure/sse/sse_http_controller.stats')
      .as('api.sse.stats')
  })
  .prefix('/api/v1')
  .use(middleware.auth())

// Transmit routes
transmit.registerRoutes((route) => {
  // Ensure you are authenticated to register your client
  route.middleware(middleware.auth())
})

// TODO: Routes non-critiques à implémenter plus tard
// - Lobby synchronization
// - Transfer ownership
// - Leave on close (beacon)
// - Advanced game actions
