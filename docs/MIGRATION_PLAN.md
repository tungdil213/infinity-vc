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

## Plan par phases

## Phase 0 — Baseline et garde-fous (Quick wins)

### Actions

- Geler baseline qualité : lint + typecheck + tests (état de référence).
- Cartographier explicitement les contrats publics des 3 zones critiques.
- Ajouter checklist de non-régression pour refactors ciblés.

### Livrables

- Snapshot qualité (résultats commandes).
- Document court de contrats d’API interne (controllers/hook).

### Risques

- Faible.

---

## Phase 1 — SRP backend : controllers

### Cible

- `apps/infinity/app/controllers/games_controller.ts`
- `apps/infinity/app/controllers/enhanced_lobbies_controller.ts`

### Actions

- Extraire les responsabilités transverses :
  - parsing/validation d’actions
  - policies d’accès
  - mapping responses API/page
  - orchestration replay/persistence helpers
- Garder controllers comme points d’entrée minces.

### Validation

- Tests unitaires ciblés des nouveaux modules extraits.
- Tests fonctionnels existants inchangés/verts.

### Risques

- Moyen (zones très couplées au flux runtime).

### Mitigation

- Refactor en micro-PRs (une responsabilité extraite à la fois).

---

## Phase 2 — SRP frontend : hook game page

### Cible

- `apps/infinity/inertia/hooks/use_game_page_controller.tsx`

### Actions

- Découper en hooks spécialisés :
  - `useGamePolling`
  - `useGameActions`
  - `useReplayTimeline`
  - `useGameNotifications`
- Conserver API de surface stable pour `pages/game.tsx`.

### Validation

- Tests unitaires hooks (si existants dans pattern repo, sinon tests utilitaires adjacents).
- Vérification manuelle page game (actions, replay, polling, notifications).

### Risques

- Moyen (risque UX race conditions).

### Mitigation

- Introduire instrumentation simple (logs dev) et QA ciblée sur flux temps réel.

---

## Phase 3 — DI / composition root

### Cible

- `apps/infinity/providers/app_provider.ts`

### Actions

- Scinder en registres de bindings par contexte :
  - lobby
  - game
  - social/auth
- Réduire les casts `as any` via contrats explicites.
- Vérifier ordre de bootstrap inchangé (launcher/event bridge).

### Validation

- Démarrage app (`dev` + tests integration).
- Vérification résolution container sur use cases critiques.

### Risques

- Moyen.

---

## Phase 4 — Stratégie d’erreurs unifiée

### Actions

- Définir matrice officielle :
  - erreur métier attendue
  - erreur validation
  - erreur technique interne
- Uniformiser mappings HTTP/flash/JSON.
- Réduire `throw new Error(...)` hors cas techniques stricts.

### Validation

- Tests unitaires mapping exceptions.
- Tests fonctionnels auth/validation/flows lobbies/games.

### Risques

- Faible à moyen.

---

## Phase 5 — Storybook contract-first

### Actions

- Pour composants critiques (lobby/game UI), compléter stories :
  - empty/loading/error/success/edge
- Ajouter conventions minimales dans docs contribution Storybook.

### Validation

- Build Storybook.
- Revue visuelle des états extrêmes.

### Risques

- Faible.

---

## Phase 6 — Alignement Node.js 25.x

### Constat

- Dépôt actuellement aligné sur LTS générique / typings Node 22 dans plusieurs packages.

### Actions progressives

1. Confirmer compatibilité des dépendances natives (ex modules build/tooling).
2. Introduire job CI Node 25 en non-bloquant.
3. Corriger incompatibilités détectées.
4. Basculer Docker/runtime cible vers Node 25 seulement après feu vert CI.

### Validation

- Lint/typecheck/tests/build verts sur Node 25.
- Smoke test runtime app.

### Risques

- Moyen à élevé (dépendances natives/outillage).

---

## Priorisation exécutable

1. Phase 0 (immédiat)
2. Phase 1 (controllers)
3. Phase 2 (hook frontend)
4. Phase 3 (provider DI)
5. Phase 4 (erreurs)
6. Phase 5 (storybook)
7. Phase 6 (Node 25)

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
