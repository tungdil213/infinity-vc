import type { GameDefinition, GameSettingField } from '@infinity.dev/game-engine'

export interface AvailableGameSettingViewModel {
  key: string
  label: string
  description?: string
  type: 'number' | 'boolean' | 'select' | 'string'
  required: boolean
  defaultValue: unknown
  min?: number
  max?: number
  options?: Array<{ value: string; label: string }>
}

export interface AvailableGameViewModel {
  id: string
  displayName: string
  description: string
  minPlayers: number
  maxPlayers: number
  settings: AvailableGameSettingViewModel[]
}

export function toAvailableGameViewModel(
  definition: GameDefinition<Record<string, unknown>>
): AvailableGameViewModel {
  return {
    id: definition.id,
    displayName: definition.displayName,
    description: definition.description,
    minPlayers: definition.playerConstraints.minPlayers,
    maxPlayers: definition.playerConstraints.maxPlayers,
    settings: definition.settings.fields.map(toAvailableGameSettingViewModel),
  }
}

export function toAvailableGameSettingViewModel(
  field: GameSettingField
): AvailableGameSettingViewModel {
  return {
    key: field.key,
    label: field.label,
    description: field.description,
    type: field.type,
    required: field.required === true,
    defaultValue: field.defaultValue,
    min: field.min,
    max: field.max,
    options: field.options?.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  }
}

export function buildDefaultGameSettings(
  fields: readonly AvailableGameSettingViewModel[]
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.key, field.defaultValue]))
}

export function coerceGameSettings(
  fields: readonly AvailableGameSettingViewModel[],
  rawSettings?: Record<string, unknown> | null
): Record<string, unknown> {
  const defaults = buildDefaultGameSettings(fields)
  const source = rawSettings ?? {}

  for (const field of fields) {
    if (!(field.key in source)) {
      continue
    }

    defaults[field.key] = coerceGameSettingValue(field, source[field.key])
  }

  return defaults
}

function coerceGameSettingValue(field: AvailableGameSettingViewModel, value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return field.defaultValue
  }

  switch (field.type) {
    case 'number':
      return typeof value === 'number' ? value : Number(value)
    case 'boolean':
      return normalizeBoolean(value)
    case 'string':
    case 'select':
      return typeof value === 'string' ? value : String(value)
    default:
      return value
  }
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['true', '1', 'on', 'yes'].includes(normalized)
  }

  return Boolean(value)
}
