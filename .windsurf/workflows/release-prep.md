---
description: Préparer une release sans push/tag automatique
---

## 1) Intent

Préparer une release propre et vérifiable (scope, qualité, artefacts, notes, plan de tag) sans exécuter de push non demandé.

## 2) Motivation

Les releases ratées viennent souvent d’un scope mal figé ou d’une validation incomplète. Ce workflow force la checklist avant publication.

## 3) Applicability

Utiliser avant création de tag/release notes.
Ne pas utiliser comme workflow de hotfix urgent (préférer `/incident-hotfix`).

## 4) Structure

inputs -> version cible + scope
steps -> freeze -> validate -> build -> notes -> tag plan
outputs -> release candidate prête

## 5) Participants

Release Dev, Cascade, CLI (`pnpm`, `turbo`, `docker`), Repo, CI.

## 6) Collaboration

- `Call /quality-gate` pour validation technique.
- Optionnel: `Call /docker-prod-check` pour sanity prod-like.

## 7) Consequences

Bénéfices: release plus prévisible, risque réduit.
Tradeoffs: process plus strict.

## 8) Implementation

1. Définir le scope de release.
   - packages/apps impactés
   - breaking changes attendus
2. Geler temporairement le scope (pas de features hors périmètre).
3. Valider la qualité.
   - `Call /quality-gate`
4. Construire les artefacts.
   - Script repo: `pnpm build`
   - Fallback: `pnpm turbo run build`
   - Vérifier explicitement les artefacts de `apps/infinity/build` et `packages/ui/dist`.
5. Optionnel mais recommandé: vérifier image Docker.
   - `Call /docker-prod-check`
6. Préparer release notes courtes.
   - Added / Changed / Fixed / Risks / Rollback plan
7. Préparer plan de tag sans exécution:
   - exemple: `vX.Y.Z`
   - commit cible
   - date/owner
8. Vérifier qu’aucune commande de push/tag n’est exécutée sans demande explicite.

Notes projet:

- Si la release inclut UI, valider aussi `apps/docs` via `pnpm turbo run preview-storybook` (ou build storybook selon contexte CI).
- Conserver un plan de rollback: commit précédent + dépendances touchées + migration concernée.

## 9) Example

`/release-prep version=0.3.0 scope="apps/infinity,packages/ui" dockerCheck=true`

## 10) Related Workflows

`/quality-gate`, `/docker-prod-check`, `/deps-update`, `/pr-review-ddd`
