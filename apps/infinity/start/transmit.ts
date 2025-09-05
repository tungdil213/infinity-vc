import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Configuration des autorisations pour les channels Transmit
 */

// Channel global pour les mises à jour de liste des lobbies
transmit.authorize('lobbies', (ctx: HttpContext) => {
  // Tous les utilisateurs authentifiés peuvent voir la liste des lobbies
  return !!ctx.auth.user
})

// Channel spécifique à un lobby
transmit.authorize<{ lobbyUuid: string }>(
  'lobbies/:lobbyUuid',
  async (ctx: HttpContext, { lobbyUuid }) => {
    // Vérifier que l'utilisateur est authentifié
    if (!ctx.auth.user) {
      return false
    }

    // TODO: Ajouter une vérification pour s'assurer que l'utilisateur peut accéder à ce lobby
    // Pour l'instant, on autorise tous les utilisateurs authentifiés
    console.log(`User ${ctx.auth.user.userUuid} accessing lobby ${lobbyUuid}`)
    return true
  }
)

// Channel pour les notifications utilisateur
transmit.authorize<{ userUuid: string }>('users/:userUuid', (ctx: HttpContext, { userUuid }) => {
  // L'utilisateur ne peut écouter que ses propres notifications
  return ctx.auth.user?.userUuid === userUuid
})
