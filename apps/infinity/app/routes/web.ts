import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Home route
router.get('/', async ({ inertia }) => {
  return inertia.render('home')
})

// Authentication required routes
router.group(() => {
  // Lobbies routes
  router.get('/lobbies', '#controllers/lobbies_controller.index').as('lobbies.index')
  router.get('/lobbies/create', '#controllers/lobbies_controller.create').as('lobbies.create')
  router.post('/lobbies', '#controllers/lobbies_controller.store').as('lobbies.store')
  router.get('/lobbies/:uuid', '#controllers/lobbies_controller.show').as('lobbies.show')
  router.post('/lobbies/:uuid/join', '#controllers/lobbies_controller.join').as('lobbies.join')
  router.post('/lobbies/:uuid/leave', '#controllers/lobbies_controller.leave').as('lobbies.leave')
  router.post('/lobbies/:uuid/start', '#controllers/lobbies_controller.start').as('lobbies.start')

  // Games routes
  router.get('/games/:uuid', '#controllers/games_controller.show').as('games.show')
  router.post('/games/:uuid/leave', '#controllers/games_controller.leave').as('games.leave')
}).use(middleware.auth())

export default router
