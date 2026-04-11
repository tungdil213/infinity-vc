import { test } from '@japa/runner'
import {
  respondEnhancedLobbyHtmlSuccess,
  respondEnhancedLobbyRequestSuccess,
} from '../../../../app/controllers/support/enhanced_lobbies_controller_success.js'

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
    json(payload: unknown) {
      state.payload = payload
      return payload
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

test.group('enhanced_lobbies_controller_success', () => {
  test('maps html success to flash + redirect', ({ assert }) => {
    const { response, state } = createResponseHarness()
    const { session, flashes } = createSessionHarness()

    respondEnhancedLobbyHtmlSuccess({
      response: response as never,
      session: session as never,
      successMessage: 'translated:lobbies.flash.joined',
      redirectTo: '/lobbies/123',
    })

    assert.deepEqual(flashes, [
      {
        type: 'success',
        message: 'translated:lobbies.flash.joined',
      },
    ])
    assert.equal(state.redirectedTo, '/lobbies/123')
  })

  test('maps request success to the same flash + redirect for html requests', ({ assert }) => {
    const { response, state } = createResponseHarness()
    const { session, flashes } = createSessionHarness()

    respondEnhancedLobbyRequestSuccess({
      request: createRequestHarness(true) as never,
      response: response as never,
      session: session as never,
      successMessage: 'translated:lobbies.flash.left',
      redirectTo: '/lobbies',
      jsonBody: {
        success: true,
        message: 'translated:lobbies.api.left',
      },
      jsonStatus: 200,
    })

    assert.deepEqual(flashes, [
      {
        type: 'success',
        message: 'translated:lobbies.flash.left',
      },
    ])
    assert.equal(state.redirectedTo, '/lobbies')
    assert.equal(state.statusCode, null)
  })

  test('maps request success to json without forcing a status when no status is provided', ({
    assert,
  }) => {
    const { response, state } = createResponseHarness()

    respondEnhancedLobbyRequestSuccess({
      request: createRequestHarness(false) as never,
      response: response as never,
      session: createSessionHarness().session as never,
      successMessage: 'translated:lobbies.flash.joined',
      redirectTo: '/lobbies/123',
      jsonBody: {
        success: true,
        message: 'translated:lobbies.api.joined',
      },
    })

    assert.equal(state.statusCode, null)
    assert.deepEqual(state.payload, {
      success: true,
      message: 'translated:lobbies.api.joined',
    })
  })

  test('maps request success to explicit json status when requested', ({ assert }) => {
    const { response, state } = createResponseHarness()

    respondEnhancedLobbyRequestSuccess({
      request: createRequestHarness(false) as never,
      response: response as never,
      session: createSessionHarness().session as never,
      successMessage: 'translated:lobbies.flash.left',
      redirectTo: '/lobbies',
      jsonBody: {
        success: true,
        message: 'translated:lobbies.api.left',
      },
      jsonStatus: 200,
    })

    assert.equal(state.statusCode, 200)
    assert.deepEqual(state.payload, {
      success: true,
      message: 'translated:lobbies.api.left',
    })
  })
})
