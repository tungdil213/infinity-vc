import type { HttpRequest, HttpResponse } from '@adonisjs/core/http'
import type { Session } from '@adonisjs/session'

export function respondEnhancedLobbyHtmlSuccess({
  response,
  session,
  successMessage,
  redirectTo,
}: {
  response: HttpResponse
  session: Session
  successMessage: string
  redirectTo: string
}) {
  session.flash('success', successMessage)
  return response.redirect(redirectTo)
}

export function respondEnhancedLobbyRequestSuccess<TJson>({
  request,
  response,
  session,
  successMessage,
  redirectTo,
  jsonBody,
  jsonStatus,
}: {
  request: HttpRequest
  response: HttpResponse
  session: Session
  successMessage: string
  redirectTo: string
  jsonBody: TJson
  jsonStatus?: number
}) {
  if (request.accepts(['html'])) {
    return respondEnhancedLobbyHtmlSuccess({
      response,
      session,
      successMessage,
      redirectTo,
    })
  }

  if (typeof jsonStatus === 'number') {
    return response.status(jsonStatus).json(jsonBody)
  }

  return response.json(jsonBody)
}
