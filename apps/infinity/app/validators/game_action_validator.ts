import vine from '@vinejs/vine'

export const gameUuidParamValidator = vine.compile(
  vine.object({
    uuid: vine.string().trim().uuid(),
  })
)

export const gameActionBodyValidator = vine.compile(
  vine.object({
    action: vine.string().trim().maxLength(64).optional(),
    actionType: vine.string().trim().maxLength(64).optional(),
    cardType: vine.string().trim().maxLength(64).optional(),
    targetPlayerId: vine.string().trim().uuid().optional(),
    guessedCard: vine.string().trim().maxLength(64).optional(),
    move: vine.string().trim().maxLength(64).optional(),
    payload: vine.record(vine.any()).optional(),
  })
)
