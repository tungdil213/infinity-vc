---
description: Créer un nouveau use case DDD Adonis (Result + BusinessException + DI + Screen)
---

## 1) Intent

Implémenter un use case métier complet dans `apps/infinity` en respectant DDD, DI, Result pattern et gestion d’erreurs BusinessException.

## 2) Motivation

Les features ajoutées rapidement finissent souvent avec logique dans le controller, erreurs non normalisées et persistance couplée. Ce workflow impose une architecture cohérente et testable.

## 3) Applicability

Utiliser pour toute nouvelle capacité métier (création, mutation, orchestration).
Ne pas utiliser pour un simple changement cosmétique UI sans logique métier.

## 4) Structure

inputs -> bounded context + use case + route + payload
steps -> domain -> application -> infrastructure -> presentation -> tests
outputs -> feature DDD complète + tests + docs minimales

## 5) Participants

Dev, Cascade, Domain Layer, Application Layer, Infrastructure Layer, Presentation Layer, CLI (`pnpm`, `node ace`), PostgreSQL.

## 6) Collaboration

Peut s’enchaîner avec:

- `Call /quality-gate` pour validation finale.
- `Call /docs-sync` pour aligner la doc.

## 7) Consequences

Bénéfices: séparation claire des responsabilités, meilleure maintenabilité, erreurs métier cohérentes.
Tradeoffs: plus de fichiers à créer qu’une implémentation rapide.

## 8) Implementation

1. Collecter les inputs.
   - `boundedContext` (ex: lobby, game, auth)
   - `useCaseName` (ex: TransferLobbyOwnership)
   - `route` + méthode HTTP
   - `payload` attendu + règles de validation
2. Si un input manque, ne pas bloquer: créer une section “Inputs à fournir” dans la PR/issue et continuer le squelette.
3. Créer/mettre à jour la couche Domain.
   - Entités/VO/domain rules sous `app/domain/**`.
   - Règles métier retournent `Result<T>` quand applicable.
4. Créer le use case Application sous `app/application/use_cases/**`.
   - Signature: `execute(request): Promise<Result<ResponseDto>>`.
   - Ne pas accéder aux modèles Lucid directement.
   - Injecter les dépendances via constructeur ou `@inject()` Adonis.
   - Interdire `throw new Error()` pour les erreurs métier.
5. Définir le port repository (abstraction).
   - Interface sous `app/application/repositories/**` ou `app/application/ports/**`.
6. Implémenter l’adapter Lucid (Infrastructure).
   - Fichier sous `app/infrastructure/repositories/**`.
   - Mapper Domain <-> persistence sans fuite d’ORM dans le use case.
7. Ajouter/mettre à jour la migration PostgreSQL.
   - Générer migration: `pnpm --filter @infinity/app exec node ace make:migration <name>`
   - Appliquer: `pnpm --filter @infinity/app exec node ace migration:run`
8. Ajouter validator + controller/screen (Presentation).
   - Validator VineJS sous `app/validators/**`.
   - Controller mappe `Result`:
     - `if (result.isFailure) { throw new BusinessException(...) }`
     - `if (result.isSuccess) { ... }`
   - Construire `BusinessException` avec `classification`, `severity`, `userMessage`, `toastType`, `context`.
   - Utiliser `ErrorClassification` (`USER_SAFE`, `INTERNAL`, `SECURITY`) et `ToastType` (`success`, `error`, `warning`, `info`).
   - Pour Inertia/Screen: mapper vers HTTP + `session.flash('success'|'error', message)` pour toasts.
   - Pour appels front (si besoin), privilégier `fetch` plutôt que axios.
9. Routes.
   - Déclarer la route dans `start/routes.ts` et brancher le controller.
10. Tests.

- Priorité repo actuel: Japa (`node ace test`).
- Unit use case: `apps/infinity/tests/unit/**`.
- Functional/intégration: `apps/infinity/tests/functional/**` ou `tests/integration/**`.
- Couvrir succès + échec (`Result.ok` et `Result.fail`) + mapping BusinessException.
- Ajouter au moins un test qui vérifie que le controller ne lit pas `result.value` sans garde `isFailure`.

11. Validation finale.

- `Call /quality-gate`

Checklist de complétion (DoD):

- [ ] UseCase retourne `Result<T>`.
- [ ] Port repository défini et implémentation Lucid branchée.
- [ ] Controller mappe `Result` vers HTTP/flash sans logique métier lourde.
- [ ] `BusinessException` configurée avec classification/sévérité/toast.
- [ ] Migration appliquée et rollback possible.
- [ ] Tests unit + functional verts.

### Inputs à fournir

- boundedContext:
- useCaseName:
- route:
- payload:
- businessRules:
- errorScenarios:

## 9) Example

`/ddd-new-usecase boundedContext=lobby useCase=TransferLobbyOwnership route="POST /lobbies/:uuid/transfer" payload="{ lobbyUuid, currentOwnerUuid, newOwnerUuid }"`

## 10) Related Workflows

`/quality-gate`, `/ddd-refactor-safe`, `/pr-review-ddd`, `/docs-sync`
