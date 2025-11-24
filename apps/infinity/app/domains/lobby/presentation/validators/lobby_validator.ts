import vine from '@vinejs/vine'

export const createLobbyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1),
    maxPlayers: vine.number().min(2).max(10),
    minPlayers: vine.number().min(2),
    isPrivate: vine.boolean().optional(),
    gameType: vine.string().trim().minLength(1).optional(),
  })
)

export const kickPlayerValidator = vine.compile(
  vine.object({
    userId: vine.string().trim().minLength(1),
  })
)
