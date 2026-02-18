---
description: Index des workflows monorepo pnpm + turbo
---

## 1) Intent

Centraliser les workflows réutilisables du monorepo et fournir un point d’entrée clair via des commandes `/...`.

## 2) Motivation

Sans index, chaque dev réinvente les étapes d’onboarding, de QA, de release et de hotfix. Ce workflow existe pour réduire l’entropie et standardiser les séquences critiques.

## 3) Applicability

Utiliser quand vous ne savez pas quel workflow invoquer en premier.
Ne pas utiliser pour exécuter une tâche technique; appelez directement le workflow cible.

## 4) Structure

inputs -> besoin (setup, QA, DDD, release, incident)
steps -> choisir workflow + lancer `/nom-du-workflow`
outputs -> exécution guidée, reproductible

## 5) Participants

Dev, Cascade, CLI (pnpm/turbo/docker), Repo, CI.

## 6) Collaboration

Dev demande l’objectif. Cascade mappe vers le workflow adapté.
Les workflows peuvent s’enchaîner via `Call /...`.

## 7) Consequences

Bénéfices: découverte rapide, conventions homogènes, moins d’erreurs de process.
Tradeoff: nécessite de maintenir cet index lors de l’ajout d’un nouveau workflow.

## 8) Implementation

1. Choisir un workflow dans la liste ci-dessous.
2. Lancer la commande slash correspondante.
3. Suivre les étapes et les `Call /...` proposés.
4. Si une commande script n’existe pas, appliquer la fallback indiquée dans le workflow.

Workflows disponibles:

- `/bootstrap-dev`: installation + environnement local + smoke checks.
- `/quality-gate`: lint + format + typecheck + tests jusqu’au vert.
- `/run-tests-and-fix`: boucle ciblée de tests et corrections.
- `/deps-update`: mise à jour dépendances (taze) + validation.
- `/docker-prod-check`: build/run docker et sanity checks.
- `/turbo-optimize`: audit cache et pipeline Turbo.
- `/ddd-new-usecase`: créer un use case DDD complet avec Result/BusinessException.
- `/ddd-refactor-safe`: refactor incrémentale guidée code smells.
- `/pr-review-ddd`: checklist de review PR orientée DDD/SOLID.
- `/docs-sync`: aligner documentation et scripts réels.
- `/release-prep`: préparer release sans push automatique.
- `/incident-hotfix`: corriger prod rapidement avec risque maîtrisé.

## 9) Example

Commande:
`/_index`

Puis décider:
`Call /quality-gate`

## 10) Related Workflows

`/bootstrap-dev`, `/quality-gate`, `/release-prep`, `/incident-hotfix`, `/ddd-new-usecase`
