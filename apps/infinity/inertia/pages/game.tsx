import React, { useState, useEffect, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@tyfo.dev/ui/primitives/button'
import { useTransmit } from '../contexts/TransmitContext'
import Layout from '../layouts/layout'

const CARD_INFO: Record<string, { name: string; value: number; description: string; color: string }> = {
  guard: { name: 'Guard', value: 1, description: 'Guess a card. If correct, target eliminated.', color: 'bg-red-500' },
  priest: { name: 'Priest', value: 2, description: "Look at another player's hand.", color: 'bg-blue-500' },
  baron: { name: 'Baron', value: 3, description: 'Compare hands. Lower value eliminated.', color: 'bg-green-500' },
  handmaid: { name: 'Handmaid', value: 4, description: 'Protected until your next turn.', color: 'bg-yellow-500' },
  prince: { name: 'Prince', value: 5, description: 'Target discards and draws new card.', color: 'bg-purple-500' },
  king: { name: 'King', value: 6, description: 'Trade hands with another player.', color: 'bg-orange-500' },
  countess: { name: 'Countess', value: 7, description: 'Must discard if you have King/Prince.', color: 'bg-pink-500' },
  princess: { name: 'Princess', value: 8, description: 'If discarded, you are eliminated.', color: 'bg-indigo-500' },
}

const GUESSABLE_CARDS = ['priest', 'baron', 'handmaid', 'prince', 'king', 'countess', 'princess']
const TARGET_CARDS = ['guard', 'priest', 'baron', 'prince', 'king']

interface LoveLetterPlayer {
  id: string
  name: string
  isActive: boolean
  isProtected: boolean
  isEliminated: boolean
  handCount: number
  discardPile: Array<{ type: string; name: string; value: number }>
  tokensOfAffection: number
  isCurrentPlayer: boolean
  isMe: boolean
}

interface GameState {
  phase: string
  currentPlayerId: string | null
  round: number
  turn: number
  isFinished: boolean
  deckCount: number
  players: LoveLetterPlayer[]
}

interface PlayerViewState {
  playerId: string
  state: GameState
  availableActions: string[]
  isMyTurn: boolean
}

interface GameProps {
  gameId: string
  playerView: PlayerViewState | null
  availableActions: string[]
  user: { uuid: string; nickName: string }
  isFinished: boolean
  game?: unknown
}

function Card({ cardType, onClick, selected, disabled, size = 'normal' }: {
  cardType: string
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  size?: 'small' | 'normal'
}) {
  const card = CARD_INFO[cardType]
  if (!card) return null
  const sizeClasses = { small: 'w-12 h-16 text-xs', normal: 'w-20 h-28 text-sm' }
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${sizeClasses[size]} ${card.color} rounded-lg shadow-lg flex flex-col items-center justify-between p-2 text-white font-bold
        ${onClick && !disabled ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${disabled ? 'opacity-50' : ''}`}
    >
      <span className="text-lg">{card.value}</span>
      <span className="text-center leading-tight">{card.name}</span>
    </div>
  )
}

function PlayerCard({ player, isTarget, onSelect, canTarget }: {
  player: LoveLetterPlayer
  isTarget: boolean
  onSelect: () => void
  canTarget: boolean
}) {
  return (
    <div
      onClick={canTarget && !player.isProtected && !player.isEliminated ? onSelect : undefined}
      className={`p-4 rounded-lg border-2 transition-all
        ${player.isMe ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        ${player.isCurrentPlayer ? 'ring-2 ring-green-400' : ''}
        ${player.isEliminated ? 'opacity-50 bg-gray-100' : ''}
        ${player.isProtected ? 'border-yellow-400' : ''}
        ${isTarget ? 'ring-4 ring-red-400 scale-105' : ''}
        ${canTarget && !player.isProtected && !player.isEliminated ? 'cursor-pointer hover:shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${player.isEliminated ? 'bg-gray-400' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{player.name}</h3>
            <div className="flex gap-1 text-xs">
              {player.isMe && <span className="px-1 bg-blue-100 text-blue-700 rounded">You</span>}
              {player.isCurrentPlayer && <span className="px-1 bg-green-100 text-green-700 rounded">Turn</span>}
              {player.isProtected && <span className="px-1 bg-yellow-100 text-yellow-700 rounded">Protected</span>}
              {player.isEliminated && <span className="px-1 bg-red-100 text-red-700 rounded">Out</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg">Tokens: {player.tokensOfAffection}</div>
          <div className="text-xs text-gray-500">{player.handCount} cards</div>
        </div>
      </div>
      {player.discardPile && player.discardPile.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Discarded:</div>
          <div className="flex gap-1 flex-wrap">
            {player.discardPile.map((c, i) => <Card key={i} cardType={c.type} size="small" />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Game({ gameId, playerView, availableActions: initialActions, user, isFinished }: GameProps) {
  const [gameState, setGameState] = useState<PlayerViewState | null>(playerView)
  const [availableActions, setAvailableActions] = useState<string[]>(initialActions || [])
  const [myHand, setMyHand] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { isConnected, subscribeToGame } = useTransmit()

  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [...prev, msg])
    setTimeout(() => setNotifications(prev => prev.slice(1)), 5000)
  }, [])

  const refreshGameState = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/games/${gameId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setGameState(data.playerView)
        setAvailableActions(data.availableActions || [])
        if (data.playerView?.state?.myHand) setMyHand(data.playerView.state.myHand)
      }
    } catch (e) {
      console.error('Failed to refresh:', e)
    }
  }, [gameId])

  const handleDraw = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const res = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'draw' }),
      })
      const result = await res.json()
      if (result.success) { addNotification('Card drawn!'); await refreshGameState() }
      else addNotification(`Error: ${result.error}`)
    } catch { addNotification('Failed to draw') }
    finally { setIsLoading(false) }
  }

  const handlePlayCard = async () => {
    if (!selectedCard || isLoading) return
    const needsTarget = TARGET_CARDS.includes(selectedCard) && selectedCard !== 'prince'
    const needsGuess = selectedCard === 'guard'
    if (needsTarget && !selectedTarget) { addNotification('Select a target'); return }
    if (needsGuess && !selectedGuess) { addNotification('Select card to guess'); return }
    setIsLoading(true)
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const res = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          action: 'play',
          cardType: selectedCard,
          targetPlayerId: selectedTarget,
          guessedCard: selectedGuess,
        }),
      })
      const result = await res.json()
      if (result.success) {
        addNotification(`Played ${CARD_INFO[selectedCard]?.name}!`)
        setSelectedCard(null); setSelectedTarget(null); setSelectedGuess(null)
        await refreshGameState()
      } else addNotification(`Error: ${result.error}`)
    } catch { addNotification('Failed to play') }
    finally { setIsLoading(false) }
  }

  // Souscription temps réel aux événements de jeu via Transmit
  useEffect(() => {
    if (!isConnected) return

    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      unsubscribe = await subscribeToGame(gameId, () => {
        refreshGameState()
      })
    }

    subscribe().catch((err) => {
      console.error('Failed to subscribe to game events:', err)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [gameId, isConnected, subscribeToGame, refreshGameState])

  useEffect(() => { refreshGameState() }, [refreshGameState])

  if (isFinished || gameState?.state?.isFinished) {
    const winner = gameState?.state?.players?.find(p => !p.isEliminated)
    return (
      <Layout>
        <Head title="Game Over" />
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">Game Over</div>
            <h1 className="text-3xl font-bold mb-2">{winner?.isMe ? 'You won!' : `${winner?.name} wins!`}</h1>
            <Button onClick={() => window.location.href = '/lobbies'} className="w-full mt-4">Back to Lobbies</Button>
          </div>
        </div>
      </Layout>
    )
  }

  const players = gameState?.state?.players || []
  const isMyTurn = gameState?.isMyTurn || false
  const phase = gameState?.state?.phase || 'waiting'
  const canDraw = availableActions.includes('draw_card')
  const canPlay = availableActions.includes('play_card')

  return (
    <Layout>
      <Head title={`Love Letter - Round ${gameState?.state?.round || 1}`} />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 p-4">
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 flex items-center justify-between text-white">
            <div>
              <h1 className="text-2xl font-bold">Love Letter</h1>
              <p className="text-purple-200">Round {gameState?.state?.round || 1} | Deck: {gameState?.state?.deckCount || 0}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <Button variant="outline" onClick={() => window.location.href = '/lobbies'}>Leave</Button>
            </div>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="max-w-6xl mx-auto mb-4 space-y-2">
            {notifications.map((n, i) => <div key={i} className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">{n}</div>)}
          </div>
        )}

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Players</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map(p => (
                  <PlayerCard key={p.id} player={p} isTarget={selectedTarget === p.id}
                    onSelect={() => setSelectedTarget(p.id)}
                    canTarget={canPlay && selectedCard !== null && TARGET_CARDS.includes(selectedCard) && !p.isMe} />
                ))}
              </div>
            </div>
            {isMyTurn && (
              <div className="bg-green-500 text-white rounded-xl p-4 text-center animate-pulse">
                <span className="text-xl font-bold">Your turn!</span>
                <span className="ml-2">{phase === 'draw' ? 'Draw a card' : phase === 'play' ? 'Play a card' : ''}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Your Hand</h2>
              <div className="flex gap-2 justify-center flex-wrap">
                {myHand.length > 0 ? myHand.map((c, i) => (
                  <Card key={i} cardType={c} selected={selectedCard === c}
                    onClick={() => setSelectedCard(selectedCard === c ? null : c)} disabled={!canPlay} />
                )) : <p className="text-gray-500 py-8">No cards</p>}
              </div>
              {selectedCard && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">{CARD_INFO[selectedCard]?.name}</p>
                  <p className="text-sm text-gray-600">{CARD_INFO[selectedCard]?.description}</p>
                </div>
              )}
            </div>

            {selectedCard === 'guard' && (
              <div className="bg-white rounded-xl shadow-xl p-4">
                <h2 className="text-lg font-semibold mb-4">Guess a Card</h2>
                <div className="grid grid-cols-2 gap-2">
                  {GUESSABLE_CARDS.map(c => (
                    <button key={c} onClick={() => setSelectedGuess(c)}
                      className={`p-2 rounded-lg border-2 text-left ${selectedGuess === c ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                      <span className="font-semibold">{CARD_INFO[c]?.name}</span> ({CARD_INFO[c]?.value})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Actions</h2>
              <div className="space-y-2">
                {canDraw && <Button onClick={handleDraw} disabled={isLoading} className="w-full bg-blue-600">{isLoading ? 'Drawing...' : 'Draw Card'}</Button>}
                {canPlay && selectedCard && <Button onClick={handlePlayCard} disabled={isLoading} className="w-full bg-green-600">{isLoading ? 'Playing...' : `Play ${CARD_INFO[selectedCard]?.name}`}</Button>}
                {!isMyTurn && <p className="text-center text-gray-500 py-4">Waiting...</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
