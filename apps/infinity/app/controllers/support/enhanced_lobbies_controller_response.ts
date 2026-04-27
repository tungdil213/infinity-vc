import logger from '@adonisjs/core/services/logger'
import type { HttpContext, HttpRequest, HttpResponse } from '@adonisjs/core/http'
import type { Session } from '@adonisjs/session'

const LOBBY_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  'Lobby not found': 'lobbies.errors.notFound',
  'Player not found': 'lobbies.errors.playerNotFound',
  'Player is already in a lobby': 'lobbies.errors.playerAlreadyInLobby',
  'Password is required for this lobby': 'lobbies.errors.passwordRequired',
  'Invalid lobby password': 'lobbies.errors.invalidPassword',
  'Lobby is full': 'lobbies.errors.full',
  'Player is not in this lobby': 'lobbies.errors.playerNotInLobby',
  'Player not found in lobby': 'lobbies.errors.playerNotInLobby',
  'Only the lobby creator can start the game': 'lobbies.errors.onlyCreatorCanStart',
  'Lobby is not ready to start a game': 'lobbies.errors.lobbyNotReady',
  'Failed to start game': 'lobbies.errors.startFailed',
  'Only the lobby creator can kick players': 'lobbies.errors.onlyCreatorCanKick',
  'Target player is not in this lobby': 'lobbies.errors.targetNotInLobby',
  'Cannot kick players from a game in progress': 'lobbies.errors.cannotKickInProgress',
  'Cannot close a lobby while a game is starting': 'lobbies.errors.cannotCloseStarting',
  'Lobby UUID is required': 'lobbies.errors.lobbyUuidRequired',
  'User UUID is required': 'lobbies.errors.userUuidRequired',
  'Closer user UUID is required': 'lobbies.errors.userUuidRequired',
}

export function translateEnhancedLobbyUseCaseError(
  i18n: HttpContext['i18n'],
  error: string
): string {
  const translatedKey = LOBBY_ERROR_TRANSLATION_KEYS[error]
  if (translatedKey) {
    return i18n.t(translatedKey)
  }

  return error
}

export function respondEnhancedLobbyUseCaseFailure({
  request,
  response,
  session,
  i18n,
  error,
}: {
  request: HttpRequest
  response: HttpResponse
  session: Session
  i18n: HttpContext['i18n']
  error: string
}) {
  const localizedError = translateEnhancedLobbyUseCaseError(i18n, error)

  if (request.accepts(['html'])) {
    session.flash('error', localizedError)
    return response.redirect().back()
  }

  return response.status(400).json({ error: localizedError })
}

export function respondEnhancedLobbyUnexpectedFailure({
  request,
  response,
  session,
  error,
  logMessage,
  userMessage,
  apiMessage,
}: {
  request: HttpRequest
  response: HttpResponse
  session: Session
  error: unknown
  logMessage: string
  userMessage: string
  apiMessage: string
}) {
  logger.error({ error }, logMessage)

  if (request.accepts(['html'])) {
    session.flash('error', userMessage)
    return response.redirect().back()
  }

  return response.status(500).json({ error: apiMessage })
}
