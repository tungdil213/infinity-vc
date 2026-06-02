# MIGRATION PLAN — infinity.dev

## Objectif

Mettre le dépôt au niveau d’exigence cible (SRP/DIP/SoC stricts, robustesse runtime, qualité tests/documentation) **sans réécriture massive**, en sécurisant la trajectoire de migration.

---

## Principes de conduite

1. Migration par lots courts, vérifiables, réversibles.
2. Priorité aux zones à risque élevé (controllers/hooks massifs).
3. Aucun changement de pattern global sans preuve de gain.
4. Chaque lot doit inclure validation technique et impact métier.

---

## Vue d’ensemble des écarts prioritaires

- Fichiers centraux trop volumineux (`games_controller`, `enhanced_lobbies_controller`, `use_game_page_controller`).
- Composition root (`app_provider.ts`) trop monolithique.
- Stratégie d’erreurs non homogène (mix `Result`, `BusinessException`, `throw new Error`).
- Contrat Storybook incomplet sur états limites.
- Alignement Node.js 25.x non confirmé sur toolchain actuelle.

---

## Plan vivant

## État de reprise — 2026-06-01

### Lecture rapide

- Le plan initial n’est plus au point de départ : plusieurs extractions ont déjà été livrées.
- `games_controller.ts` reste lourd, mais il est descendu à environ 700 lignes et délègue déjà une partie du replay/persistence à `app/controllers/support/game_controller_persistence.ts`.
- `enhanced_lobbies_controller.ts` reste lourd, mais il délègue déjà présence, mapping de réponse et succès à `app/controllers/support/*`.
- `use_game_page_controller.tsx` est maintenant un orchestrateur plus mince, appuyé par `use_game_polling`, `use_game_actions`, `use_game_notifications` et `use_game_replay`.
- `app_provider.ts` est descendu à environ 172 lignes avec plusieurs registres de bindings (`social`, `lobby_entry`, `lobby_exit`, `lobby_listing`, `lobby_management`), mais le bloc `StartGameUseCase` contient encore un `as any`.
- Le noyau multi-jeux est bien avancé : catalogue, launcher, modules RPS et Love Letter, renderer registry front, settings dynamiques de création de lobby.
- Le toolkit plateau est très large et testé ; les prochains ajouts génériques doivent être tirés par un jeu concret plutôt que par inventaire abstrait.

### Vérification locale de reprise

- OK : `./node_modules/.bin/tsc --noEmit` dans `apps/infinity`.
- OK : `node ace test unit --files tests/unit/controllers/support/game_controller_persistence.spec.ts --files tests/unit/inertia/use_game_page_controller.spec.ts --files tests/unit/providers/lobby_listing_bindings.spec.ts --no-assets`.
- Tests ciblés exécutés : 9 passés.
- Non vérifié : gates racine `yarn lint`, `yarn typecheck`, `yarn build`, car `yarn` et `corepack` ne sont pas disponibles dans le shell courant.

### Décision de suite

La suite recommandée n’est pas une réécriture. Il faut continuer en tranches verticales courtes, en restant sur AdonisJS, VineJS, le pattern `Result` existant et des modules TypeScript simples.

Décision d’architecture mise à jour :

- Pas d’adoption de la librairie TypeScript `effect`.
- Pas de spike avec cette librairie.
- Les problèmes runtime/replay seront traités avec des decodeurs locaux, VineJS aux frontières HTTP, des services Adonis et des tests ciblés.
- Les “effets” métier du toolkit plateau restent hors sujet : ce sont des concepts de règles de jeu, pas la librairie `effect`.

## Plan de travail actualisé

## Lot 0 — Stabiliser les gates de travail

### Objectif

Rendre la boucle locale et CI fiable avant de lancer de nouveaux refactors larges.

### Actions

