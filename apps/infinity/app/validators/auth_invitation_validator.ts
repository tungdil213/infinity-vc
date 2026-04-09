import vine from '@vinejs/vine'

export const authInvitationCodeValidator = vine.compile(
  vine.object({
    invitationCode: vine.string().trim().minLength(6).maxLength(64),
  })
)
