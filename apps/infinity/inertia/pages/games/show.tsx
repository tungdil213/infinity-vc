import React, { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { useTransmit, TransmitEvent } from '../contexts/TransmitContext'

interface Player {
  uuid: string
  nickName: string
  isActive: boolean
  score?: number
}

interface GameState {
  uuid: string
  status: 'STARTING' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED'
  currentTurn?: string
  round: number
  maxRounds: number
  players: Player[]
  gameData: any
  winner?: Player
  createdAt: string
  updatedAt: string
}

interface GameProps {
  game: GameState
  currentUser: {
    uuid: string
    nickName: string
  }
}

export default function Game({ game: initialGame, currentUser }: GameProps) {
  const [game, setGame] = useState<GameState>(initialGame)
  const [notifications, setNotifications] = useState<string[]>([])
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [gameActions, setGameActions] = useState<string[]>([])

  const { isConnected, addEventListener, removeEventListener } = useTransmit()

  const addNotification = (message: string) => {
    setNotifications((prev) => [...prev, message])
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1))
    }, 5000)
  }

  const handleTransmitEvent = (event: TransmitEvent) => {
    console.log('Received game SSE event:', event)

    switch (event.type) {
      case 'game.state.updated':
        if (event.data.gameUuid === game.uuid) {
          setGame((prev) => ({
            ...prev,
            ...event.data.gameState,
          }))

          if (event.data.gameState.currentTurn === currentUser.uuid) {
            setIsMyTurn(true)
            addNotification("It's your turn!")
          } else {
            setIsMyTurn(false)
          }
        }
        break

      case 'game.turn.changed':
        if (event.data.gameUuid === game.uuid) {
          setGame((prev) => ({
            ...prev,
            currentTurn: event.data.currentTurn,
            round: event.data.round,
          }))

          const currentPlayer = game.players.find((p) => p.uuid === event.data.currentTurn)
          if (event.data.currentTurn === currentUser.uuid) {
            setIsMyTurn(true)
            addNotification("It's your turn!")
          } else {
            setIsMyTurn(false)
            addNotification(`It's ${currentPlayer?.nickName}'s turn`)
          }
        }
        break

      case 'game.player.action':
        if (event.data.gameUuid === game.uuid) {
          const player = game.players.find((p) => p.uuid === event.data.playerUuid)
          addNotification(`${player?.nickName} ${event.data.action}`)

          // Update game state based on action
          if (event.data.gameState) {
            setGame((prev) => ({
              ...prev,
              ...event.data.gameState,
            }))
          }
        }
        break

      case 'game.finished':
        if (event.data.gameUuid === game.uuid) {
          setGame((prev) => ({
            ...prev,
            status: 'FINISHED',
            winner: event.data.winner,
          }))

          if (event.data.winner?.uuid === currentUser.uuid) {
            addNotification('🎉 Congratulations! You won!')
          } else {
            addNotification(`Game finished! ${event.data.winner?.nickName} won!`)
          }
        }
        break

      case 'game.player.disconnected':
        if (event.data.gameUuid === game.uuid) {
          const player = game.players.find((p) => p.uuid === event.data.playerUuid)
          addNotification(`${player?.nickName} disconnected`)

          setGame((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.uuid === event.data.playerUuid ? { ...p, isActive: false } : p
            ),
          }))
        }
        break

      case 'game.player.reconnected':
        if (event.data.gameUuid === game.uuid) {
          const player = game.players.find((p) => p.uuid === event.data.playerUuid)
          addNotification(`${player?.nickName} reconnected`)

          setGame((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.uuid === event.data.playerUuid ? { ...p, isActive: true } : p
            ),
          }))
        }
        break

      default:
        console.log('Unhandled game SSE event type:', event.type)
    }
  }

  const handleGameAction = async (action: string, data?: any) => {
    try {
      const response = await fetch(`/api/v1/games/${game.uuid}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          data,
        }),
      })

      if (!response.ok) {
        throw new Error(`Game action failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Game action result:', result)
    } catch (error) {
      console.error('Failed to perform game action:', error)
      addNotification('Failed to perform action')
    }
  }

  const handleLeaveGame = async () => {
    try {
      window.location.href = '/lobbies'
    } catch (error) {
      console.error('Failed to leave game:', error)
      addNotification('Failed to leave game')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'STARTING':
        return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      case 'FINISHED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    // Add event listeners
    addEventListener('game.state.updated', handleTransmitEvent)
    addEventListener('game.turn.changed', handleTransmitEvent)
    addEventListener('game.player.joined', handleTransmitEvent)
    addEventListener('game.player.left', handleTransmitEvent)
    addEventListener('game.action.performed', handleTransmitEvent)
    addEventListener('game.round.completed', handleTransmitEvent)

    // Set initial turn state
    setIsMyTurn(game.currentTurn === currentUser.uuid)

    return () => {
      // Cleanup event listeners
      removeEventListener('game.state.updated', handleTransmitEvent)
      removeEventListener('game.turn.changed', handleTransmitEvent)
      removeEventListener('game.player.joined', handleTransmitEvent)
      removeEventListener('game.player.left', handleTransmitEvent)
      removeEventListener('game.action.performed', handleTransmitEvent)
      removeEventListener('game.round.completed', handleTransmitEvent)
    }
  }, [game.uuid])

  return (
    <>
      <Head title={`Game - Round ${game.round}`} />

      <div className="max-w-6xl mx-auto p-6">
        {/* Connection Status */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <Button
            onClick={handleLeaveGame}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Leave Game
          </Button>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded"
              >
                {notification}
              </div>
            ))}
          </div>
        )}

        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Game Session</h1>
              <div className="flex items-center gap-4 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(game.status)}`}
                >
                  {game.status}
                </span>
                <span className="text-sm text-gray-600">
                  Round {game.round} of {game.maxRounds}
                </span>
              </div>
            </div>

            {game.winner && (
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">🏆 Winner</div>
                <div className="text-gray-900">{game.winner.nickName}</div>
              </div>
            )}
          </div>

          {/* Current Turn Indicator */}
          {game.status === 'IN_PROGRESS' && game.currentTurn && (
            <div
              className={`p-4 rounded-lg ${isMyTurn ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}
            >
              <div className="flex items-center justify-center">
                {isMyTurn ? (
                  <>
                    <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-green-800 font-medium">It's your turn!</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-blue-800">
                      Waiting for {game.players.find((p) => p.uuid === game.currentTurn)?.nickName}
                      ...
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Players Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Players</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {game.players.map((player) => (
              <div
                key={player.uuid}
                className={`p-4 rounded-lg border ${
                  player.uuid === currentUser.uuid
                    ? 'border-blue-300 bg-blue-50'
                    : player.uuid === game.currentTurn
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {player.nickName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{player.nickName}</h3>
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${player.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="text-xs text-gray-600">
                          {player.isActive ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {player.uuid === currentUser.uuid && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        You
                      </span>
                    )}
                    {player.uuid === game.currentTurn && game.status === 'IN_PROGRESS' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Turn
                      </span>
                    )}
                  </div>

                  {typeof player.score !== 'undefined' && (
                    <div className="text-sm font-medium text-gray-900">Score: {player.score}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Board/Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Game Board</h2>

          {game.status === 'STARTING' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Game is starting...</p>
            </div>
          )}

          {game.status === 'IN_PROGRESS' && (
            <div className="space-y-6">
              {/* Game-specific UI would go here */}
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-4">Game interface will be implemented here</p>

                {isMyTurn && (
                  <div className="space-x-4">
                    <Button
                      onClick={() => handleGameAction('sample_action', { value: 'test' })}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Sample Action
                    </Button>
                    <Button onClick={() => handleGameAction('end_turn')} variant="outline">
                      End Turn
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {game.status === 'FINISHED' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Game Finished!</h3>
              {game.winner && (
                <p className="text-lg text-gray-600 mb-6">
                  {game.winner.uuid === currentUser.uuid
                    ? 'Congratulations! You won!'
                    : `${game.winner.nickName} won the game!`}
                </p>
              )}
              <div className="space-x-4">
                <Button
                  onClick={() => (window.location.href = '/lobbies')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Back to Lobbies
                </Button>
                <Button variant="outline">View Game Statistics</Button>
              </div>
            </div>
          )}

          {game.status === 'PAUSED' && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏸️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Game Paused</h3>
              <p className="text-gray-600">Waiting for all players to reconnect...</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
