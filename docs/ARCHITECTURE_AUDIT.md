# ARCHITECTURE AUDIT

## 1) Périmètre audité (lecture effective)

Audit réalisé sur le dépôt monorepo `infinity.dev` avec lecture directe des zones suivantes :

- Racine : `package.json`, `yarn.lock`, `turbo.json`, `eslint.config.js`, `.prettierrc.js`, `README.md`, `Dockerfile`, `scripts/deploy.sh`
- App backend/frontend : `apps/infinity` (`adonisrc.ts`, `start/`, `config/`, `providers/`, `app/`, `database/`, `tests/`, `inertia/`)
- App Storybook : `apps/docs` (`package.json`, `.storybook/*`, `stories/*`)
- Packages partagés : `packages/ui`, `packages/game-engine`, `packages/lobby-domain`, `packages/lobby-application`, `packages/typescript-config`

Aucun fichier `AGENTS.md` trouvé dans le dépôt.

---

## 2) Observations factuelles sur le dépôt

### 2.1 Tooling / monorepo

- Monorepo Yarn Workspaces confirmé (`packageManager: yarn@1.22.22`, workspaces `apps/*`, `packages/*`) dans `package.json` racine.
- Orchestration build/lint/typecheck via Turbo (`turbo.json`).
- `.yarnrc.yml` et dossier `.yarn/` absents.
- Scripts racine orientés Yarn (`yarn workspace ...`, `yarn --cwd ...`).
- Préinstall verrouille l’agent utilisateur sur `yarn/1.22.22`.

### 2.2 Stack runtime et framework

- Backend principal sur AdonisJS v7 (`@adonisjs/core` `^7.0.1`) dans `apps/infinity/package.json`.
- Persistance via Lucid (`@adonisjs/lucid`) avec connexions sqlite/postgres/mysql (`apps/infinity/config/database.ts`).
- Front via Inertia + React (`@adonisjs/inertia`, `@inertiajs/react`, Vite).
- Tailwind présent côté app et UI package.
- Storybook présent via `apps/docs` (`@storybook/react-vite` + stories nombreuses).

### 2.3 Tests

- Runner principal backend : Japa (`node ace test`, suites `unit/integration/functional` dans `adonisrc.ts`).
- Couverture tests app significative (nombreux tests unitaires + intégration + fonctionnels).
- Packages partagés : tests hétérogènes (ex: `packages/game-engine` en Vitest).

### 2.4 Architecture applicative observée

- Séparation explicite sous `apps/infinity/app/` :
  - `domain/`
  - `application/`
  - `infrastructure/`
  - `controllers/` + `presenters/` + `validators/`
- Ports repositories définis (`app/application/repositories/*`).
- Implémentations DB + in-memory dans `app/infrastructure/repositories/*`.
- Composition root DI centralisée dans `apps/infinity/providers/app_provider.ts`.
- Use cases en partie externalisés dans package `@infinity.dev/lobby-application` puis ré-exportés dans l’app.

---

## 3) Cartographie architecturale actuelle

### 3.1 Frontières de modules

- `apps/infinity` = application produit (HTTP, Inertia, auth, lobbies, jeux, social).
- `apps/docs` = documentation UI/Storybook, branchée sur `@infinity.dev/ui`.
- `packages/ui` = design system (primitives/composés/hooks/styles).
- `packages/game-engine` = noyau moteur de jeu et launcher.
- `packages/lobby-domain` = entités/VO/events/domain result.
- `packages/lobby-application` = use cases lobby + ports + sérialisation.

### 3.2 Flux backend principaux

1. **Route Adonis** (`start/routes.ts`) -> **Controller**
2. **Controller** -> **Use Case application** (souvent via DI)
3. **Use Case** -> **Ports repositories/services**
4. **Infrastructure** (Lucid, event bus, transmit)
5. **Presenter / Inertia / JSON response**

### 3.3 Flux frontend principaux

1. Page Inertia (`inertia/pages/*`)
2. Hooks d’orchestration (ex `use_game_page_controller.tsx`)
3. Services HTTP frontend (`inertia/services/*`) via `fetch`
4. Components UI (majoritairement depuis `@infinity.dev/ui`)

### 3.4 Storybook réel

- `apps/docs/.storybook/main.ts` et `preview.ts` configurés.
- Grand volume de stories (`apps/docs/stories/*`) couvrant primitives UI + composants lobby.
- Storybook utilisé comme vitrine design system, moins comme contrat comportemental métier.

### 3.5 Persistance

- Modèles Lucid dans `app/models/*`, migrations dans `database/migrations/*`.
- Dépendance à `gameData` JSON pour snapshots runtime jeux.
- Repositories DB dédiés par agrégat.

---

## 4) Écarts et anti-patterns détectés

## 4.1 SRP / taille des unités

