import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Home route
router.get('/', async ({ inertia }) => {
  return inertia.render('home')
})

// Authentication required routes
router
  .group(() => {
    // Lobbies routes (DDD Architecture)
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
    router
      .post(
        '/lobbies/:uuid/join',
        '#domains/lobby/presentation/controllers/lobbies_controller.join'
      )
      .as('lobbies.join')
    router
      .post(
        '/lobbies/:uuid/leave',
        '#domains/lobby/presentation/controllers/lobbies_controller.leave'
      )
      .as('lobbies.leave')
    router
      .post(
        '/lobbies/:uuid/start',
        '#domains/lobby/presentation/controllers/lobbies_controller.start'
      )
      .as('lobbies.start')

    // Games routes (DDD Architecture)
    router
      .get('/games/:uuid', '#domains/game_engine/presentation/controllers/games_controller.show')
      .as('games.show')
    router
      .post(
        '/games/:uuid/leave',
        '#domains/game_engine/presentation/controllers/games_controller.leave'
      )
      .as('games.leave')
  })
  .use(middleware.auth())

export default router
