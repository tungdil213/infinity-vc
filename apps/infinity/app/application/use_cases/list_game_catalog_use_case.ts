import type {
  GameActionDescriptor,
  GameCapability,
  GameDistribution,
  GameSettingField,
} from '@infinity.dev/game-engine'
import type { GameCatalogPort } from '#application/services/game_catalog_port'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'
import { Result } from '#shared/result'
import { safeSystemError } from '#shared/error_sanitizer'

export interface ListGameCatalogRequest {
  includeProprietary: boolean
  requiredCapabilities?: readonly GameCapability[]
}

export interface GameCatalogItem {
  id: string
  displayName: string
  description: string
  minPlayers: number
  maxPlayers: number
  distribution: GameDistribution
  capabilities: readonly GameCapability[]
  metadata: {
    version: string
    complexity: 'simple' | 'medium' | 'complex'
    estimatedDuration: string
  }
  settings: Array<{
    key: string
    label: string
    type: string
    required: boolean
    defaultValue: unknown
    description?: string
    min?: number
    max?: number
    options?: Array<{ value: string; label: string }>
  }>
  actions: Array<{
    actionType: string
    label: string
    description: string
    parameters: Array<{
      key: string
      label: string
      type: string
      required: boolean
      description?: string
      options?: Array<{ value: string; label: string }>
    }>
  }>
}

export interface ListGameCatalogResponse {
  games: GameCatalogItem[]
}

export class ListGameCatalogUseCase {
  constructor(private readonly gameCatalog: GameCatalogPort = defaultGameCatalog) {}

  execute(request: ListGameCatalogRequest): Result<ListGameCatalogResponse> {
    try {
      const games = this.gameCatalog
        .listGames({
          includeProprietary: request.includeProprietary,
          requiredCapabilities: request.requiredCapabilities,
        })
        .map((definition) => this.toCatalogItem(definition))

      return Result.ok({ games })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'list_game_catalog'))
    }
  }

  private toCatalogItem(definition: ReturnType<GameCatalogPort['listGames']>[number]): GameCatalogItem {
    return {
      id: definition.id,
      displayName: definition.displayName,
      description: definition.description,
      minPlayers: definition.playerConstraints.minPlayers,
      maxPlayers: definition.playerConstraints.maxPlayers,
      distribution: definition.licensing?.distribution ?? 'open-source',
      capabilities: definition.capabilities ?? ['turn-based'],
      metadata: {
        version: definition.metadata.version,
        complexity: definition.metadata.complexity,
        estimatedDuration: definition.metadata.estimatedDuration,
      },
      settings: definition.settings.fields.map((field) => this.toSettingView(field)),
      actions: (definition.actionDescriptors ?? []).map((descriptor) =>
        this.toActionDescriptorView(descriptor)
      ),
    }
  }

  private toSettingView(field: GameSettingField): GameCatalogItem['settings'][number] {
    return {
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required === true,
      defaultValue: field.defaultValue,
      description: field.description,
      min: field.min,
      max: field.max,
      options: field.options?.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    }
  }

  private toActionDescriptorView(
    descriptor: GameActionDescriptor
  ): GameCatalogItem['actions'][number] {
    return {
      actionType: descriptor.actionType,
      label: descriptor.label,
      description: descriptor.description,
      parameters: (descriptor.parameters ?? []).map((parameter) => ({
        key: parameter.key,
        label: parameter.label,
        type: parameter.type,
        required: parameter.required === true,
        description: parameter.description,
        options: parameter.options?.map((option) => ({
          value: option.value,
          label: option.label,
        })),
      })),
    }
  }
}
