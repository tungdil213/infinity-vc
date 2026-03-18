import logger from '@adonisjs/core/services/logger'
import { createDefaultLauncher, type GameLauncher } from '@infinity.dev/game-engine'
import { PrivateGameModuleLoader } from '#infrastructure/game_engine/private_game_module_loader'

let launcherSingleton: GameLauncher | null = null
let launcherInitialization: Promise<GameLauncher> | null = null

export function getAppGameLauncher(): GameLauncher {
  if (!launcherSingleton) {
    launcherSingleton = createDefaultLauncher()
  }

  return launcherSingleton
}

export async function initializeAppGameLauncher(): Promise<GameLauncher> {
  if (!launcherInitialization) {
    const launcher = getAppGameLauncher()
    const loader = new PrivateGameModuleLoader()

    launcherInitialization = loader.loadInto(launcher).then((report) => {
      if (report.loadedModuleIds.length > 0) {
        logger.info(
          {
            loadedModuleIds: report.loadedModuleIds,
          },
          '[GameLauncher] Private game modules loaded'
        )
      }

      if (report.failedSpecifiers.length > 0) {
        logger.warn(
          {
            failures: report.failedSpecifiers,
          },
          '[GameLauncher] Some private game modules failed to load'
        )
      }

      return launcher
    })
  }

  return launcherInitialization
}
