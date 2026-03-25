/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import { middleware } from './kernel.js'
import transmit from '@adonisjs/transmit/services/main'
import './transmit.js'

// Public routes
router.get('/', '#controllers/enhanced_lobbies_controller.welcome').as('home')

// Development routes (registered only in dev mode)
if (app.inDev) {
  router.get('/dev/routes', '#controllers/dev_routes_controller.index').as('dev.routes')
}

// Authentication routes
router
  .group(() => {
    router.get('/login', '#controllers/enhanced_auth_controller.showLogin').as('auth.login.show')
    router
      .post('/login', '#controllers/enhanced_auth_controller.login')
      .use(middleware.loginThrottle())
      .as('auth.login')
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

    // Profile & settings
    router
      .get('/profile', '#controllers/profile_settings_controller.showProfile')
      .as('profile.show')
    router
      .get('/settings', '#controllers/profile_settings_controller.showSettings')
      .as('settings.show')
    router
      .post('/settings/profile', '#controllers/profile_settings_controller.updateProfile')
      .as('settings.profile.update')
    router
      .post('/settings/password', '#controllers/profile_settings_controller.updatePassword')
      .as('settings.password.update')

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
      .post('/lobbies/leave-on-close', '#controllers/enhanced_lobbies_controller.leaveOnClose')
      .as('lobbies.leave.close')
    router
      .post('/lobbies/:uuid/heartbeat', '#controllers/enhanced_lobbies_controller.heartbeat')
      .as('lobbies.heartbeat')
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

    // Moderation actions
    router
      .post('/lobbies/:uuid/close', '#controllers/enhanced_lobbies_controller.adminClose')
      .use(middleware.moderationGuard())
      .as('lobbies.close')

    // Games routes
    router.get('/games/:uuid/resume', '#controllers/games_controller.resume').as('games.resume')
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

// API Auth routes (no auth middleware, returns authenticated flag)
router
  .group(() => {
    router.get('/auth/me', '#controllers/enhanced_auth_controller.me').as('api.auth.me')
    router.get('/auth/check', '#controllers/enhanced_auth_controller.check').as('api.auth.check')
    router
      .get('/games/catalog', '#controllers/game_catalog_controller.publicIndex')
      .as('api.games.catalog')
  })
  .prefix('/api/v1')

// API routes - protected by auth middleware
router
  .group(() => {
    // Lobbies API
    router
      .get('/lobbies', '#controllers/enhanced_lobbies_controller.apiIndex')
      .as('api.lobbies.index')
    router
      .get('/lobbies/:uuid', '#controllers/enhanced_lobbies_controller.apiShow')
      .as('api.lobbies.show')
    router
      .post('/lobbies/:uuid/join', '#controllers/enhanced_lobbies_controller.join')
      .as('api.lobbies.join')
    router
      .post('/lobbies/:uuid/leave', '#controllers/enhanced_lobbies_controller.leave')
      .as('api.lobbies.leave')
    router
      .post('/lobbies/leave-on-close', '#controllers/enhanced_lobbies_controller.leaveOnClose')
      .as('api.lobbies.leave.close')
    router
      .post('/lobbies/:uuid/heartbeat', '#controllers/enhanced_lobbies_controller.heartbeat')
      .as('api.lobbies.heartbeat')
    router
      .post('/lobbies/:uuid/start', '#controllers/enhanced_lobbies_controller.start')
      .as('api.lobbies.start')
    router
      .post('/lobbies/:uuid/close', '#controllers/enhanced_lobbies_controller.adminClose')
      .use(middleware.moderationGuard())
      .as('api.lobbies.close')

    // Games API
    router
      .get('/games/me/active', '#controllers/games_controller.myActive')
      .as('api.games.my.active')
    router
      .get('/games/me/history', '#controllers/games_controller.myHistory')
      .as('api.games.my.history')
    router.get('/games/me/stats', '#controllers/games_controller.myStats').as('api.games.my.stats')
    router.get('/games/:uuid', '#controllers/games_controller.apiShow').as('api.games.show')
    router.get('/games/:uuid/replay', '#controllers/games_controller.replay').as('api.games.replay')
    router
      .get('/games/:uuid/actions', '#controllers/games_controller.getActions')
      .as('api.games.actions')
    router
      .get('/games/:uuid/players', '#controllers/games_controller.getPlayers')
      .as('api.games.players')
    router
      .post('/games/:uuid/action', '#controllers/games_controller.action')
      .as('api.games.action')
  })
  .prefix('/api/v1')
  .use(middleware.auth())

// Admin API routes - includes proprietary game modules in catalog
router
  .group(() => {
    router
      .post('/lobbies/:uuid/close', '#controllers/enhanced_lobbies_controller.adminClose')
      .as('admin.lobbies.close')
  })
  .prefix('/admin/api')
  .use([middleware.auth(), middleware.moderationGuard()])

// Admin API routes - includes proprietary game modules in catalog
router
  .group(() => {
    router
      .get('/games/catalog', '#controllers/game_catalog_controller.adminIndex')
      .as('admin.games.catalog')
  })
  .prefix('/admin/api')
  .use([middleware.auth(), middleware.adminGuard()])

// Transmit routes
// Keep SSE endpoint reachable to avoid noisy connection failures.
// Channel-level authorization (see start/transmit.ts) remains the source of truth.
transmit.registerRoutes()
