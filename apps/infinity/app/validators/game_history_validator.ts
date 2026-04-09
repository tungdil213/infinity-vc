import vine from '@vinejs/vine'

export const gameHistoryQueryValidator = vine.compile(
  vine.object({
    limit: vine.string().trim().regex(/^\d{1,3}$/).optional(),
    status: vine
      .string()
      .trim()
      .regex(/^(IN_PROGRESS|PAUSED|ABANDONED|FINISHED|ARCHIVED)$/i)
      .optional(),
  })
)
