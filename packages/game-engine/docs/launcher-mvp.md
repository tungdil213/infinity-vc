# Launcher MVP multi-jeux

Ce document décrit le socle technique ajouté dans `@infinity.dev/game-engine` pour un launcher type BGA.

## Objectif

Standardiser l’intégration des jeux autour de 3 briques:

1. **Contrat de jeu** (`GameModule`, `GameDefinition`, `GameSettingsDefinition`)
2. **Orchestration launcher** (sélection, configuration, démarrage)
3. **Exemple de référence** (`rock-paper-scissors`)

## Architecture

### Contrats

- `src/platform/contracts.ts`
  - `GameModule<TState, TAction, TSettings>`
  - `GameDefinition<TSettings>`
  - `GameSettingsDefinition<TSettings>`

### Launcher

- `src/platform/orchestration-machine.ts`
  - états: `idle -> game_selected -> configured -> running -> finished`
- `src/platform/launcher.ts`
  - `register`, `listGames`, `launch`, `startSession`
- `src/platform/default_launcher.ts`
  - launcher prêt à l’emploi avec modules built-in

### Jeu exemple

- `src/games/rock-paper-scissors/**`
  - domaine: types + règles métier
  - application: machine d’état + engine
  - module: `rockPaperScissorsModule`

## Exemple d’utilisation (Node / service)

```ts
import { createDefaultLauncher } from '@infinity.dev/game-engine'

const launcher = createDefaultLauncher()

const launched = launcher.launch({
  gameId: 'rock-paper-scissors',
  players: [
    { id: 'p1', name: 'Alice', isActive: true },
    { id: 'p2', name: 'Bob', isActive: true },
  ],
  settings: { roundsToWin: 2, allowDrawReplay: true },
})

if (launched.isSuccess) {
  const started = await launcher.startSession(launched.value)
  if (started.isSuccess) {
    console.log('Session running:', started.value.machine.currentState)
  }
}
```

## Exemple Ace (Adonis)

Une commande de démonstration est disponible côté app:

- fichier: `apps/infinity/commands/demo_game_launcher.ts`
- commande: `node ace game:demo:rps`

Cette commande montre:

- récupération des jeux enregistrés
- lancement d’une session RPS avec settings
- démarrage de la session via le launcher
- exécution d’un petit scénario de partie

## Commandes utiles

Depuis la racine du monorepo:

```bash
# Qualité package game-engine
pnpm --filter @infinity.dev/game-engine run typecheck
pnpm --filter @infinity.dev/game-engine run lint
pnpm --filter @infinity.dev/game-engine run test

# Démo Ace
pnpm --filter @infinity/app run game:demo:rps
# ou
pnpm run demo:rps
```

## Tests existants

- `src/platform/launcher.spec.ts`
- `src/platform/default_launcher.spec.ts`
- `src/games/rock-paper-scissors/rock_paper_scissors_module.spec.ts`

Ces tests couvrent le flux launcher et le jeu de référence.
