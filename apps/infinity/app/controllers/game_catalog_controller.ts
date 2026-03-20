import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import type { GameCapability } from '@infinity.dev/game-engine'
import { ListGameCatalogUseCase } from '#application/use_cases/list_game_catalog_use_case'
import { gameCatalogQueryValidator } from '#validators/game_catalog_validator'

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

  async publicIndex({ request, response, i18n }: HttpContext) {
    const { capabilities } = await request.validateUsing(gameCatalogQueryValidator)
    const capabilitiesResult = this.parseCapabilities(capabilities)
    if (capabilitiesResult.error) {
      return response.status(400).json({
        error: i18n.t('games.errors.unsupportedCapability', {
          capability: capabilitiesResult.error,
        }),
      })
    }

    const result = this.listGameCatalogUseCase.execute({
      includeProprietary: false,
      requiredCapabilities: capabilitiesResult.value,
    })

    if (result.isFailure) {
      logger.error({ error: result.error }, 'Failed to list public game catalog')
      return response.status(500).json({ error: i18n.t('games.errors.catalogUnavailable') })
    }

    return response.json({
      games: result.value.games,
      meta: {
        includeProprietary: false,
        total: result.value.games.length,
      },
    })
  }

  async adminIndex({ request, response, i18n }: HttpContext) {
    const { capabilities } = await request.validateUsing(gameCatalogQueryValidator)
    const capabilitiesResult = this.parseCapabilities(capabilities)
    if (capabilitiesResult.error) {
      return response.status(400).json({
        error: i18n.t('games.errors.unsupportedCapability', {
          capability: capabilitiesResult.error,
        }),
      })
    }

    const result = this.listGameCatalogUseCase.execute({
      includeProprietary: true,
      requiredCapabilities: capabilitiesResult.value,
    })

    if (result.isFailure) {
      logger.error({ error: result.error }, 'Failed to list admin game catalog')
      return response.status(500).json({ error: i18n.t('games.errors.catalogUnavailable') })
    }

    return response.json({
      games: result.value.games,
      meta: {
        includeProprietary: true,
        total: result.value.games.length,
      },
    })
  }

  private parseCapabilities(rawValue: string | undefined): {
    value?: GameCapability[]
    error?: string
  } {
    if (rawValue === undefined || rawValue.length === 0) {
      return { value: [] }
    }

    const rawCapabilities = rawValue.split(',')

    const capabilities = rawCapabilities
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    for (const capability of capabilities) {
      if (!SUPPORTED_CAPABILITY_SET.has(capability)) {
        return {
          error: capability,
        }
      }
    }

    return {
      value: [...new Set(capabilities)] as GameCapability[],
    }
  }
}
