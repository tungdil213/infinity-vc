import vine from '@vinejs/vine'

export const lobbyJoinValidator = vine.compile(
  vine.object({
    password: vine.string().trim().maxLength(128).optional(),
  })
)

export const lobbyKickPlayerValidator = vine.compile(
  vine.object({
    playerUuid: vine.string().trim().uuid(),
  })
)

export const lobbyAdminCloseValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().maxLength(255).optional(),
  })
)

export const lobbyUuidParamValidator = vine.compile(
  vine.object({
    uuid: vine.string().trim().uuid(),
  })
)

export const lobbyInvitationCodeParamValidator = vine.compile(
  vine.object({
    invitationCode: vine.string().trim().uuid(),
  })
)
