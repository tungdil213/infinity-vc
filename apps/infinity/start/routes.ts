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

// Public routes
router.get('/', '#controllers/simple_lobbies_controller.welcome').as('home')

// Development routes (only in dev mode)
router.get('/dev/routes', '#controllers/dev_routes_controller.index').as('dev.routes')

// Authentication routes
router
  .group(() => {
    router.get('/login', '#controllers/enhanced_auth_controller.showLogin').as('auth.login.show')
    router.post('/login', '#controllers/enhanced_auth_controller.login').as('auth.login')
    router
      .get('/register', '#controllers/enhanced_auth_controller.showRegister')
      .as('auth.register.show')
    router.post('/register', '#controllers/enhanced_auth_controller.register').as('auth.register')
  })
  .prefix('/auth')

// Authentication required routes
router
  .group(() => {
    // Auth actions
    router.post('/auth/logout', '#controllers/enhanced_auth_controller.logout').as('auth.logout')

    // Lobbies routes
    router.get('/lobbies', '#controllers/enhanced_lobbies_controller.index').as('lobbies.index')
    router
      .get('/lobbies/create', '#controllers/enhanced_lobbies_controller.create')
      .as('lobbies.create')
    router.post('/lobbies', '#controllers/enhanced_lobbies_controller.store').as('lobbies.store')
    router.get('/lobbies/:uuid', '#controllers/enhanced_lobbies_controller.show').as('lobbies.show')
    router
      .post('/lobbies/:uuid/join', '#controllers/enhanced_lobbies_controller.join')
      .as('lobbies.join')
    router
      .post('/lobbies/:uuid/leave', '#controllers/enhanced_lobbies_controller.leave')
      .as('lobbies.leave')
    router
      .post('/lobbies/:uuid/start', '#controllers/enhanced_lobbies_controller.start')
      .as('lobbies.start')

    // Advanced lobby management (owner only)
    router
      .post('/lobbies/:uuid/kick', '#controllers/enhanced_lobbies_controller.kickPlayer')
      .as('lobbies.kick')
    router
      .post('/lobbies/:uuid/transfer', '#controllers/enhanced_lobbies_controller.transferOwnership')
      .as('lobbies.transfer')

    // Games routes
    router.get('/games/:uuid', '#controllers/games_controller.show').as('games.show')
    router.post('/games/:uuid/leave', '#controllers/games_controller.leave').as('games.leave')
  })
  .use(middleware.auth())

// Public invitation routes (can be accessed without auth)
router
  .get('/lobbies/join/:invitationCode', '#controllers/enhanced_lobbies_controller.showJoinByInvite')
  .as('lobbies.join.invite.show')
router
  .post('/lobbies/join/:invitationCode', '#controllers/enhanced_lobbies_controller.joinByInvite')
  .as('lobbies.join.invite')

// API routes
router
  .group(() => {
    // Auth API
    router.get('/auth/me', '#controllers/enhanced_auth_controller.me').as('api.auth.me')
    router.get('/auth/check', '#controllers/enhanced_auth_controller.check').as('api.auth.check')

    // Lobbies API
    router
      .get('/lobbies', '#controllers/enhanced_lobbies_controller.apiIndex')
      .as('api.lobbies.index')
    router
      .get('/lobbies/:uuid', '#controllers/enhanced_lobbies_controller.apiShow')
      .as('api.lobbies.show')

    // Games API
    router.get('/games/:uuid', '#controllers/games_controller.apiShow').as('api.games.show')
    router
      .post('/games/:uuid/action', '#controllers/games_controller.action')
      .as('api.games.action')
  })
  .prefix('/api/v1')
  .use(middleware.auth())

// SSE routes
router
  .group(() => {
    router.get('/connect', '#controllers/sse_controller.connect').as('sse.connect')
    router.post('/subscribe', '#controllers/sse_controller.subscribe').as('sse.subscribe')
    router.post('/unsubscribe', '#controllers/sse_controller.unsubscribe').as('sse.unsubscribe')
    router.get('/stats', '#controllers/sse_controller.stats').as('sse.stats')
  })
  .prefix('/api/v1/sse')
  .use(middleware.auth())
