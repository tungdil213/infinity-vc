import type { CreateLobbyPayload, LobbyData, LobbyFilters } from './lobby_types'

interface LobbyListResponse {
  lobbies: LobbyData[]
  total: number
}

export class LobbyApiClient {
  private static readonly BASE_URL = '/api/v1/lobbies'

  async fetchLobbies(filters?: LobbyFilters): Promise<LobbyListResponse> {
    const params = new URLSearchParams()

    if (filters?.status) params.append('status', filters.status)
    if (filters?.hasSlots !== undefined) params.append('hasSlots', String(filters.hasSlots))
    if (filters?.includePrivate !== undefined) {
      params.append('includePrivate', String(filters.includePrivate))
    }

    const response = await fetch(`${LobbyApiClient.BASE_URL}?${params.toString()}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch lobbies: ${response.statusText}`)
    }

    const data = await response.json()
    const rawLobbies = Array.isArray(data.lobbies)
      ? data.lobbies
      : Array.isArray(data.data)
        ? data.data
        : []

    return {
      lobbies: rawLobbies,
      total: typeof data.meta?.total === 'number' ? data.meta.total : rawLobbies.length,
    }
  }

  async fetchLobbyDetails(lobbyUuid: string): Promise<LobbyData | null> {
    const response = await fetch(`${LobbyApiClient.BASE_URL}/${lobbyUuid}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch lobby: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.lobby) return data.lobby
    if (data.data) return data.data

    return data
  }

  async createLobby(payload: CreateLobbyPayload): Promise<unknown> {
    const response = await fetch(LobbyApiClient.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Failed to create lobby: ${response.statusText}`)
    }

    return response.json()
  }

  async joinLobby(lobbyUuid: string, userUuid: string): Promise<unknown> {
    const response = await fetch(`${LobbyApiClient.BASE_URL}/${lobbyUuid}/join`, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      credentials: 'include',
      body: JSON.stringify({ userUuid }),
    })

    if (!response.ok) {
      throw new Error(`Failed to join lobby: ${response.statusText}`)
    }

    return response.json()
  }

  async leaveLobby(lobbyUuid: string, userUuid: string): Promise<unknown> {
    const response = await fetch(`${LobbyApiClient.BASE_URL}/${lobbyUuid}/leave`, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      credentials: 'include',
      body: JSON.stringify({ userUuid }),
    })

    if (!response.ok) {
      throw new Error(`Failed to leave lobby: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }

    return { success: true, message: 'Successfully left lobby' }
  }

  async startGame(lobbyUuid: string, userUuid: string): Promise<unknown> {
    const response = await fetch(`${LobbyApiClient.BASE_URL}/${lobbyUuid}/start`, {
      method: 'POST',
      headers: this.buildJsonHeaders({ Accept: 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ userUuid }),
    })

    if (!response.ok) {
      throw new Error(`Failed to start game: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }

    return {
      success: response.ok,
      redirected: response.redirected,
      url: response.url,
    }
  }

  async transferOwnership(lobbyUuid: string, newOwnerUuid: string): Promise<unknown> {
    const response = await fetch(`${LobbyApiClient.BASE_URL}/${lobbyUuid}/transfer`, {
      method: 'POST',
      headers: this.buildJsonHeaders({ Accept: 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ newOwnerUuid }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message =
        payload && typeof payload.error === 'string'
          ? payload.error
          : `Failed to transfer lobby host: ${response.statusText}`
      throw new Error(message)
    }

    return payload
  }

  private buildJsonHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    }

    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken
    }

    return headers
  }
}