- `app/controllers/enhanced_lobbies_controller.ts` (~949 lignes) : responsabilités multiples (validation métier complémentaire, orchestration, erreurs, présence, mapping, beacon parsing).
- `app/controllers/games_controller.ts` (~934 lignes) : orchestration API + règles de replay + restore snapshot + mapping + persistance snapshots.
- `inertia/hooks/use_game_page_controller.tsx` (~524 lignes) : état UI, orchestration réseau, polling, replay, notifications, logique action/validation.

### 4.2 DIP / composition

- DI globalement présente, mais `providers/app_provider.ts` devient un "god composition root" volumineux (>300 lignes) difficile à maintenir.
- Présence de `as any` dans le provider (`StartGameUseCase`), signal de contrat incomplet.

### 4.3 Cohérence domaine / application

- Bon usage du pattern `Result` et de use cases.
- Mais `Result.value`/`Result.error` déclenchent `throw new Error(...)` en cas de mauvaise consommation (dans `domain/shared/result.ts` et `packages/lobby-domain/src/shared/result.ts`) : acceptable techniquement, mais fragile si mauvaise discipline d’appel.

### 4.4 Erreurs métier vs techniques

- Infrastructure/frontend contient encore des `throw new Error(...)` pour erreurs techniques (ex `inertia/services/lobby_api_client.ts`, `database_lobby_repository.ts`, services replay), ce qui mélange parfois conventions d’erreurs selon couches.
- `BusinessException` existe et est intégré au handler global, mais usage non homogène sur tous les flux.

### 4.5 Frontend layering

- Bonne tendance à isoler les services (`inertia/services`), mais certains hooks restent trop "intelligents" et trop larges.
- Risque de régression UX/maintenabilité à chaque évolution jeu/replay dans un hook unique.

### 4.6 Storybook

- Couverture volumétrique bonne.
- Qualité contractuelle variable : beaucoup de stories de catalogue, moins de scénarios systématiques sur états extrêmes (latence/erreur métier/restrictions ACL).

### 4.7 Compatibilité cibles demandées

- AdonisJS v7 : conforme.
- Yarn : conforme.
- TypeScript strict : partiellement conforme (strict true dans configs partagées, mais usage `any` ponctuel).
- PostgreSQL : supporté mais non exclusif (sqlite/mysql aussi).
- Node.js 25.x : **non garanti** (Docker en `node:lts-bookworm-slim`, typings Node 22 dans plusieurs packages).

---

## 5) Conventions implicites à conserver

- Monorepo Yarn + Turbo.
- Répartition DDD-like `domain/application/infrastructure/presentation` dans `apps/infinity`.
- Ports repositories/services côté application.
- `Result` pour flux métier.
- Controllers orientés use cases (même si certains sont trop lourds).
- Storybook dans app dédiée (`apps/docs`) alimentée par `packages/ui`.

---

## 6) Normalisation recommandée (sans réécriture massive)

1. **Découper les controllers massifs** en orchestrateurs + services dédiés (replay policy, session restore, lobby presence orchestration, response mappers).
2. **Découper `use_game_page_controller`** en hooks spécialisés (state polling, replay timeline, action submission, notifications).
3. **Modulariser la composition root** en registres DI par bounded context (lobby, game, social).
4. **Standardiser la stratégie d’erreurs** :
   - métier : `Result` + mapping `BusinessException`
   - technique : erreurs techniques typées + sanitization uniforme
5. **Durcir les frontières packages** : interdire dérive vers package "dump" ; responsabilité unique par package.
6. **Storybook contract-first** : imposer états `empty/loading/error/success/edge` sur composants critiques.
7. **Planifier migration Node 25** de manière progressive (toolchain, CI, image Docker, dépendances natives).

---

## 7) Risques prioritaires

- Risque de régression élevé sur `games_controller` et `enhanced_lobbies_controller` (zones à forte complexité cyclomatique).
- Risque de dette croissante sur hook frontend central de page jeu.
- Risque de dérive DI/maintenabilité dans `app_provider.ts`.
- Risque de mismatch runtime Node entre environnements (22/LTS vs cible 25).

---

## 8) Zones à forte valeur de refactor

- `apps/infinity/app/controllers/games_controller.ts`
- `apps/infinity/app/controllers/enhanced_lobbies_controller.ts`
- `apps/infinity/inertia/hooks/use_game_page_controller.tsx`
- `apps/infinity/providers/app_provider.ts`
- `apps/infinity/inertia/services/lobby_api_client.ts`

---

## 9) Conclusion d’audit

Le dépôt a déjà une base architecture solide (DDD partiel, DI, Result pattern, tests présents, Storybook actif, monorepo propre). Le principal enjeu n’est pas une refonte mais une **normalisation stricte des responsabilités** sur quelques fichiers centraux devenus trop gros, puis une montée en qualité progressive (contracts Storybook, discipline erreurs, Node 25 alignment).
