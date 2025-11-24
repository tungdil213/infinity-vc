/**
 * Singleton global pour LobbyService
 * Résout les race conditions React en créant le service AVANT le montage des composants
 */

import { LobbyService } from './lobby_service'
import type { TransmitContextType } from '../contexts/TransmitContext'

let globalLobbyService: LobbyService | null = null

/**
 * Initialise le LobbyService global (appelé une seule fois par le Provider)
 */
export function initializeLobbyService(transmitContext: TransmitContextType): LobbyService {
  if (!globalLobbyService && transmitContext) {
    console.log('🔧 LobbyServiceSingleton: Creating global instance')
    globalLobbyService = new LobbyService(transmitContext)
    console.log('🔧 LobbyServiceSingleton: ✅ Global instance ready')
  }
  return globalLobbyService!
}

/**
 * Récupère le LobbyService global (disponible partout, toujours synchrone)
 */
export function getLobbyService(): LobbyService | null {
  return globalLobbyService
}

/**
 * Détruit le singleton (pour les tests uniquement)
 */
export function destroyLobbyService() {
  if (globalLobbyService) {
    globalLobbyService.destroy()
    globalLobbyService = null
  }
}
