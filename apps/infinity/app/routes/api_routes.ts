import router from '@adonisjs/core/services/router'
import AuthController from '../controllers/auth_controller.js'
import LobbyController from '../controllers/lobby_controller.js'
import GameController from '../controllers/game_controller.js'

// TODO: Import actual implementations when IoC container is set up
// For now, these are placeholders

/**
 * Authentication Routes
 */
router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.post('/login', [AuthController, 'login'])
    router.post('/logout', [AuthController, 'logout'])
    router.get('/me', [AuthController, 'me'])
  })
  .prefix('/auth')

/**
 * Lobby Routes
 */
router
  .group(() => {
    router.get('/', [LobbyController, 'index'])
    router.post('/', [LobbyController, 'create'])
    router.get('/:lobbyId', [LobbyController, 'show'])
    router.post('/:lobbyId/join', [LobbyController, 'join'])
    router.post('/:lobbyId/leave', [LobbyController, 'leave'])
    router.post('/:lobbyId/start', [LobbyController, 'start'])
  })
  .prefix('/lobbies')
// TODO: Add authentication middleware
// .use(middleware.auth())

/**
 * Game Routes
 */
router
  .group(() => {
    router.get('/', [GameController, 'index'])
    router.get('/:gameId', [GameController, 'show'])
    router.post('/:gameId/actions', [GameController, 'action'])
    router.get('/:gameId/hand', [GameController, 'hand'])
    router.post('/:gameId/pause', [GameController, 'pause'])
    router.post('/:gameId/resume', [GameController, 'resume'])
  })
  .prefix('/games')
// TODO: Add authentication middleware
// .use(middleware.auth())

/**
 * Health Check Route
 */
router.get('/health', async ({ response }) => {
  return response.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

export default router
