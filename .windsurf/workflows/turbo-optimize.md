---
description: Audit et optimisation de la config Turbo (inputs/outputs/dependsOn/cache)
---

## 1) Intent
Améliorer la vitesse et la fiabilité du pipeline Turbo en corrigeant la définition des tâches et du cache.

## 2) Motivation
Un mauvais cache (inputs/outputs incomplets) crée soit des builds lents, soit des faux positifs. Ce workflow vise la justesse avant l’optimisation.

## 3) Applicability
Utiliser quand les builds sont lents/incohérents, ou après ajout de nouveaux packages/tasks.
Ne pas utiliser pour corriger un bug métier.

## 4) Structure
inputs -> turbo.json + scripts package
steps -> audit -> hypothèses -> ajustements -> validation
outputs -> pipeline plus rapide et cache correct

## 5) Participants
Dev, Cascade, CLI (`pnpm`, `turbo`), Repo, CI cache.

## 6) Collaboration
Peut appeler `Call /quality-gate` après modifications de pipeline.

## 7) Consequences
Bénéfices: feedback plus rapide, coût CI réduit.
Tradeoffs: maintenance continue des règles d’inputs/outputs.

## 8) Implementation
1. Auditer les tâches déclarées dans `turbo.json`.
   - Vérifier `build`, `lint`, `typecheck`, `test`, `dev`, `preview-storybook`.
2. Vérifier cohérence scripts réels package par package.
   - `apps/infinity`, `apps/docs`, `packages/ui`, autres `packages/*`.
3. Contrôler `outputs`:
   - Ex: `build` global pointe `dist/**`, mais `apps/infinity` génère `build/**`.
   - Ajouter/séparer outputs précis par task si nécessaire.
4. Contrôler `inputs`:
   - Inclure fichiers source et config impactants (tsconfig, tailwind, package.json local).
5. Contrôler `dependsOn`:
   - Garder `^build` quand dépendance inter-package réelle; éviter dépendances inutiles.
6. Valider cache correctness.
   - Exécuter deux runs identiques: `pnpm turbo run build lint typecheck test`
   - Vérifier hit cache attendu au second run.
7. Après changements, lancer `Call /quality-gate`.
8. Documenter 3 suggestions concrètes max avec impact estimé (temps, stabilité).

Suggestions concrètes pour ce repo:
1. Ajuster les outputs de `build` pour inclure les artefacts réels.
   - Aujourd’hui `build` déclare `dist/**`, alors que `apps/infinity` produit `build/**`.
   - Action: créer/renforcer task dédiée (`build:adonis`) et/ou corriger `outputs` globaux.
2. Compléter les inputs côté UI package.
   - Inclure `packages/ui/src/**`, `packages/ui/rollup.config.*`, `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/styles/**`.
3. Vérifier les dépendances de `typecheck`.
   - `dependsOn: ["^build"]` peut allonger inutilement selon les workspaces.
   - Action: conserver uniquement là où la génération de types/build upstream est strictement nécessaire.

Notes projet:
- Exécuter un run de contrôle: `pnpm turbo run build lint typecheck test --summarize`.
- Si le cache semble incorrect, comparer les hash inputs de deux runs successifs sans changement de code.

## 9) Example
`/turbo-optimize scope=monorepo focus=cache-correctness`

## 10) Related Workflows
`/quality-gate`, `/deps-update`, `/release-prep`, `/docs-sync`
