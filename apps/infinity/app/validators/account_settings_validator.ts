import vine from '@vinejs/vine'

export const settingsProfileValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(3).maxLength(100),
    email: vine.string().trim().email(),
  })
)

export const settingsPasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().minLength(1),
    password: vine.string().minLength(8).confirmed(),
  })
)
