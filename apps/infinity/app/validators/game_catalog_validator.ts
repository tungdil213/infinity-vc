import vine from '@vinejs/vine'

export const gameCatalogQueryValidator = vine.compile(
  vine.object({
    capabilities: vine.string().trim().maxLength(512).optional(),
  })
)
