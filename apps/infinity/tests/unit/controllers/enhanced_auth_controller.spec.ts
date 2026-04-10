import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import { test } from '@japa/runner'
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
    json(payload: unknown) {
      state.payload = payload
      return payload
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
      if (typeof data?.issuer === 'string') {
        return `${key}:${data.issuer}`
      }
      return key
    },
  }
}

function createController(overrides?: {
  validateInvitationResult?: { isFailure: boolean; error?: string; value?: any }
  registerResult?: { isFailure: boolean; error?: string; value?: any }
  clearPresenceResult?: { isFailure: boolean; error?: string; value?: any }
}) {
  return new EnhancedAuthController(
    {
      execute: async () =>
        overrides?.validateInvitationResult ?? {
          isFailure: false,
          value: {
            issuerDisplayName: 'Jane Doe',
            invitation: { expiresAt: null },
          },
        },
    } as any,
    {
      execute: async () =>
        overrides?.registerResult ?? {
          isFailure: false,
          value: {
            user: {
              uuid: 'user-1',
              fullName: 'Jane Doe',
              email: 'user@example.com',
            },
          },
        },
    } as any,
    {
      execute: async () =>
        overrides?.clearPresenceResult ?? {
          isFailure: false,
          value: {
            friendUserUuid: 'user-1',
            displayName: 'Jane Doe',
            status: 'offline',
            lobbyId: null,
            lobbyName: null,
            gameId: null,
            updatedAt: new Date(),
          },
        },
    } as any
  )
}

test.group('EnhancedAuthController', (group) => {
  const originalUserQuery = (UserModel as any).query
  const originalHashVerify = (hash as any).verify
  const originalLoggerError = (logger as any).error

  group.each.teardown(() => {
    ;(UserModel as any).query = originalUserQuery
    ;(hash as any).verify = originalHashVerify
    ;(logger as any).error = originalLoggerError
  })

  test('showLogin and showRegister sanitize redirect targets', async ({ assert }) => {
    const controller = createController()

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
        input(key: string) {
          return key === 'redirect' ? 'https://malicious.example.com/redirect' : undefined
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
        input(key: string) {
          if (key === 'redirect') {
            return '/auth/register?from=lobby'
          }
          if (key === 'invitationCode') {
            return 'ABCD-EFGH-IJKL'
          }
          return undefined
        },
      },
    } as any)

    assert.deepEqual(loginRender, {
      component: 'auth/login',
      props: { redirect: '/lobbies', currentLobby: null },
    })
    assert.deepEqual(registerRender, {
      component: 'auth/register',
      props: { redirect: '/auth/register?from=lobby', invitationCode: 'ABCD-EFGH-IJKL' },
    })
  })

  test('validateInvitationCode returns JSON success and failure payloads', async ({ assert }) => {
    const successController = createController()
    const successResponse = createResponseHarness()

    await successController.validateInvitationCode({
      request: {
        validateUsing: async () => ({
          invitationCode: 'ABCD-EFGH-IJKL',
        }),
      },
      response: successResponse.response,
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(successResponse.state.payload, {
      valid: true,
      invitation: {
        issuerDisplayName: 'Jane Doe',
        expiresAt: null,
      },
    })

    const failureController = createController({
      validateInvitationResult: {
        isFailure: true,
        error: 'Invitation code is invalid',
      },
    })
    const failureResponse = createResponseHarness()

    await failureController.validateInvitationCode({
      request: {
        validateUsing: async () => ({
          invitationCode: 'bad-code',
        }),
      },
      response: failureResponse.response,
      i18n: createI18nHarness(),
    } as any)

    assert.equal(failureResponse.state.statusCode, 400)
    assert.deepEqual(failureResponse.state.payload, {
      valid: false,
      message: 'auth.register.failure.invitationInvalid',
    })
  })

  test('register logs user in and redirects to sanitized safe path', async ({ assert }) => {
    const controller = createController({
      registerResult: {
        isFailure: false,
        value: {
          user: {
            uuid: 'user-1',
            fullName: 'Jane Doe',
            email: 'user@example.com',
          },
        },
      },
    })
    const { response, state } = createResponseHarness()
    const i18n = createI18nHarness()

    const createdUser = {
      userUuid: 'user-1',
      fullName: 'Jane Doe',
      email: 'user@example.com',
      normalizedRole: 'PLAYER',
      createdAt: new Date(),
      password: 'hashed',
    }

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
        input(key: string) {
          return key === 'redirect' ? '//evil.com' : undefined
        },
        validateUsing: async () => ({
          fullName: ' Jane Doe ',
          email: ' USER@EXAMPLE.COM ',
          password: 'password123',
          invitationCode: 'ABCD-EFGH-IJKL',
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

    assert.equal(state.redirectedTo, '/lobbies')
    assert.equal(loggedInUser, createdUser)
    assert.deepEqual(flashes, [
      { type: 'success', message: 'auth.register.success.welcome:Jane Doe' },
    ])
  })

  test('register failure throws a translated business error', async ({ assert }) => {
    const controller = createController({
      registerResult: {
        isFailure: true,
        error: 'Invitation code is invalid',
      },
    })

    await assert.rejects(
      () =>
        controller.register({
          request: {
            input() {
              return '/lobbies'
            },
            validateUsing: async () => ({
              fullName: 'John Doe',
              email: 'john@example.com',
              password: 'password123',
              invitationCode: 'bad-code',
            }),
          },
          response: createResponseHarness().response,
          auth: {
            use() {
              return {
                login: async () => {},
              }
            },
          },
          session: {
            flash() {},
          },
          i18n: createI18nHarness(),
        } as any),
      /auth\.register\.failure\.invitationInvalid/
    )
  })

  test('login rejects invalid credentials and accepts valid credentials', async ({ assert }) => {
    const controller = createController()
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
    const controller = createController()
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