- Rendre `yarn@1.22.22` disponible dans l’environnement de travail ou documenter la commande de fallback officielle.
- Rejouer `yarn lint`, `yarn typecheck`, `yarn build` et noter l’état réel.
- Traiter les anciens blockers lint racine si toujours présents (`packages/ui`, `shared-i18n`, `frontend-lobby-realtime`).
- Mettre à jour `docs/PHASE0_BASELINE.md` après exécution réelle des gates racine.

### Validation

- Gates racine exécutables sans dépendre de connaissances locales implicites.
- Baseline documentée avec date, commande, statut et cause d’échec si échec.

### Priorité

Immédiate.

---

## Lot 1 — Terminer l’amincissement backend sans changer les contrats HTTP

### Objectif

Finir le travail SRP déjà engagé sur les deux controllers critiques.

### Cibles

- `apps/infinity/app/controllers/games_controller.ts`
- `apps/infinity/app/controllers/enhanced_lobbies_controller.ts`
- `apps/infinity/app/controllers/support/*`

### Actions recommandées

- Extraire le sous-flux `action/getActions/getPlayers/apiShow` de `games_controller` vers un support orienté API runtime.
- Isoler le flux admin `importReplay/verificationMetrics/resetVerificationMetrics` dans un support replay admin dédié.
- Extraire les sous-flux `start/kick/transfer/adminClose` de `enhanced_lobbies_controller` si le fichier reste au-dessus du seuil de lisibilité.
- Conserver routes, payloads, flashes et statuts HTTP inchangés.

### Avancement — 2026-06-01

- Fait : extraction de la résolution runtime view/actions de `games_controller` dans `app/controllers/support/game_controller_runtime.ts`.
- Fait : extraction des payloads API runtime et du flux `action/getActions/getPlayers/apiShow` de `games_controller` dans `app/controllers/support/game_controller_runtime_api.ts`.
- Fait : extraction du flux admin `importReplay` dans `app/controllers/support/game_controller_replay_admin.ts`.
- Fait : extraction du flux `join/joinByInvite` de `enhanced_lobbies_controller` dans `app/controllers/support/enhanced_lobbies_controller_join.ts`.
- Fait : extraction des flux `start/kickPlayer/adminClose` de `enhanced_lobbies_controller` dans `app/controllers/support/enhanced_lobbies_controller_actions.ts`.
- Fait : ajout de tests unitaires dédiés pour les nouveaux supports.
- Résultat : `games_controller.ts` passe d’environ 700 lignes à environ 576 lignes.
- Résultat : `enhanced_lobbies_controller.ts` garde les contrats HTTP dans le controller et délègue maintenant présence, réponses, succès, join et actions lobby.
- Reste : aucun sous-flux prioritaire du lot 1. `transferOwnership` a maintenant une V1 métier définie et implémentée.

### Validation

- Tests unitaires des supports extraits.
- Tests existants controllers verts.
- Tests fonctionnels lobbies/games ciblés au minimum.

### Risques

- Régression d’autorisation ou de mapping HTTP.
- Mitigation : un lot par sous-flux, sans extraction transversale globale.

---

## Lot 2 — Finir la composition root DI

### Objectif

Faire de `app_provider.ts` un vrai index de registres, pas un mélange de repositories, services et use cases.

### Actions recommandées

- Extraire les bindings `game` : `StartGameUseCase`, `ListGameCatalogUseCase`, runtime/catalog dependencies.
- Extraire les bindings `invitation/auth onboarding` : validation, register with invitation, génération, list, revoke.
- Remplacer le `gameRepository as any` du binding `StartGameUseCase` par un contrat explicite ou un adaptateur typé.
- Garder `ready()` et `shutdown()` dans le provider tant que le bootstrap event bridge / launcher reste global.

### Avancement — 2026-06-02

