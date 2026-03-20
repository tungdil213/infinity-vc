import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import UserModel from '#models/user'
import EnhancedAuthController from '../../../app/controllers/enhanced_auth_controller.js'

type RedirectState = {
  redirectedTo: string | null
  redirectedBack: number
  statusCode: number | null
  payload: unknown
}

function createResponseHarness() {
  const state: RedirectState = {
    redirectedTo: null,
    redirectedBack: 0,
    statusCode: null,
    payload: null,
  }

  const response = {
    redirect(target?: string) {
      if (typeof target === 'string') {
        state.redirectedTo = target
        return target
      }

      return {
        back() {
          state.redirectedBack += 1
          return 'back'
        },
      }
    },
    status(code: number) {
      state.statusCode = code
      return {
        json(payload: unknown) {
          state.payload = payload
          return payload
        },
      }
    },
  }

  return { response, state }
}

function createI18nHarness() {
  return {
    t(key: string, data?: Record<string, unknown>) {
      if (typeof data?.name === 'string') {
        return `${key}:${data.name}`
      }
      return key
    },
  }
}

test.group('EnhancedAuthController', (group) => {
  const originalContainerMake = (app.container as any).make
  const originalUserQuery = (UserModel as any).query
  const originalHashVerify = (hash as any).verify
  const originalLoggerError = (logger as any).error

  group.each.teardown(() => {
    ;(app.container as any).make = originalContainerMake
    ;(UserModel as any).query = originalUserQuery
    ;(hash as any).verify = originalHashVerify
    ;(logger as any).error = originalLoggerError
  })

  test('showLogin and showRegister sanitize redirect targets', async ({ assert }) => {
    const controller = new EnhancedAuthController()

    let loginRender: { component: string; props: Record<string, unknown> } | null = null
    let registerRender: { component: string; props: Record<string, unknown> } | null = null

    await controller.showLogin({
      inertia: {
        render(component: string, props: Record<string, unknown>) {
          loginRender = { component, props }
          return loginRender
        },
      },
      request: {
        input() {
          return 'https://malicious.example.com/redirect'
        },
      },
    } as any)

    await controller.showRegister({
      inertia: {
        render(component: string, props: Record<string, unknown>) {
          registerRender = { component, props }
          return registerRender
        },
      },
      request: {
        input() {
          return '/auth/register?from=lobby'
        },
      },
    } as any)

    assert.deepEqual(loginRender, {
      component: 'auth/login',
      props: { redirect: '/lobbies', currentLobby: null },
    })
    assert.deepEqual(registerRender, {
      component: 'auth/register',
      props: { redirect: '/auth/register?from=lobby' },
    })
  })

  test('register logs user in and redirects to sanitized safe path', async ({ assert }) => {
    const controller = new EnhancedAuthController()
    const { response, state } = createResponseHarness()
    const i18n = createI18nHarness()

    let capturedPayload: Record<string, unknown> | null = null
    const createdUser = {
      userUuid: 'user-1',
      fullName: 'Jane Doe',
      email: 'user@example.com',
      normalizedRole: 'PLAYER',
      createdAt: new Date(),
      password: 'hashed',
    }

    ;(app.container as any).make = async () => ({
      execute: async (payload: Record<string, unknown>) => {
        capturedPayload = payload
        return { isFailure: false, value: { userUuid: createdUser.userUuid } }
      },
    })

    ;(UserModel as any).query = () => ({
      where() {
        return this
      },
      first: async () => createdUser,
    })

    const flashes: Array<{ type: string; message: unknown }> = []
    let loggedInUser: unknown = null

    await controller.register({
      request: {
        input() {
          return '//evil.com'
        },
        validateUsing: async () => ({
          fullName: ' Jane Doe ',
          email: ' USER@EXAMPLE.COM ',
          password: 'password123',
        }),
      },
      response,
      auth: {
        use() {
          return {
            login: async (user: unknown) => {
              loggedInUser = user
            },
          }
        },
      },
      session: {
        flash(type: string, message: unknown) {
          flashes.push({ type, message })
        },
      },
      i18n,
    } as any)

    assert.isNotNull(capturedPayload)
    assert.deepInclude(capturedPayload!, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'user@example.com',
      password: 'password123',
    })
    assert.equal(capturedPayload!.username, 'user')
    assert.equal(state.redirectedTo, '/lobbies')
    assert.equal(loggedInUser, createdUser)
    assert.deepEqual(flashes, [
      { type: 'success', message: 'auth.register.success.welcome:Jane Doe' },
    ])
  })

  test('register failure flashes translated error and redirects back', async ({ assert }) => {
    const controller = new EnhancedAuthController()
    const { response, state } = createResponseHarness()
    const i18n = createI18nHarness()

    ;(app.container as any).make = async () => ({
      execute: async () => ({ isFailure: true, error: 'Failed to create account' }),
    })

    const flashes: Array<{ type: string; message: unknown }> = []

    await controller.register({
      request: {
        input() {
          return '/lobbies'
        },
        validateUsing: async () => ({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        }),
      },
      response,
      auth: {
        use() {
          return {
            login: async () => {},
          }
        },
      },
      session: {
        flash(type: string, message: unknown) {
          flashes.push({ type, message })
        },
      },
      i18n,
    } as any)

    assert.equal(state.redirectedBack, 1)
    assert.deepEqual(flashes, [{ type: 'error', message: 'auth.register.failure.createAccount' }])
  })

  test('login rejects invalid credentials and accepts valid credentials', async ({ assert }) => {
    const controller = new EnhancedAuthController()
    const i18n = createI18nHarness()

    const knownUser = {
      userUuid: 'user-42',
      fullName: 'Known User',
      email: 'known@example.com',
      normalizedRole: 'PLAYER',
      password: 'hashed-password',
    }

    ;(UserModel as any).query = () => ({
      where() {
        return this
      },
      first: async () => knownUser,
    })

    let verifyCalls = 0
    ;(hash as any).verify = async (_hashed: string, password: string) => {
      verifyCalls += 1
      return password === 'valid-password'
    }

    const invalidResponse = createResponseHarness()
    const invalidFlashes: Array<{ type: string; message: unknown }> = []
    let invalidLoginCalls = 0

    await controller.login({
      request: {
        input() {
          return '/safe'
        },
        validateUsing: async () => ({
          email: 'KNOWN@EXAMPLE.COM',
          password: 'bad-password',
        }),
      },
      response: invalidResponse.response,
      auth: {
        use() {
          return {
            login: async () => {
              invalidLoginCalls += 1
            },
          }
        },
      },
      session: {
        flash(type: string, message: unknown) {
          invalidFlashes.push({ type, message })
        },
      },
      i18n,
    } as any)

    assert.equal(invalidResponse.state.redirectedBack, 1)
    assert.equal(invalidLoginCalls, 0)
    assert.deepEqual(invalidFlashes, [
      { type: 'error', message: 'auth.login.failure.invalidCredentials' },
    ])

    const validResponse = createResponseHarness()
    const validFlashes: Array<{ type: string; message: unknown }> = []
    let validLoggedInUser: unknown = null

    await controller.login({
      request: {
        input() {
          return '/games/active'
        },
        validateUsing: async () => ({
          email: 'known@example.com',
          password: 'valid-password',
        }),
      },
      response: validResponse.response,
      auth: {
        use() {
          return {
            login: async (user: unknown) => {
              validLoggedInUser = user
            },
          }
        },
      },
      session: {
        flash(type: string, message: unknown) {
          validFlashes.push({ type, message })
        },
      },
      i18n,
    } as any)

    assert.equal(validResponse.state.redirectedTo, '/games/active')
    assert.equal(validLoggedInUser, knownUser)
    assert.deepEqual(validFlashes, [
      { type: 'success', message: 'auth.login.success.welcomeBack:Known User' },
    ])
    assert.equal(verifyCalls, 2)
  })

  test('logout success and failure, plus API me/check responses', async ({ assert }) => {
    const controller = new EnhancedAuthController()
    const i18n = createI18nHarness()

    const logoutSuccess = createResponseHarness()
    const logoutFlashes: Array<{ type: string; message: unknown }> = []
    await controller.logout({
      response: logoutSuccess.response,
      auth: {
        use() {
          return {
            logout: async () => {},
          }
        },
      },
      session: {
        flash(type: string, message: unknown) {
          logoutFlashes.push({ type, message })
        },
      },
      i18n,
    } as any)

    assert.equal(logoutSuccess.state.redirectedTo, '/')
    assert.deepEqual(logoutFlashes, [{ type: 'success', message: 'auth.logout.success' }])

    ;(logger as any).error = () => {}
    const logoutFailure = createResponseHarness()
    const logoutFailureFlashes: Array<{ type: string; message: unknown }> = []
    await controller.logout({
      response: logoutFailure.response,
      auth: {
        use() {
          return {
            logout: async () => {
              throw new Error('logout failed')
            },
          }
        },
      },
      session: {
        flash(type: string, message: unknown) {
          logoutFailureFlashes.push({ type, message })
        },
      },
      i18n,
    } as any)

    assert.equal(logoutFailure.state.redirectedBack, 1)
    assert.deepEqual(logoutFailureFlashes, [{ type: 'error', message: 'auth.logout.failure' }])

    const meResponse = createResponseHarness()
    await controller.me({
      response: meResponse.response,
      auth: {
        authenticate: async () => {
          throw { code: 'E_UNAUTHORIZED_ACCESS' }
        },
      },
    } as any)
    assert.equal(meResponse.state.statusCode, 200)
    assert.deepEqual(meResponse.state.payload, {
      authenticated: false,
      user: null,
    })

    const checkResponse = createResponseHarness()
    await controller.check({
      response: checkResponse.response,
      auth: {
        user: {
          userUuid: 'user-99',
          fullName: 'Check User',
          email: 'check@example.com',
          normalizedRole: 'ADMIN',
        },
        authenticate: async () => {},
      },
    } as any)
    assert.equal(checkResponse.state.statusCode, 200)
    assert.deepEqual(checkResponse.state.payload, {
      authenticated: true,
      user: {
        uuid: 'user-99',
        fullName: 'Check User',
        email: 'check@example.com',
        role: 'ADMIN',
      },
    })
  })
})
