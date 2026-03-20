import vine from '@vinejs/vine'

export const lobbyBeaconPayloadValidator = vine.compile(
  vine.object({
    lobbyUuid: vine.string().trim().uuid().optional(),
    userUuid: vine.string().trim().uuid().optional(),
    clientSessionId: vine.string().trim().maxLength(128).optional(),
  })
)
