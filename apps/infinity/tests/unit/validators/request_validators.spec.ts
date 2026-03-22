import { test } from '@japa/runner'
import { authLoginValidator } from '../../../app/validators/auth_login_validator.js'
import { authRegisterValidator } from '../../../app/validators/auth_register_validator.js'
import {
  settingsPasswordValidator,
  settingsProfileValidator,
} from '../../../app/validators/account_settings_validator.js'
import {
  gameActionBodyValidator,
  gameUuidParamValidator,
} from '../../../app/validators/game_action_validator.js'
import { gameCatalogQueryValidator } from '../../../app/validators/game_catalog_validator.js'
import { gameHistoryQueryValidator } from '../../../app/validators/game_history_validator.js'
import {
  lobbyInvitationCodeParamValidator,
  lobbyJoinValidator,
  lobbyUuidParamValidator,
} from '../../../app/validators/lobby_action_validators.js'
import { lobbyBeaconPayloadValidator } from '../../../app/validators/lobby_beacon_validator.js'
import { lobbyStoreValidator } from '../../../app/validators/lobby_store_validator.js'

async function throwsValidationError(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run()
    return false
  } catch {
    return true
  }
}

test.group('Request validators', () => {
  test('auth login validator trims and accepts valid input', async ({ assert }) => {
    const payload = await authLoginValidator.validate({
      email: '  player@example.com ',
      password: 'secret',
    })

    assert.equal(payload.email, 'player@example.com')
    assert.equal(payload.password, 'secret')
  })

  test('auth register validator rejects mismatched password confirmation', async ({ assert }) => {
    const hasFailed = await throwsValidationError(() =>
      authRegisterValidator.validate({
        fullName: 'Player One',
        email: 'player@example.com',
        password: 'Password123',
        password_confirmation: 'Different123',
      })
    )

    assert.isTrue(hasFailed)
  })

  test('settings profile validator trims and validates account updates', async ({ assert }) => {
    const payload = await settingsProfileValidator.validate({
      fullName: '  Player One  ',
      email: '  player.one@example.com  ',
    })

    assert.equal(payload.fullName, 'Player One')
    assert.equal(payload.email, 'player.one@example.com')
  })

  test('settings password validator rejects mismatched confirmation', async ({ assert }) => {
    const hasFailed = await throwsValidationError(() =>
      settingsPasswordValidator.validate({
        currentPassword: 'OldPassword123',
        password: 'NewPassword123',
        password_confirmation: 'DifferentPassword123',
      })
    )

    assert.isTrue(hasFailed)
  })

  test('lobby and game UUID validators reject non-uuid values', async ({ assert }) => {
    const lobbyFailed = await throwsValidationError(() =>
      lobbyUuidParamValidator.validate({ uuid: 'not-a-uuid' })
    )
    const gameFailed = await throwsValidationError(() =>
      gameUuidParamValidator.validate({ uuid: 'also-not-a-uuid' })
    )
    const invitationFailed = await throwsValidationError(() =>
      lobbyInvitationCodeParamValidator.validate({ invitationCode: 'bad-code' })
    )

    assert.isTrue(lobbyFailed)
    assert.isTrue(gameFailed)
    assert.isTrue(invitationFailed)
  })

  test('lobby store validator enforces minimum players', async ({ assert }) => {
    const hasFailed = await throwsValidationError(() =>
      lobbyStoreValidator.validate({
        name: 'Test Lobby',
        maxPlayers: 1,
        gameType: 'love-letter',
      })
    )

    assert.isTrue(hasFailed)
  })

  test('lobby join and game action validators accept optional payload structure', async ({ assert }) => {
    const joinPayload = await lobbyJoinValidator.validate({
      password: ' shared-secret ',
    })
    const gameActionPayload = await gameActionBodyValidator.validate({
      actionType: 'submit_move',
      move: 'rock',
      payload: {
        meta: {
          source: 'ui',
        },
      },
    })

    assert.equal(joinPayload.password, 'shared-secret')
    assert.equal(gameActionPayload.actionType, 'submit_move')
    assert.equal((gameActionPayload.payload as any).meta.source, 'ui')
  })

  test('game catalog validator accepts csv capabilities query', async ({ assert }) => {
    const payload = await gameCatalogQueryValidator.validate({
      capabilities: 'turn-based,replay',
    })

    assert.equal(payload.capabilities, 'turn-based,replay')
  })

  test('game history validator enforces numeric limit and known statuses', async ({ assert }) => {
    const validPayload = await gameHistoryQueryValidator.validate({
      limit: '50',
      status: 'finished',
    })

    assert.equal(validPayload.limit, '50')
    assert.equal(validPayload.status, 'finished')

    const invalidLimit = await throwsValidationError(() =>
      gameHistoryQueryValidator.validate({ limit: 'abc' })
    )
    const invalidStatus = await throwsValidationError(() =>
      gameHistoryQueryValidator.validate({ status: 'broken_status' })
    )

    assert.isTrue(invalidLimit)
    assert.isTrue(invalidStatus)
  })

  test('lobby beacon validator accepts optional payload and rejects malformed values', async ({
    assert,
  }) => {
    const validPayload = await lobbyBeaconPayloadValidator.validate({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
      clientSessionId: 'session-123',
    })

    assert.equal(validPayload.clientSessionId, 'session-123')

    const invalidPayload = await throwsValidationError(() =>
      lobbyBeaconPayloadValidator.validate({
        lobbyUuid: 'not-a-uuid',
        clientSessionId: 'x'.repeat(129),
      })
    )

    assert.isTrue(invalidPayload)
  })
})
