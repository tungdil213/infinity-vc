import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

export default class DevRoutesController {
  /**
   * Show all available routes in development
   */
  async index({ inertia }: HttpContext) {
    // Only available in development
    if (!app.inDev) {
      return inertia.render('errors/not_found')
    }

    const routes = [
      {
        group: 'Public Routes',
        routes: [{ method: 'GET', path: '/', name: 'home', description: "Page d'accueil" }],
      },
      {
        group: 'Authentication Routes (Public)',
        routes: [
          {
            method: 'GET',
            path: '/auth/login',
            name: 'auth.login.show',
            description: 'Formulaire de connexion',
          },
          {
            method: 'POST',
            path: '/auth/login',
            name: 'auth.login',
            description: 'Connexion utilisateur',
          },
          {
            method: 'GET',
            path: '/auth/register',
            name: 'auth.register.show',
            description: "Formulaire d'inscription",
          },
          {
            method: 'POST',
            path: '/auth/register',
            name: 'auth.register',
            description: 'Inscription utilisateur',
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
            description: 'Déconnexion utilisateur',
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
            description: 'Liste des lobbies',
          },
          {
            method: 'GET',
            path: '/lobbies/create',
            name: 'lobbies.create',
            description: 'Créer un lobby',
          },
          {
            method: 'POST',
            path: '/lobbies',
            name: 'lobbies.store',
            description: 'Sauvegarder un lobby',
          },
          {
            method: 'GET',
            path: '/lobbies/:uuid',
            name: 'lobbies.show',
            description: 'Voir un lobby',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/join',
            name: 'lobbies.join',
            description: 'Rejoindre un lobby',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/leave',
            name: 'lobbies.leave',
            description: 'Quitter un lobby',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/start',
            name: 'lobbies.start',
            description: 'Démarrer un jeu',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/kick',
            name: 'lobbies.kick',
            description: 'Expulser un joueur',
          },
          {
            method: 'POST',
            path: '/lobbies/:uuid/transfer',
            name: 'lobbies.transfer',
            description: 'Transférer la propriété',
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
            description: 'Rejoindre par invitation',
          },
          {
            method: 'POST',
            path: '/lobbies/join/:invitationCode',
            name: 'lobbies.join.invite',
            description: 'Traiter invitation',
          },
        ],
      },
      {
        group: 'Games Routes (Protected)',
        routes: [
          { method: 'GET', path: '/games/:uuid', name: 'games.show', description: 'Voir un jeu' },
          {
            method: 'POST',
            path: '/games/:uuid/leave',
            name: 'games.leave',
            description: 'Quitter un jeu',
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
            description: 'Profil utilisateur',
          },
          {
            method: 'GET',
            path: '/api/v1/auth/check',
            name: 'api.auth.check',
            description: 'Vérifier auth',
          },
          {
            method: 'GET',
            path: '/api/v1/lobbies',
            name: 'api.lobbies.index',
            description: 'API liste lobbies',
          },
          {
            method: 'GET',
            path: '/api/v1/lobbies/:uuid',
            name: 'api.lobbies.show',
            description: 'API voir lobby',
          },
          {
            method: 'GET',
            path: '/api/v1/games/:uuid',
            name: 'api.games.show',
            description: 'API voir jeu',
          },
          {
            method: 'POST',
            path: '/api/v1/games/:uuid/action',
            name: 'api.games.action',
            description: 'API action jeu',
          },
        ],
      },
      {
        group: 'SSE Routes (Protected)',
        routes: [
          {
            method: 'GET',
            path: '/sse/connect',
            name: 'sse.connect',
            description: 'Connexion SSE',
          },
          {
            method: 'POST',
            path: '/sse/subscribe',
            name: 'sse.subscribe',
            description: "S'abonner aux événements",
          },
          {
            method: 'POST',
            path: '/sse/unsubscribe',
            name: 'sse.unsubscribe',
            description: 'Se désabonner',
          },
          { method: 'GET', path: '/sse/stats', name: 'sse.stats', description: 'Statistiques SSE' },
        ],
      },
      {
        group: 'Development Routes',
        routes: [
          {
            method: 'GET',
            path: '/dev/routes',
            name: 'dev.routes',
            description: 'Cette page - Liste des routes',
          },
        ],
      },
    ]

    return inertia.render('dev/routes', { routes })
  }
}
