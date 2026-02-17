---
description: Gate qualité monorepo (format, lint, typecheck, tests) avec boucle de correction
---

## 1) Intent
Valider qu’un changement est mergeable en appliquant une gate qualité complète et reproductible.

## 2) Motivation
Les régressions arrivent quand lint/typecheck/tests sont exécutés partiellement. Ce workflow impose un standard unique avant PR/release.

## 3) Applicability
Utiliser avant PR, avant merge, et après refactor significative.
Ne pas utiliser pour un diagnostic ultra-ciblé (préférer `/run-tests-and-fix`).

## 4) Structure
inputs -> branche courante
steps -> format check -> lint -> typecheck -> tests -> fix loop
outputs -> état vert ou backlog précis de corrections

## 5) Participants
Dev, Cascade, CLI (`pnpm`, `turbo`), Repo, CI.

## 6) Collaboration
Ce workflow délègue la partie test à `Call /run-tests-and-fix`.
Les étapes peuvent être rejouées en boucle jusqu’au vert.

## 7) Consequences
Bénéfices: confiance de merge, signal CI anticipé.
Tradeoffs: temps d’exécution plus élevé.

## 8) Implementation
1. Synchroniser les dépendances lockfile.
   - `pnpm install --frozen-lockfile` (ou `pnpm install` en local si nécessaire)
2. Vérifier le formatage (sans écrire) au niveau monorepo.
   - Commande robuste: `pnpm exec prettier . --check`
   - Si vous voulez autofix: `pnpm --filter @infinity/app run format`
3. Lancer lint global.
   - Script existant: `pnpm lint`
   - Fallback si script absent: `pnpm turbo run lint`
4. Lancer typecheck.
   - Script existant: `pnpm typecheck`
   - Fallback robuste: `pnpm turbo run typecheck`
5. Exécuter les tests via workflow dédié.
   - `Call /run-tests-and-fix`
6. Si une étape échoue, appliquer correctifs minimaux (root cause), puis relancer depuis l’étape 2.
7. Vérifier les conventions architecture avant validation finale:
   - Use cases retournent `Result<T>`.
   - `BusinessException` utilisée pour erreurs métier controller/presentation.
   - Pas d’accès Lucid direct depuis la couche application.
8. Quand tout est vert, générer un court rapport:
   - commandes exécutées
   - échecs corrigés
   - statut final

Notes projet:
- Le repo n’expose pas de script `test` racine, d’où le passage obligatoire par `/run-tests-and-fix`.
- Pour la CI locale complète: `pnpm turbo run lint typecheck test`.

## 9) Example
`/quality-gate`

Options:
- `scope=@infinity/app`
- `maxLoops=3`

## 10) Related Workflows
`/run-tests-and-fix`, `/ddd-refactor-safe`, `/deps-update`, `/release-prep`