- Fait : extraction des bindings core dans `providers/bindings/core_bindings.ts`.
- Fait : extraction des services runtime lobby dans `providers/bindings/lobby_runtime_bindings.ts`.
- Fait : extraction des bindings game dans `providers/bindings/game_bindings.ts`.
- Fait : extraction des bindings auth/invitation onboarding dans `providers/bindings/auth_onboarding_bindings.ts`.
- Fait : centralisation du petit contrat DI dans `providers/bindings/binding_contracts.ts`.
- Fait : suppression du `gameRepository as any` du binding `StartGameUseCase`, remplacé par le contrat explicite `GameRepository`.
- Résultat : `app_provider.ts` reste responsable du bootstrap `ready()/shutdown()` et devient un index de registres.
- Reste : aucun point prioritaire du lot 2.

### Validation

- Tests unitaires providers par registre.
- Test ciblé `StartGameUseCase` avec le graphe réel.
- Smoke test de démarrage app.

### Risques

- Ordre d’initialisation du launcher/event bridge.
- Mitigation : ne pas déplacer `ready()` dans ce lot.

---

## Lot 3 — Durcir replay/import/runtime sans nouvelle librairie

### Objectif

Réduire la fragilité des replays avec des contrats runtime plus stricts, sans ajouter de paradigme d’exécution concurrent à Adonis.

### Cibles

- `apps/infinity/app/validators/game_replay_import_validator.ts`
- `apps/infinity/app/controllers/support/game_controller_persistence.ts`
- `apps/infinity/app/application/services/replay_import_guard.ts`
- `apps/infinity/app/application/services/replay_import_guard_service.ts`
- `packages/game-runtime-session/src/game_engine_service.ts`

### Hypothèse

La zone replay/import manipule encore des payloads critiques via `vine.any()`, `Record<string, unknown>` et normalisations défensives dispersées. C’est la meilleure candidate pour une pointe technique limitée.

### Actions recommandées

- Introduire un décodeur local pour `GameReplayStep`, snapshot, events et envelope.
- Remplacer progressivement les `vine.any()` d’import replay par des validateurs VineJS plus précis.
- Centraliser les rejets d’import en erreurs explicites et testées.
- Garder les signatures publiques en DTOs simples ou `Promise<Result<T>>`.
- Ne pas introduire de dépendance runtime nouvelle dans ce lot.

### Avancement — 2026-06-02

- Fait : ajout d’un décodeur local `decodeReplayTimeline` / `decodeReplayStep` dans `packages/game-runtime-session`.
- Fait : branchement du runtime restore sur ce décodeur ; les timelines persistées invalides retombent sur un snapshot initial au lieu d’être normalisées silencieusement.
- Fait : ajout d’un décodeur d’import app `decodeReplayImportPayload` combinant timeline stricte et forme `StableSignedEnvelope`.
- Fait : durcissement de `gameReplayImportBodyValidator` avec schémas VineJS pour steps, snapshot, players, events, rounds et envelope.
- Fait : `importReplayForGame` rejette les payloads invalides avant vérification de signature et persistance, avec `issues` exploitables.
- Fait : tests dédiés du décodeur, du support replay admin, de la persistence, des validators et du runtime.
- Reste : une éventuelle passe future sur les payloads dynamiques `event.payload` / `actionPayload`, qui restent volontairement ouverts car dépendants des jeux.

### Mesure de réussite

- Moins de normalisation manuelle dans `game_controller_persistence.ts`.
- Rejets d’import plus précis et testés.
- Aucun changement observable des routes publiques sauf refus plus strict des payloads invalides.
- Tests replay/import plus expressifs qu’avant.

### Critères d’arrêt

- Le code devient plus verbeux ou plus difficile à lire.
- Le durcissement impose de réécrire `Result`, `BusinessException` ou le provider Adonis.
- La validation plus stricte casse des replays historiques sans migration ou message de rejet explicite.

### Effort

3 à 5 jours, timebox strict.

---

## Lot 4 — Tranche produit multi-jeux end-to-end

### Objectif

Transformer le socle launcher/catalogue en valeur visible et vérifiable pour joueur/admin.

### Actions recommandées

