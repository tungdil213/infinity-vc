import { type HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

export default class DevRoutesController {
  /**
   * Show all available routes in development
   */
  async index({ inertia }: HttpContext) {
    // Only available in development
    if (!app.inDev) {
      return inertia.render('errors/not_found', {})
    }

    const routes = [
      {
        group: 'Public Routes',
        routes: [{ method: 'GET', path: '/', name: 'home', description: 'Home page' }],
      },
      {
        group: 'Authentication Routes (Public)',
        routes: [
          {
            method: 'GET',
            path: '/auth/login',
            name: 'auth.login.show',
            description: 'Login form',
          },
          {
            method: 'POST',
            path: '/auth/login',
            name: 'auth.login',
            description: 'User login',
          },
          {
            method: 'GET',
            path: '/auth/register',
            name: 'auth.register.show',
            description: 'Registration form',
          },
          {
            method: 'POST',
            path: '/auth/register',
            name: 'auth.register',
            description: 'User registration',
          },
        ],
      },
      {
        group: 'Authentication Routes (Protected)',
        routes: [
          {
            method: 'POST',
            path: '/auth/logout',
            name: 'auth.logout',
            description: 'User logout',
          },
        ],
      },
      {
        group: 'Lobbies Routes (Protected)',
        routes: [
          {
            method: 'GET',
            path: '/lobbies',
            name: 'lobbies.index',
            description: 'List lobbies',
          },
          {
            method: 'GET',
            path: '/lobbies/create',
            name: 'lobbies.create',
            description: 'Create lobby',
          },
          {
            method: 'POST',
            path: '/lobbies',
            name: 'lobbies.store',
            description: 'Save lobby',
          },
          {
            method: 'GET',
            path: '/lobbies/:uuid',
            name: 'lobbies.show',
            description: 'View lobby',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/join',
            name: 'lobbies.join',
            description: 'Join lobby',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/leave',
            name: 'lobbies.leave',
            description: 'Leave lobby',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/start',
            name: 'lobbies.start',
            description: 'Start game',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/kick',
            name: 'lobbies.kick',
            description: 'Kick player',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/transfer',
            name: 'lobbies.transfer',
            description: 'Transfer ownership',
          },
        ],
      },
      {
        group: 'Invitation Routes (Public)',
        routes: [
          {
            method: 'GET',
            path: '/lobbies/join/:invitationCode',
            name: 'lobbies.join.invite.show',
            description: 'Join via invitation',
          },
          {
            method: 'POST',
            path: '/lobbies/join/:invitationCode',
            name: 'lobbies.join.invite',
            description: 'Process invitation',
          },
        ],
      },
      {
        group: 'Games Routes (Protected)',
        routes: [
          { method: 'GET', path: '/games/:uuid', name: 'games.show', description: 'View game' },
          {
            method: 'POST',
            path: '/games/:uuid/leave',
            name: 'games.leave',
            description: 'Leave game',
          },
        ],
      },
      {
        group: 'API Routes (Protected)',
        routes: [
          {
            method: 'GET',
            path: '/api/v1/auth/me',
            name: 'api.auth.me',
            description: 'User profile',
          },
          {
            method: 'GET',
            path: '/api/v1/auth/check',
            name: 'api.auth.check',
            description: 'Check auth',
          },
          {
            method: 'GET',
            path: '/api/v1/lobbies',
            name: 'api.lobbies.index',
            description: 'API list lobbies',
          },
          {
            method: 'GET',
            path: '/api/v1/lobbies/:uuid',
            name: 'api.lobbies.show',
            description: 'API view lobby',
          },
          {
            method: 'GET',
            path: '/api/v1/games/:uuid',
            name: 'api.games.show',
            description: 'API view game',
          },
          {
            method: 'GET',
            path: '/api/v1/games/catalog',
            name: 'api.games.catalog',
            description: 'Public OSS game catalog',
          },
          {
            method: 'POST',
            path: '/api/v1/games/:uuid/action',
            name: 'api.games.action',
            description: 'API game action',
          },
          {
            method: 'GET',
            path: '/admin/api/games/catalog',
            name: 'admin.games.catalog',
            description: 'Admin catalog including proprietary games',
          },
        ],
      },
      {
        group: 'Transmit Routes (Protected)',
        routes: [
          {
            method: 'GET',
            path: '/__transmit/events?uid=<client_uid>',
            name: 'transmit.events',
            description: 'Transmit real-time stream',
          },
          {
            method: 'POST',
            path: '/__transmit/subscribe',
            name: 'transmit.subscribe',
            description: 'Subscribe to a Transmit channel',
          },
          {
            method: 'POST',
            path: '/__transmit/unsubscribe',
            name: 'transmit.unsubscribe',
            description: 'Unsubscribe from a Transmit channel',
          },
        ],
      },
      {
        group: 'Development Routes',
        routes: [
          {
            method: 'GET',
            path: '/dev/routes',
            name: 'dev.routes',
            description: 'This page - route list',
          },
        ],
      },
    ]

    return inertia.render('dev/routes', { routes })
  }
}
