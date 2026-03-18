import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { GameCapability } from '@infinity.dev/game-engine'
import { ListGameCatalogUseCase } from '#application/use_cases/list_game_catalog_use_case'

const SUPPORTED_CAPABILITIES: readonly GameCapability[] = [
  'turn-based',
  'simultaneous-turns',
  'hidden-information',
  'spectator-mode',
  'replay',
  'async-play',
  'live-play',
  'bot-players',
  'custom-assets',
  'deterministic-rng',
]

const SUPPORTED_CAPABILITY_SET = new Set<string>(SUPPORTED_CAPABILITIES)

@inject()
export default class GameCatalogController {
  constructor(private readonly listGameCatalogUseCase: ListGameCatalogUseCase) {}

  async publicIndex({ request, response }: HttpContext) {
    const capabilitiesResult = this.parseCapabilities(request.input('capabilities'))
    if (capabilitiesResult.error) {
      return response.status(400).json({ error: capabilitiesResult.error })
    }

    const result = this.listGameCatalogUseCase.execute({
      includeProprietary: false,
      requiredCapabilities: capabilitiesResult.value,
    })

    if (result.isFailure) {
      return response.status(500).json({ error: result.error })
    }

    return response.json({
      games: result.value.games,
      meta: {
        includeProprietary: false,
        total: result.value.games.length,
      },
    })
  }

  async adminIndex({ request, response }: HttpContext) {
    const capabilitiesResult = this.parseCapabilities(request.input('capabilities'))
    if (capabilitiesResult.error) {
      return response.status(400).json({ error: capabilitiesResult.error })
    }

    const result = this.listGameCatalogUseCase.execute({
      includeProprietary: true,
      requiredCapabilities: capabilitiesResult.value,
    })

    if (result.isFailure) {
      return response.status(500).json({ error: result.error })
    }

    return response.json({
      games: result.value.games,
      meta: {
        includeProprietary: true,
        total: result.value.games.length,
      },
    })
  }

  private parseCapabilities(rawValue: unknown): {
    value?: GameCapability[]
    error?: string
  } {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return { value: [] }
    }

    const rawCapabilities = Array.isArray(rawValue)
      ? rawValue.flatMap((entry) => String(entry).split(','))
      : String(rawValue).split(',')

    const capabilities = rawCapabilities
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    for (const capability of capabilities) {
      if (!SUPPORTED_CAPABILITY_SET.has(capability)) {
        return {
          error: `Unsupported capability '${capability}'`,
        }
      }
    }

    return {
      value: [...new Set(capabilities)] as GameCapability[],
    }
  }
}
