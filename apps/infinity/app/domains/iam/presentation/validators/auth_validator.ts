import vine from '@vinejs/vine'

export const registerUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(1),
    email: vine.string().trim().email(),
    password: vine.string().minLength(8),
    password_confirmation: vine.string().minLength(8).sameAs('password'),
  })
)

export const loginUserValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string(),
  })
)
