import { test } from '@japa/runner'
import {
  respondEnhancedLobbyUnexpectedFailure,
  respondEnhancedLobbyUseCaseFailure,
  translateEnhancedLobbyUseCaseError,
} from '../../../../app/controllers/support/enhanced_lobbies_controller_response.js'

type ResponseState = {
  redirectedTo: string | null
  redirectedBack: number
  statusCode: number | null
  payload: unknown
}

type FlashEntry = {
  type: string
  message: string
}

function createResponseHarness() {
  const state: ResponseState = {
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

function createSessionHarness() {
  const flashes: FlashEntry[] = []

  return {
    flashes,
    session: {
      flash(type: string, message: string) {
        flashes.push({ type, message })
      },
    },
  }
}

function createRequestHarness(acceptsHtml: boolean) {
  return {
    accepts(types: string[]) {
      return acceptsHtml && types.includes('html') ? 'html' : null
    },
  }
}

function createI18nHarness() {
  const translations: Record<string, string> = {
    'lobbies.errors.full': 'translated:lobbies.errors.full',
    'lobbies.errors.playerNotInLobby': 'translated:lobbies.errors.playerNotInLobby',
    'lobbies.api.joinFailed': 'translated:lobbies.api.joinFailed',
    'lobbies.flash.joinFailed': 'translated:lobbies.flash.joinFailed',
  }

  return {
    t(key: string) {
      return translations[key] ?? `translated:${key}`
    },
  }
}

test.group('enhanced_lobbies_controller_response', () => {
  test('translates known lobby use case errors and falls back for unknown ones', ({ assert }) => {
    const i18n = createI18nHarness()

    assert.equal(
      translateEnhancedLobbyUseCaseError(i18n as never, 'Lobby is full'),
      'translated:lobbies.errors.full'
    )
    assert.equal(
      translateEnhancedLobbyUseCaseError(i18n as never, 'Custom unmapped error'),
      'Custom unmapped error'
    )
  })

  test('maps use case failures to flash + redirect for html requests', ({ assert }) => {
    const request = createRequestHarness(true)
    const { response, state } = createResponseHarness()
    const { session, flashes } = createSessionHarness()

    respondEnhancedLobbyUseCaseFailure({
      request: request as never,
      response: response as never,
      session: session as never,
      i18n: createI18nHarness() as never,
      error: 'Player is not in this lobby',
    })

    assert.deepEqual(flashes, [
      {
        type: 'error',
        message: 'translated:lobbies.errors.playerNotInLobby',
      },
    ])
    assert.equal(state.redirectedBack, 1)
    assert.equal(state.statusCode, null)
  })

  test('maps use case failures to 400 json payloads for api requests', ({ assert }) => {
    const { response, state } = createResponseHarness()

    respondEnhancedLobbyUseCaseFailure({
      request: createRequestHarness(false) as never,
      response: response as never,
      session: createSessionHarness().session as never,
      i18n: createI18nHarness() as never,
      error: 'Lobby is full',
    })

    assert.equal(state.statusCode, 400)
    assert.deepEqual(state.payload, {
      error: 'translated:lobbies.errors.full',
    })
  })

  test('maps unexpected failures to flash + redirect for html requests', ({ assert }) => {
    const request = createRequestHarness(true)
    const { response, state } = createResponseHarness()
    const { session, flashes } = createSessionHarness()

    respondEnhancedLobbyUnexpectedFailure({
      request: request as never,
      response: response as never,
      session: session as never,
      error: new Error('boom'),
      logMessage: 'Failed to join lobby',
      userMessage: 'translated:lobbies.flash.joinFailed',
      apiMessage: 'translated:lobbies.api.joinFailed',
    })

    assert.deepEqual(flashes, [
      {
        type: 'error',
        message: 'translated:lobbies.flash.joinFailed',
      },
    ])
    assert.equal(state.redirectedBack, 1)
    assert.equal(state.statusCode, null)
  })

  test('maps unexpected failures to 500 json payloads for api requests', ({ assert }) => {
    const { response, state } = createResponseHarness()

    respondEnhancedLobbyUnexpectedFailure({
      request: createRequestHarness(false) as never,
      response: response as never,
      session: createSessionHarness().session as never,
      error: new Error('boom'),
      logMessage: 'Failed to join lobby',
      userMessage: 'translated:lobbies.flash.joinFailed',
      apiMessage: 'translated:lobbies.api.joinFailed',
    })

    assert.equal(state.statusCode, 500)
    assert.deepEqual(state.payload, {
      error: 'translated:lobbies.api.joinFailed',
    })
  })
})
