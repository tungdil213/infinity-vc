---
description: Onboarding dev local monorepo (install, env, docker, migrations, smoke)
---

## 1) Intent
Démarrer un environnement de développement reproductible pour ce monorepo pnpm + turbo avec app Adonis principale `apps/infinity`.

## 2) Motivation
L’onboarding échoue souvent sur l’ordre des étapes (deps, env, DB, migrations). Ce workflow impose une séquence stable et vérifiable.

## 3) Applicability
Utiliser pour premier setup, reset machine, ou après changement majeur d’infra.
Ne pas utiliser pour valider une PR (préférer `/quality-gate`).

## 4) Structure
inputs -> clone + Node + pnpm + Docker
steps -> install -> env -> services -> migration -> dev smoke -> tests
outputs -> app `apps/infinity` démarrable + base migrée + tests initiaux

## 5) Participants
Dev, Cascade, CLI (`pnpm`, `turbo`, `docker`), Repo, PostgreSQL.

## 6) Collaboration
Cascade guide l’ordre des commandes. Pour les tests, ce workflow délègue: `Call /run-tests-and-fix`.

## 7) Consequences
Bénéfices: onboarding rapide, moins d’écarts locaux.
Tradeoffs: dépend de Docker local; temps initial plus long.

## 8) Implementation
1. Installer les dépendances du monorepo.
   - `pnpm install`
2. Préparer l’environnement de l’app Adonis principale (`@infinity/app`).
   - Si absent: copier `apps/infinity/.env.example` vers `apps/infinity/.env`.
   - Vérifier au minimum: `NODE_ENV`, `HOST`, `PORT`, `APP_KEY`, `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`.
3. Démarrer les services Docker du repo.
   - Script existant: `pnpm docker:up`
   - Fallback: `docker compose up -d`
4. Migrer la base de données.
   - `pnpm --filter @infinity/app exec node ace migration:run`
   - Optionnel: `pnpm --filter @infinity/app exec node ace db:seed`
5. Vérifier que le monorepo compile.
   - Script existant: `pnpm build`
   - Fallback: `pnpm turbo run build`
6. Démarrer l’app locale pour smoke test.
   - Mode app ciblé: `pnpm --filter @infinity/app run dev`
   - Vérifier qu’une route publique répond (`/`) et qu’aucune erreur DB fatale n’apparaît.
7. Lancer les tests via workflow dédié.
   - `Call /run-tests-and-fix`
8. Si échec, corriger la cause racine puis rejouer 4 -> 7.

Notes projet:
- Le repo expose `pnpm dev` (turbo run dev), mais pour un smoke backend fiable on privilégie `--filter @infinity/app`.
- Les règles DDD/Result/BusinessException s’appliquent dès le premier correctif, même en onboarding.

## 9) Example
`/bootstrap-dev`

Paramètres optionnels:
- `seed=true`
- `skipDocker=false`

## 10) Related Workflows
`/run-tests-and-fix`, `/quality-gate`, `/docker-prod-check`, `/docs-sync`
