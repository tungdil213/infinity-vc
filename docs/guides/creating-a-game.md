# 🚀 Quick Start - Créer votre premier plugin de jeu

Ce guide vous montre comment créer un jeu complet en 15 minutes.

## 📋 Exemple : Jeu de dés simple

Nous allons créer un jeu de dés où 2 joueurs lancent des dés et le plus haut score gagne.

### Étape 1 : Créer la structure du plugin

```bash
cd apps/infinity/app/domain/games/plugins
mkdir dice-game
cd dice-game
```

### Étape 2 : Définir l'état et les actions

Créez `dice_game_plugin.ts` :

```typescript
import type { GamePlugin, GameConfig, GameValidationResult } from '../../base/game_plugin.js'
import { GameValidation } from '../../base/game_plugin.js'

/**
 * État du jeu de dés
 */
export interface DiceGameState {
  players: {
    [playerUuid: string]: {
      rolled: boolean
      score: number | null
    }
  }
  currentRound: number
  finished: boolean
  winner: string | null
}

/**
 * Actions possibles
 */
export interface DiceGameAction {
  type: 'roll'
}

/**
 * Plugin Dice Game
 */
export class DiceGamePlugin implements GamePlugin<DiceGameState, DiceGameAction> {
  readonly id = 'dice-game'
  readonly name = 'Dice Game'
  readonly description = 'Un simple jeu de dés - le plus haut score gagne!'
  readonly version = '1.0.0'
  readonly minPlayers = 2
  readonly maxPlayers = 6
  readonly estimatedDuration = 2 // minutes
  readonly tags = ['quick-game', 'luck', 'simple']
  readonly defaultConfig: GameConfig = {
    turnTimeLimit: 10,
    allowSpectators: true,
  }

  initializeState(playerUuids: string[]): DiceGameState {
    const players: DiceGameState['players'] = {}
    
    for (const uuid of playerUuids) {
      players[uuid] = {
        rolled: false,
        score: null,
      }
    }

    return {
      players,
      currentRound: 1,
      finished: false,
      winner: null,
    }
  }

  validateAction(
    state: DiceGameState,
    playerUuid: string,
    action: DiceGameAction
  ): GameValidationResult {
    // Vérifier que le jeu n'est pas terminé
    if (state.finished) {
      return GameValidation.invalid('Game is finished', 'GAME_FINISHED')
    }

    // Vérifier que le joueur existe
    if (!state.players[playerUuid]) {
      return GameValidation.invalid('Player not in game', 'PLAYER_NOT_FOUND')
    }

    // Vérifier que le joueur n'a pas déjà lancé
    if (state.players[playerUuid].rolled) {
      return GameValidation.invalid('Already rolled this round', 'ALREADY_ROLLED')
    }

    // Vérifier le type d'action
    if (action.type !== 'roll') {
      return GameValidation.invalid('Invalid action type', 'INVALID_ACTION')
    }

    return GameValidation.valid()
  }

  applyAction(state: DiceGameState, playerUuid: string, _action: DiceGameAction): DiceGameState {
    // Lancer deux dés
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const score = die1 + die2

    // Créer le nouveau state
    const newState: DiceGameState = {
      ...state,
      players: {
        ...state.players,
        [playerUuid]: {
          rolled: true,
          score,
        },
      },
    }

    // Vérifier si tous les joueurs ont lancé
    const allRolled = Object.values(newState.players).every((p) => p.rolled)

    if (allRolled) {
      // Déterminer le gagnant
      let maxScore = 0
      let winner: string | null = null

      for (const [uuid, player] of Object.entries(newState.players)) {
        if (player.score && player.score > maxScore) {
          maxScore = player.score
          winner = uuid
        }
      }

      newState.finished = true
      newState.winner = winner
    }

    return newState
  }

  isGameFinished(state: DiceGameState): boolean {
    return state.finished
  }

  getWinner(state: DiceGameState): string | null {
    return state.winner
  }

  getAvailableActions(state: DiceGameState, playerUuid: string): DiceGameAction[] {
    if (state.finished || state.players[playerUuid]?.rolled) {
      return []
    }
    return [{ type: 'roll' }]
  }

  serializeState(state: DiceGameState): string {
    return JSON.stringify(state)
  }

  deserializeState(serialized: string): DiceGameState {
    return JSON.parse(serialized)
  }
}
```

### Étape 3 : Créer l'index du plugin

Créez `index.ts` :

```typescript
export { DiceGamePlugin } from './dice_game_plugin.js'
export type { DiceGameState, DiceGameAction } from './dice_game_plugin.js'
```

### Étape 4 : Enregistrer le plugin

Modifiez `app/domain/games/index.ts` :

