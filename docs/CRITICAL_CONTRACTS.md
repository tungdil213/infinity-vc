# Critical Contracts

Date de lecture: 2026-04-11

## `apps/infinity/app/controllers/games_controller.ts`

### Surface publique observée

- Pages:
  - `show`
  - `resume`
- API jeu:
  - `apiShow`
  - `getActions`
  - `action`
  - `getPlayers`
  - `replay`
  - `leave`
  - `myActive`
  - `myHistory`
  - `myStats`
- API admin/debug:
  - `verificationMetrics`
  - `resetVerificationMetrics`
  - `importReplay`

### Invariants à préserver

- distinction joueur / spectateur
- garde-fou d’intégrité sur `replay`
- mapping stable de `playerView`, `availableActions`, `replayTimeline`
- accès debug limité selon le rôle

## `apps/infinity/app/controllers/enhanced_lobbies_controller.ts`

### Surface publique observée

- Pages:
  - `welcome`
  - `index`
  - `create`
  - `show`
  - `showJoinByInvite`
- Web/API:
  - `store`
  - `joinByInvite`
  - `join`
  - `leave`
  - `start`
  - `kickPlayer`
  - `transferOwnership`
  - `adminClose`
  - `apiShow`
  - `apiIndex`
  - `leaveOnClose`
  - `heartbeat`

### Invariants à préserver

- compatibilité des routes `/lobbies/*` et `/api/v1/lobbies/*`
- comportement de présence `heartbeat` / `leave-on-close`
- mapping d’erreurs user-safe cohérent

## `apps/infinity/inertia/hooks/use_game_page_controller.tsx`

### Entrées observées

- `gameId`
- `user`
- `playerView`
- `initialActions`
- `initialReplayTimeline`
- `isFinished`
- `isSpectator`
- `pollingIntervalMs`
- `showReplayDiff`

### Sorties observées

- état:
  - `gameState`
  - `isConnected`
  - `isLoading`
  - `notifications`
  - `isGameFinished`
- replay:
  - `replayTimeline`
  - `replayCursor`
  - `isReplayPinnedToLatest`
  - `activeReplayStep`
  - `renderReplayDiff`
- interaction:
  - `myHand`
  - `selectedCard`
  - `selectedTarget`
  - `selectedGuess`
  - `lastSubmittedMove`
  - `isMyTurn`
  - `phase`
  - `canDraw`
  - `canPlay`
  - `canSubmitMove`
  - `onLeave`
  - `onDraw`
  - `onSubmitMove`
  - `onPlayCard`
  - `onSelectCard`
  - `onSelectTarget`
  - `onSelectGuess`
- helpers:
  - `moveReplayCursor`
  - `getPlayerLabel`
  - `describeReplayEvent`
  - `formatDebugPayload`
  - `canViewDebugPayload`

### Invariants à préserver

- API de surface stable pour `pages/game.tsx`
- polling + refresh focus + abonnement temps réel
- cohérence avec les helpers replay existants

## Lots retenus

- Extraction des helpers de replay persisté hors de `games_controller`
- Justification:
  - responsabilité cohérente
  - faible risque sur le contrat HTTP
  - couverture unitaire facile à ajouter
- Extraction du builder de snapshot persistant hors de `games_controller`
- Justification:
  - enlève du mapping/persisting detail du controller
  - garde la route et le contrat HTTP inchangés
  - permet des tests unitaires purs sur les statuts et payloads persistés
