---
description: Refactor DDD sécurisée guidée code smells avec petites étapes validées
---

## 1) Intent
Refactorer du code existant sans régression en appliquant une approche incrémentale inspirée Refactoring.Guru.

## 2) Motivation
Les refactors “big bang” cassent le comportement métier. Ce workflow priorise tests de caractérisation, micro-changements et validation continue.

## 3) Applicability
Utiliser quand on observe code smells: Long Method, God Class, Feature Envy, Primitive Obsession, Shotgun Surgery.
Ne pas utiliser pour créer une nouvelle feature from scratch (préférer `/ddd-new-usecase`).

## 4) Structure
inputs -> zone à refactor + smells
steps -> characterize -> slice -> refactor -> validate
outputs -> code plus lisible, même comportement

## 5) Participants
Dev, Cascade, Repo, CLI (`pnpm`, `node ace test`), CI.

## 6) Collaboration
- Démarrer par tests de caractérisation.
- Après chaque lot, exécuter `Call /run-tests-and-fix`.
- Finir par `Call /quality-gate`.

## 7) Consequences
Bénéfices: réduction du risque, dette technique maîtrisée.
Tradeoffs: plus de commits/itérations.

## 8) Implementation
1. Choisir une cible étroite (1 module/use case).
2. Cataloguer 1-3 code smells max.
3. Écrire tests de caractérisation avant modification.
   - Capturer comportement actuel (même imparfait).
4. Planifier des petites transformations:
   - Extract Method
   - Introduce Parameter Object
   - Move Method
   - Replace Conditional with Polymorphism (si pertinent)
5. Appliquer une seule transformation à la fois.
6. Relancer tests ciblés immédiatement.
   - `Call /run-tests-and-fix`
7. Vérifier invariants DDD:
   - Use cases retournent `Result<T>`
   - erreurs métier via `BusinessException`
   - DI via ports/interfaces, pas de `new` technique dans use case
   - aucun accès `result.value` sans garde `result.isFailure`/`result.isSuccess`
   - `BusinessException` inclut classification/sévérité/userMessage/toastType
8. Répéter jusqu’à obtenir design cible.
9. Lancer validation globale.
   - `Call /quality-gate`
10. Documenter avant/après (smell, refactor appliqué, gain).

Notes projet:
- Vérifier que les bindings request-scope (ex: `HttpContext`, `Logger`) restent résolus via middleware/container.
- Ne pas déplacer de logique métier dans les controllers Inertia pendant la refactor.

## 9) Example
`/ddd-refactor-safe target=apps/infinity/app/application/use_cases/create_lobby_use_case.ts smells="Long Method, Primitive Obsession"`

## 10) Related Workflows
`/run-tests-and-fix`, `/quality-gate`, `/pr-review-ddd`, `/incident-hotfix`
