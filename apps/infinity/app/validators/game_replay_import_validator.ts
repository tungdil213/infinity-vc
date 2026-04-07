import vine from '@vinejs/vine'

export const gameReplayImportBodyValidator = vine.compile(
  vine.object({
    replayTimeline: vine.array(vine.any()),
    envelope: vine.record(vine.any()).optional(),
  })
)
