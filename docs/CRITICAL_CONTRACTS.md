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
- Extraction du sous-flux `heartbeat / leave-on-close / présence lobby` hors de `enhanced_lobbies_controller`
- Justification:
  - isole le parsing beacon et l’orchestration de présence dans un seul module support
  - garde inchangés les endpoints, statuts HTTP et payloads
  - rend testable séparément la gestion des callbacks stale/disconnect
- Extraction du mapping local d’erreurs/réponses de `enhanced_lobbies_controller`
- Justification:
  - sort le mapping `use case -> flash/json/http` du controller sans globaliser la stratégie
  - garde inchangés statuts, payloads et messages observables
  - permet de tester séparément les traductions et fallbacks inattendus
- Extraction du mapping local des réponses de succès répétitives de `enhanced_lobbies_controller`
- Justification:
  - isole les patterns `flash success + redirect` et `html/api success`
  - garde inchangés statuts HTTP, payloads, redirections et messages flash
  - rend testables séparément les conventions de succès du controller
- Extraction du sous-flux polling hors de `use_game_page_controller`
- Justification:
  - isole timers, triggers de refresh, abonnement realtime lié au refresh et cleanup
  - garde inchangée l’API exposée à `pages/game.tsx`
  - rend testable séparément la cadence et les déclencheurs de refresh sans refactorer `actions`, `replay` ou `notifications`
- Extraction du sous-flux notifications hors de `use_game_page_controller`
- Justification:
  - isole l’état `notifications`, la planification des dismiss automatiques et le cleanup des timeouts
  - garde inchangée l’API exposée à `pages/game.tsx`
  - rend testable séparément le comportement UI local sans toucher à `actions`, `replay` ou `polling`
- Extraction du sous-flux actions hors de `use_game_page_controller`
- Justification:
  - isole la soumission d’actions, l’état `isLoading`, les sélections locales et la gestion succès/erreur associée
  - garde inchangée l’API exposée à `pages/game.tsx` et le contrat réseau `/api/v1/games/:id/action`
  - rend testable séparément l’orchestration locale des actions sans toucher au sous-flux `replay`
- Extraction du sous-flux replay hors de `use_game_page_controller`
- Justification:
  - isole la timeline, le curseur, le pinning au dernier step et les helpers d’affichage replay
  - garde inchangée l’API exposée à `pages/game.tsx`
  - rend testables séparément les garde-fous de navigation replay sans toucher aux sous-flux déjà extraits
- Extraction du premier groupe DI `social` hors de `app_provider`
- Justification:
  - isole un sous-ensemble cohérent de bindings sans toucher au bootstrap ni au reste de la composition root
  - garde inchangés les tokens de résolution du container et le graphe de dépendances social
  - prépare la modularisation incrémentale de `app_provider.ts` par contexte métier
