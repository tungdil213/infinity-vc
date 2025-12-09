import vine from '@vinejs/vine'

export const lobbyStoreValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(50),
    description: vine.string().trim().maxLength(255).optional(),
    maxPlayers: vine.number().range([2, 8]),
    isPrivate: vine.boolean().optional(),
    hasPassword: vine.boolean().optional(),
    password: vine.string().trim().minLength(1).optional(),
    gameType: vine.string().trim().optional(),
  })
)
