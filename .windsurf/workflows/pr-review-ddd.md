---
description: Revue PR DDD/SOLID avec Result pattern, BusinessException et tests
---

## 1) Intent

Fournir une revue PR systématique orientée architecture, qualité métier et robustesse.

## 2) Motivation

Les reviews se concentrent souvent sur le style et ratent les risques structurels. Ce workflow impose une checklist orientée DDD/SOLID et erreurs métier.

## 3) Applicability

Utiliser sur toute PR touchant `apps/infinity/app/**`, `start/routes.ts`, `database/**`, tests.
Ne pas utiliser comme remplacement des tests automatiques.

## 4) Structure

inputs -> diff PR
steps -> architecture -> erreurs -> tests -> feedback
outputs -> commentaires actionnables + verdict

## 5) Participants

Reviewer Dev, Cascade, Auteur PR, CI, Repo.

## 6) Collaboration

Peut recommander `Call /quality-gate` ou `Call /ddd-refactor-safe` selon findings.

## 7) Consequences

Bénéfices: feedback homogène, régressions design réduites.
Tradeoffs: review plus structurée donc un peu plus longue.

## 8) Implementation

1. Vérifier DDD layering.
   - Domain sans dépendance technique.
   - Use case sans accès Lucid direct.
   - Infrastructure implémente ports.
2. Vérifier SOLID rapidement.
   - SRP: classe avec une responsabilité claire.
   - DIP: dépendance à interfaces.
3. Vérifier Result pattern.
   - Use case retourne `Result<T>`.
   - Appelants testent `isFailure/isSuccess` avant `value/error`.
4. Vérifier BusinessException.
   - Pas de `throw new Error()` métier.
   - Exceptions métier typées, classification/sévérité/message user-safe.
   - Vérifier présence de `toastType` et `context` si utile.
5. Vérifier mapping controller/screen.
   - Mapping `Result -> HTTP` explicite.
   - Flash/toast cohérent (`session.flash`).
   - Pas d’accès à `result.value` sans garde.
6. Vérifier tests.
   - Cas succès + échec.
   - Tests ciblent logique use case, pas uniquement happy path.
7. Vérifier non-régression infra.
   - Migrations idempotentes et rollback plausible.
8. Produire commentaires prêts à coller.

### Commentaires PR prêts à coller

- "Le use case devrait retourner `Result<T>` plutôt qu’une valeur brute pour rester cohérent avec la convention du repo."
- "Je vois un `throw new Error()` dans la couche métier; peux-tu le remplacer par une `BusinessException` classifiée ?"
- "Le controller accède à `result.value` sans garde `isFailure`; peux-tu sécuriser le mapping ?"
- "Peux-tu ajouter un test d’échec couvrant `Result.fail` pour ce scénario métier ?"
- "Cette logique semble couplée à Lucid dans le use case; on devrait passer par un port repository."
- "Il manque `toastType`/`userMessage` sur la BusinessException; peux-tu aligner avec le handler global ?"

## 9) Example

`/pr-review-ddd pr=123 focus="Result,BusinessException,tests"`

## 10) Related Workflows

`/quality-gate`, `/ddd-refactor-safe`, `/ddd-new-usecase`, `/release-prep`
