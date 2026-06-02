import { test } from '@japa/runner'
import { LobbyStateStore } from '../../../../inertia/services/lobby_state_store.js'
import type { LobbyData, LobbyListState } from '../../../../inertia/services/lobby_types.js'

function makeLobby(overrides: Partial<LobbyData> = {}): LobbyData {
  return {
    uuid: 'lobby-1',
    name: 'Lobby 1',
    status: 'waiting',
    currentPlayers: 1,
    maxPlayers: 4,
    isPrivate: false,
    hasAvailableSlots: true,
    canStart: false,
    createdBy: 'user-1',
    players: [{ uuid: 'user-1', nickName: 'User1' }],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

test.group('LobbyStateStore', () => {
  test('should expose initial lobby list state to subscribers', ({ assert }) => {
    const store = new LobbyStateStore()

    let snapshot: LobbyListState | null = null
    store.subscribeLobbyList((state) => {
      snapshot = state
    })

    assert.isNotNull(snapshot)
    assert.deepEqual(snapshot, {
      lobbies: [],
      loading: true,
      error: null,
      total: 0,
    })
  })

  test('should update lobby list state after setLobbyListData', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobby = makeLobby()

    const snapshots: LobbyListState[] = []
    store.subscribeLobbyList((state) => {
      snapshots.push(state)
    })

    store.setLobbyListData([lobby], 1)
    const latestState = snapshots[snapshots.length - 1]

    assert.equal(latestState.loading, false)
    assert.equal(latestState.error, null)
    assert.equal(latestState.total, 1)
    assert.equal(latestState.lobbies[0].uuid, lobby.uuid)
  })

  test('should add a lobby on lobby.created event only once', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobby = makeLobby()

    const snapshots: LobbyListState[] = []
    store.subscribeLobbyList((state) => {
      snapshots.push(state)
    })

    store.setLobbyListData([], 0)

    const createdEvent = {
      type: 'lobby.created',
      data: {
        ...lobby,
        lobby,
      },
      timestamp: new Date().toISOString(),
      channel: 'lobbies',
    }

    store.applyLobbyEvent(createdEvent)
    store.applyLobbyEvent(createdEvent)
    const latestState = snapshots[snapshots.length - 1]

    assert.equal(latestState.total, 1)
    assert.equal(latestState.lobbies.length, 1)
  })

  test('should update detail state on player joined event', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobbyUuid = 'lobby-join-1'

    store.setLobbyDetail(
      lobbyUuid,
      makeLobby({
        uuid: lobbyUuid,
        currentPlayers: 1,
        players: [{ uuid: 'user-1', nickName: 'User1' }],
      })
    )

    let receivedCurrentPlayers = 0
    let receivedPlayersCount = 0

    store.subscribeLobbyDetail(lobbyUuid, (state) => {
      receivedCurrentPlayers = state.lobby?.currentPlayers || 0
      receivedPlayersCount = state.lobby?.players.length || 0
    })

    store.applyLobbyEvent({
      type: 'lobby.player.joined',
      data: {
        lobbyUuid,
        playerCount: 2,
        player: {
          uuid: 'user-2',
          nickName: 'User2',
        },
      },
      timestamp: new Date().toISOString(),
      channel: `lobbies/${lobbyUuid}`,
    })

    assert.equal(receivedCurrentPlayers, 2)
    assert.equal(receivedPlayersCount, 2)
  })

  test('should recalculate canStart after player left event payload update', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobbyUuid = 'lobby-left-1'

    store.setLobbyDetail(
      lobbyUuid,
      makeLobby({
        uuid: lobbyUuid,
        status: 'FULL',
        currentPlayers: 2,
        maxPlayers: 2,
        canStart: true,
        hasAvailableSlots: false,
      })
    )

    store.applyLobbyEvent({
      type: 'lobby.player.left',
      data: {
        lobbyUuid,
        player: { uuid: 'user-2', nickName: 'User2' },
        lobby: {
          uuid: lobbyUuid,
          status: 'WAITING',
          currentPlayers: 1,
          maxPlayers: 2,
          players: [{ uuid: 'user-1', nickName: 'User1' }],
        },
      },
      timestamp: new Date().toISOString(),
      channel: `lobbies/${lobbyUuid}`,
    })

    let canStart: boolean | undefined
    let hasAvailableSlots: boolean | undefined

    store.subscribeLobbyDetail(lobbyUuid, (state) => {
      canStart = state.lobby?.canStart
      hasAvailableSlots = state.lobby?.hasAvailableSlots
    })

    assert.equal(canStart, false)
    assert.equal(hasAvailableSlots, true)
  })

  test('should store gameUuid and set IN_GAME on lobby.game.started', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobbyUuid = 'lobby-game-started-1'

    store.setLobbyListData(
      [
        makeLobby({
          uuid: lobbyUuid,
          status: 'ready',
          currentPlayers: 2,
          canStart: true,
        }),
      ],
      1
    )

    store.setLobbyDetail(
      lobbyUuid,
      makeLobby({
        uuid: lobbyUuid,
        status: 'ready',
        currentPlayers: 2,
        canStart: true,
      })
    )

    store.applyLobbyEvent({
      type: 'lobby.game.started',
      data: {
        lobbyUuid,
        gameUuid: 'game-42',
      },
      timestamp: new Date().toISOString(),
      channel: `lobbies/${lobbyUuid}`,
    })

    let detailGameUuid: string | undefined
    let detailStatus: string | undefined
    store.subscribeLobbyDetail(lobbyUuid, (state) => {
      detailGameUuid = state.lobby?.gameUuid
      detailStatus = state.lobby?.status
    })

    let listSnapshot: LobbyListState | null = null
    store.subscribeLobbyList((state) => {
      listSnapshot = state
    })

    assert.equal(detailStatus, 'IN_GAME')
    assert.equal(detailGameUuid, 'game-42')
    assert.equal(listSnapshot?.lobbies[0].status, 'IN_GAME')
    assert.equal(listSnapshot?.lobbies[0].gameUuid, 'game-42')
  })

  test('should update createdBy on lobby.owner.changed', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobbyUuid = 'lobby-owner-changed-1'

    store.setLobbyListData(
      [
        makeLobby({
          uuid: lobbyUuid,
          createdBy: 'user-1',
          players: [
            { uuid: 'user-1', nickName: 'User1' },
            { uuid: 'user-2', nickName: 'User2' },
          ],
        }),
      ],
      1
    )
    store.setLobbyDetail(
      lobbyUuid,
      makeLobby({
        uuid: lobbyUuid,
        createdBy: 'user-1',
        players: [
          { uuid: 'user-1', nickName: 'User1' },
          { uuid: 'user-2', nickName: 'User2' },
        ],
      })
    )

    store.applyLobbyEvent({
      type: 'lobby.owner.changed',
      data: {
        lobbyUuid,
        previousOwnerUuid: 'user-1',
        newOwnerUuid: 'user-2',
        transferredByUserUuid: 'user-1',
      },
      timestamp: new Date().toISOString(),
      channel: `lobbies/${lobbyUuid}`,
    })

    let detailCreatedBy: string | undefined
    let listSnapshot: LobbyListState | null = null
    store.subscribeLobbyDetail(lobbyUuid, (state) => {
      detailCreatedBy = state.lobby?.createdBy
    })
    store.subscribeLobbyList((state) => {
      listSnapshot = state
    })

    assert.equal(detailCreatedBy, 'user-2')
    assert.equal(listSnapshot?.lobbies[0].createdBy, 'user-2')
  })

  test('should normalize legacy gameId to gameUuid on lobby.game.started', ({ assert }) => {
    const store = new LobbyStateStore()
    const lobbyUuid = 'lobby-game-started-legacy'

    store.setLobbyDetail(
      lobbyUuid,
      makeLobby({
        uuid: lobbyUuid,
        status: 'ready',
        currentPlayers: 2,
        canStart: true,
      })
    )

    store.applyLobbyEvent({
      type: 'lobby.game.started',
      data: {
        lobbyUuid,
        gameId: 'game-legacy-1',
      },
      timestamp: new Date().toISOString(),
      channel: `lobbies/${lobbyUuid}`,
    })

    let detailGameUuid: string | undefined
    store.subscribeLobbyDetail(lobbyUuid, (state) => {
      detailGameUuid = state.lobby?.gameUuid
    })

    assert.equal(detailGameUuid, 'game-legacy-1')
  })
})
