---
description: Exécuter les tests et corriger itérativement jusqu'au vert
---

## 1) Intent

Fiabiliser la boucle de correction en partant des tests rouges jusqu’à un état vert, avec patch minimal et validation ciblée.

## 2) Motivation

Un échec de tests n’indique pas toujours la racine du problème. Ce workflow formalise une boucle courte: reproduire, corriger, revalider.

## 3) Applicability

Utiliser après un changement fonctionnel, un refactor, ou un bug report.
Ne pas utiliser pour une gate complète (préférer `/quality-gate`).

## 4) Structure

inputs -> scope test + budget de boucles
steps -> run -> isolate -> fix -> rerun
outputs -> tests verts + cause racine documentée

## 5) Participants

Dev, Cascade, CLI (`pnpm`, `turbo`, `node ace test`), Repo.

## 6) Collaboration

Appelé seul ou via `Call /run-tests-and-fix` depuis `/bootstrap-dev` et `/quality-gate`.

## 7) Consequences

Bénéfices: corrections petites, moins de régressions.
Tradeoffs: peut nécessiter plusieurs itérations.

## 8) Implementation

1. Exécuter les tests du workspace.
   - Commande monorepo robuste: `pnpm turbo run test`
   - Scope app principale: `pnpm --filter @infinity/app run test`
2. Si un package précis est concerné, réduire le scope.
   - Unit: `pnpm --filter @infinity/app run test:unit`
   - Integration: `pnpm --filter @infinity/app run test:integration`
   - Functional: `pnpm --filter @infinity/app run test:functional`
   - UI package (pas de script test): exécuter au minimum `pnpm --filter @infinity.dev/ui run lint`
3. Identifier le premier test cassé et reproduire en ciblé.
   - Exemples Adonis/Japa: `pnpm --filter @infinity/app exec node ace test tests/functional`
   - Ou dossier précis: `pnpm --filter @infinity/app exec node ace test tests/unit/use_cases`
4. Corriger la cause racine (pas de workaround downstream).
5. Relancer d’abord le test ciblé, puis la suite complète de l’étape 1.
6. Répéter jusqu’à `maxLoops` (par défaut 5).
7. Si toujours rouge, produire un diagnostic:
   - test en échec
   - hypothèse racine
   - fichiers touchés
   - next patch minimal

Notes projet:

- La stack de test côté app est Adonis + Japa (`node ace test`).
- Le root ne définit pas de script `test`; `turbo run test` est la baseline monorepo.

## 9) Example

`/run-tests-and-fix scope=@infinity/app maxLoops=5`

## 10) Related Workflows

`/bootstrap-dev`, `/quality-gate`, `/incident-hotfix`, `/ddd-refactor-safe`
