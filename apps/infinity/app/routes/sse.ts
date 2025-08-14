import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// SSE routes - all require authentication
router.group(() => {
  // Establish SSE connection
  router.get('/connect', '#controllers/sse_controller.connect')
  
  // Subscribe to a channel
  router.post('/subscribe', '#controllers/sse_controller.subscribe')
  
  // Unsubscribe from a channel
  router.post('/unsubscribe', '#controllers/sse_controller.unsubscribe')
  
  // Get SSE statistics (admin only)
  router.get('/stats', '#controllers/sse_controller.stats')
})
.prefix('/api/v1/sse')
.middleware([middleware.auth()])
