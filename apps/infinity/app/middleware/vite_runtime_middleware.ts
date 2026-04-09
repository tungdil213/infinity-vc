import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import vite from '@adonisjs/vite/services/main'

export default class ViteRuntimeMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const devServer = vite?.getDevServer()
    if (!devServer) {
      return next()
    }

    return new Promise<void>((resolve, reject) => {
      function done(error?: unknown) {
        response.response.removeListener('finish', done)

        if (error) {
          reject(error)
          return
        }

        resolve()
      }

      response.response.addListener('finish', done)
      response.relayHeaders()

      devServer.middlewares.handle(request.request, response.response, async () => {
        response.response.removeListener('finish', done)

        try {
          await next()
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  }
}
