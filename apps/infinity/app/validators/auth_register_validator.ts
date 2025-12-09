import vine from '@vinejs/vine'

export const authRegisterValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(3).maxLength(100),
    email: vine.string().trim().email(),
    password: vine.string().minLength(8).confirmed(),
  })
)
