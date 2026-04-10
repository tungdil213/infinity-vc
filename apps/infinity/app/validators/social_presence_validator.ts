import vine from '@vinejs/vine'

export const socialPresenceHeartbeatValidator = vine.compile(
  vine.object({
    clientSessionId: vine.string().trim().uuid(),
  })
)
