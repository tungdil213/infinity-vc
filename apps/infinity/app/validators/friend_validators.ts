import vine from '@vinejs/vine'

export const friendSearchValidator = vine.compile(
  vine.object({
    q: vine.string().trim().maxLength(80).optional(),
  })
)

export const sendFriendRequestValidator = vine.compile(
  vine.object({
    recipientUserUuid: vine.string().trim().uuid(),
  })
)

export const friendRequestUuidParamValidator = vine.compile(
  vine.object({
    uuid: vine.string().trim().uuid(),
  })
)

export const removeFriendParamValidator = vine.compile(
  vine.object({
    friendUserUuid: vine.string().trim().uuid(),
  })
)