- Geler un parcours complet par jeu supporté : catalogue -> création lobby avec settings -> start -> play -> replay -> resume/history.
- Utiliser RPS comme jeu de référence pour simultanéité et Love Letter pour main cachée/tour par tour.
- Ajouter des contract tests autour des `GameDefinition`, `actionDescriptors`, `presentation.rendererKind` et settings dynamiques.
- Compléter les stories Storybook critiques pour lobby/game UI : loading, error, empty, texte long, spectator.
- Décider seulement ensuite si un nouveau jeu doit être ajouté pour piloter les prochains besoins toolkit.

### Validation

- Tests fonctionnels ou intégration sur le parcours RPS.
- Tests ciblés Love Letter sur actions principales.
- Storybook build ou stories ciblées vérifiées selon capacité locale.

### Risques

- Accumuler des primitives toolkit non utilisées.
- Mitigation : chaque ajout toolkit doit être demandé par un jeu ou un flux produit concret.

---

## Lot 5 — Realtime, présence et robustesse opérationnelle

### Objectif

Durcir le temps réel après stabilisation des parcours principaux, pas avant.

### Cibles

- `packages/frontend-lobby-realtime/*`
- `packages/transcript/*`
- `apps/infinity/app/application/services/lobby_presence_service.ts`
- `apps/infinity/inertia/layouts/friend_presence_state.ts`

### Actions recommandées

- Cartographier les timers, retries, cleanup et subscriptions existants.
- Ajouter métriques/logs structurés sur heartbeat, reconnect, stale/disconnect.
- Écrire des tests de lifecycle sur les cas de cleanup et reconnexion.
- Rester sur primitives Adonis/Transmit, timers explicites et modules TypeScript testés.

### Validation

- Tests lifecycle.
- Logs exploitables en dev/prod.
- Pas de double source de vérité présence.

---

## Lot 6 — Alignement Node.js 25

### Constat

Le shell courant utilise Node `v25.9.0`, mais le dépôt reste partiellement aligné Node 22 / LTS générique (`@types/node` 22, Docker `node:lts-bookworm-slim`).

### Actions progressives

1. Ajouter une vérification Node 25 non bloquante dans CI.
2. Lancer typecheck/tests/build sur Node 25.
3. Identifier les incompatibilités natives (`better-sqlite3`, tooling Adonis/Vite, Storybook).
4. Basculer Docker/runtime seulement après feu vert.

### Validation

- CI Node 25 verte ou documentée comme non bloquante avec liste d’écarts.
- Smoke test app.

### Risque

Moyen à élevé tant que les dépendances natives et le build Storybook ne sont pas vérifiés.

---

## Priorisation exécutable

1. Lot 0 : stabiliser les gates de travail.
2. Lot 1 : terminé pour les sous-flux backend prioritaires et `transferOwnership` V1.
3. Lot 2 : terminé pour la composition root DI et le retrait du `as any`.
4. Lot 3 : durcir replay/import/runtime sans nouvelle librairie.
5. Lot 4 : verrouiller une tranche produit multi-jeux end-to-end.
6. Lot 5 : durcir realtime/présence après instrumentation.
7. Lot 6 : aligner Node 25 progressivement.

---

## KPI de réussite

- Diminution taille/fan-in des fichiers critiques.
- Réduction du nombre de responsabilités par module.
- Zéro régression sur suites tests existantes.
- Diminution des casts `any` et erreurs techniques non uniformisées.
- Storybook aligné sur états réels.
- Validation progressive Node 25 sans rupture prod.

---

## Zones de vigilance

- `apps/infinity/app/controllers/games_controller.ts`
- `apps/infinity/app/controllers/enhanced_lobbies_controller.ts`
- `apps/infinity/inertia/hooks/use_game_page_controller.tsx`
- `apps/infinity/providers/app_provider.ts`
- `apps/infinity/app/infrastructure/repositories/*`
- `apps/infinity/app/exceptions/*`

---

## Politique de migration sécurisée

- Chaque lot doit être mergeable seul.
- Aucun lot ne doit introduire de dette cachée (TODO silencieux).
- Si une rupture est nécessaire, elle doit être explicitement annoncée comme migration et accompagnée d’un plan de rollback.