```typescript
import { getGamePluginRegistry } from './base/game_plugin_registry.js'
import { TicTacToePlugin } from './plugins/tic-tac-toe/index.js'
import { DiceGamePlugin } from './plugins/dice-game/index.js' // ← Ajoutez

export function initializeGamePlugins(): void {
  const registry = getGamePluginRegistry()

  registry.register(new TicTacToePlugin())
  registry.register(new DiceGamePlugin()) // ← Ajoutez

  console.log(`🎮 Initialized ${registry.getStats().totalGames} game plugins`)
}

// ... reste du fichier
```

### Étape 5 : Tester votre plugin

Redémarrez le serveur :

```bash
cd apps/infinity
node ace serve --watch
```

Votre jeu est maintenant disponible ! 🎉

## 🧪 Tester le plugin

Créez un test unitaire dans `tests/unit/games/dice_game.spec.ts` :

```typescript
import { test } from '@japa/runner'
import { DiceGamePlugin } from '#domain/games/plugins/dice-game/index'

test.group('DiceGame Plugin', () => {
  test('should initialize with correct state', ({ assert }) => {
    const plugin = new DiceGamePlugin()
    const playerUuids = ['player1', 'player2']
    
    const state = plugin.initializeState(playerUuids)
    
    assert.equal(state.finished, false)
    assert.equal(state.currentRound, 1)
    assert.property(state.players, 'player1')
    assert.property(state.players, 'player2')
  })

  test('should validate roll action', ({ assert }) => {
    const plugin = new DiceGamePlugin()
    const state = plugin.initializeState(['player1'])
    const action = { type: 'roll' as const }
    
    const result = plugin.validateAction(state, 'player1', action)
    
    assert.isTrue(result.valid)
  })

  test('should prevent double roll', ({ assert }) => {
    const plugin = new DiceGamePlugin()
    let state = plugin.initializeState(['player1'])
    const action = { type: 'roll' as const }
    
    // Premier lancer
    state = plugin.applyAction(state, 'player1', action)
    
    // Deuxième lancer (devrait échouer)
    const result = plugin.validateAction(state, 'player1', action)
    
    assert.isFalse(result.valid)
    assert.equal(result.code, 'ALREADY_ROLLED')
  })

  test('should determine winner when all rolled', ({ assert }) => {
    const plugin = new DiceGamePlugin()
    let state = plugin.initializeState(['player1', 'player2'])
    const action = { type: 'roll' as const }
    
    // Les deux joueurs lancent
    state = plugin.applyAction(state, 'player1', action)
    state = plugin.applyAction(state, 'player2', action)
    
    assert.isTrue(plugin.isGameFinished(state))
    assert.isNotNull(plugin.getWinner(state))
  })
})
```

Lancez les tests :

```bash
node ace test --files tests/unit/games/dice_game.spec.ts
```

## 🎨 Créer l'interface utilisateur

Créez les composants React dans `inertia/components/games/dice-game/` :

```typescript
// DiceGameBoard.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@tyfo.dev/ui'
import { Button } from '@tyfo.dev/ui'

interface DiceGameBoardProps {
  gameState: DiceGameState
  currentPlayerUuid: string
  onRoll: () => void
}

export function DiceGameBoard({ gameState, currentPlayerUuid, onRoll }: DiceGameBoardProps) {
  const currentPlayer = gameState.players[currentPlayerUuid]
  const canRoll = !currentPlayer?.rolled && !gameState.finished

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎲 Dice Game</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Affichage des joueurs */}
          {Object.entries(gameState.players).map(([uuid, player]) => (
            <div key={uuid} className="flex items-center justify-between p-4 border rounded">
              <span>{uuid === currentPlayerUuid ? 'You' : `Player ${uuid.slice(0, 8)}`}</span>
              <span className="text-2xl font-bold">
                {player.score ? `🎲 ${player.score}` : player.rolled ? '...' : '—'}
              </span>
            </div>
          ))}

          {/* Bouton pour lancer */}
          {canRoll && (
            <Button onClick={onRoll} size="lg" className="w-full">
              🎲 Roll Dice
            </Button>
          )}

          {/* Résultat */}
          {gameState.finished && (
            <div className="text-center p-4 bg-green-100 rounded">
              <h3 className="text-xl font-bold">
                {gameState.winner === currentPlayerUuid ? '🎉 You Won!' : '😔 You Lost'}
              </h3>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

## 🚀 Prochaines étapes

Maintenant que vous avez créé votre premier jeu, vous pouvez :

1. **Ajouter des variantes** : Différents modes de jeu, règles personnalisées
2. **Améliorer l'UI** : Animations, sons, effets visuels
3. **Ajouter des statistiques** : Historique des parties, classements
4. **Créer d'autres jeux** : Utilisez ce pattern pour tous vos jeux

## 📚 Ressources

- [Architecture complète](./BOILERPLATE_ARCHITECTURE.md)
- [Interface GamePlugin](../app/domain/games/base/game_plugin.ts)
- [Exemple Tic-Tac-Toe](../app/domain/games/plugins/tic-tac-toe/)

---

**Amusez-vous bien en créant vos jeux ! 🎮**
