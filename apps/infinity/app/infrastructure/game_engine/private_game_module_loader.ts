import logger from '@adonisjs/core/services/logger'
import type { AnyGameModule, GameLauncher } from '@infinity.dev/game-engine'

const MAX_PRIVATE_MODULES = 20

function isGameModule(value: unknown): value is AnyGameModule {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as {
    definition?: { id?: unknown }
    createEngine?: unknown
  }

  return (
    typeof candidate.definition?.id === 'string' &&
    candidate.definition.id.length > 0 &&
    typeof candidate.createEngine === 'function'
  )
}

function parseModuleSpecifiers(rawSpecifiers?: string): string[] {
  if (!rawSpecifiers) {
    return []
  }

  const parsed = rawSpecifiers
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return [...new Set(parsed)].slice(0, MAX_PRIVATE_MODULES)
}

function isSafeModuleSpecifier(specifier: string): boolean {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.includes('..') ||
    specifier.includes('://') ||
    specifier.includes('\0')
  ) {
    return false
  }

  return /^[a-zA-Z0-9@/._-]+$/.test(specifier)
}

function extractModulesFromNamespace(namespace: Record<string, unknown>): AnyGameModule[] {
  const collected = new Map<string, AnyGameModule>()

  const appendIfModule = (candidate: unknown) => {
    if (isGameModule(candidate)) {
      collected.set(candidate.definition.id, candidate)
    }
  }

  const appendMany = (candidate: unknown) => {
    if (!Array.isArray(candidate)) {
      appendIfModule(candidate)
      return
    }

    for (const moduleCandidate of candidate) {
      appendIfModule(moduleCandidate)
    }
  }

  appendMany(namespace.default)
  appendMany(namespace.gameModule)
  appendMany(namespace.gameModules)

  for (const exportedValue of Object.values(namespace)) {
    appendIfModule(exportedValue)
  }

  return [...collected.values()]
}

export interface PrivateModuleLoadReport {
  loadedModuleIds: string[]
  failedSpecifiers: Array<{ specifier: string; reason: string }>
}

type ModuleImporter = (specifier: string) => Promise<Record<string, unknown>>

export class PrivateGameModuleLoader {
  constructor(
    private readonly moduleSpecifiers: string[] = parseModuleSpecifiers(
      process.env.PRIVATE_GAME_MODULE_SPECS
    ),
    private readonly moduleImporter: ModuleImporter = (specifier) =>
      import(specifier) as Promise<Record<string, unknown>>
  ) {}

  async loadInto(launcher: GameLauncher): Promise<PrivateModuleLoadReport> {
    if (this.moduleSpecifiers.length === 0) {
      return { loadedModuleIds: [], failedSpecifiers: [] }
    }

    const loadedModuleIds: string[] = []
    const failedSpecifiers: Array<{ specifier: string; reason: string }> = []

    for (const specifier of this.moduleSpecifiers) {
      if (!isSafeModuleSpecifier(specifier)) {
        failedSpecifiers.push({
          specifier,
          reason: 'Unsafe module specifier',
        })
        continue
      }

      try {
        const namespace = await this.moduleImporter(specifier)
        const modules = extractModulesFromNamespace(namespace)

        if (modules.length === 0) {
          failedSpecifiers.push({
            specifier,
            reason: 'No GameModule export found',
          })
          continue
        }

        for (const module of modules) {
          try {
            launcher.register(module)
            loadedModuleIds.push(module.definition.id)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            logger.warn(
              { specifier, moduleId: module.definition.id, error: message },
              '[PrivateGameModuleLoader] Failed to register private module'
            )
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failedSpecifiers.push({
          specifier,
          reason: message,
        })
      }
    }

    return { loadedModuleIds, failedSpecifiers }
  }
}
