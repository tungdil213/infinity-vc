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
const UsersController = () => import('../appsample/controllers/user_controller.js')

router
  .group(() => {
    router.get('/users', [UsersController, 'index']).use([middleware.ensureRole(['admin'])])
    router.post('/users', [UsersController, 'store']).use([middleware.ensureRole(['admin'])])
    router
      .get('/users/:uuid', [UsersController, 'show'])
      .use([middleware.ensureSelfOrRole(['admin'])])
    router
      .put('/users/:uuid', [UsersController, 'update'])
      .use([middleware.ensureSelfOrRole(['admin'])])
    router
      .delete('/users/:uuid', [UsersController, 'destroy'])
      .use([middleware.ensureRole(['admin'])])
  })
  .prefix('/api')
  .use([middleware.auth()])

router.on('/').renderInertia('home')
