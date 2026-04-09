import vine from '@vinejs/vine'

export const invitationGenerateValidator = vine.compile(
  vine.object({
    restrictedEmail: vine.string().trim().email().optional(),
  })
)

export const invitationUuidParamValidator = vine.compile(
  vine.object({
    uuid: vine.string().trim().uuid(),
  })
)
