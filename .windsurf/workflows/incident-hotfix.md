---
description: Hotfix incident avec reproduction, patch minimal, test ciblé et post-mortem court
---

## 1) Intent

Résoudre un incident rapidement avec un patch minimal, validé par test ciblé, et traçabilité de la cause.

## 2) Motivation

En incident, la pression pousse aux correctifs risqués. Ce workflow protège la prod: reproduire, corriger la racine, valider vite.

## 3) Applicability

Utiliser pour bug bloquant prod ou régression critique.
Ne pas utiliser pour refactor de confort (préférer `/ddd-refactor-safe`).

## 4) Structure

inputs -> symptôme + impact + zone suspecte
steps -> reproduce -> isolate -> minimal patch -> targeted test -> sanity
outputs -> incident atténué + note post-mortem

## 5) Participants

On-call Dev, Cascade, CLI (`pnpm`, `node ace test`, `docker`), Repo, observabilité.

## 6) Collaboration

Après stabilisation, enchaîner vers:

- `Call /run-tests-and-fix`
- `Call /quality-gate`

## 7) Consequences

Bénéfices: MTTR réduit, blast radius limité.
Tradeoffs: dette potentielle si suivi post-incident oublié.

## 8) Implementation

1. Capturer le contexte incident.
   - symptôme utilisateur
   - impact métier
   - timestamp, logs, route/use case concernés
2. Reproduire en local ou environnement de test.
   - cible minimale (endpoint/test précis)
3. Isoler la cause racine.
   - prioriser couche métier (use case, mapping Result, exceptions)
4. Appliquer patch minimal.
   - une correction atomique, sans changement adjacent
5. Ajouter un test de non-régression ciblé.
   - Adonis/Japa: `pnpm --filter @infinity/app exec node ace test <path>`
6. Exécuter test ciblé puis suite pertinente.
   - `Call /run-tests-and-fix`
7. Sanity check rapide runtime.
   - endpoint concerné répond
   - pas d’erreur critique dans logs
8. Produire post-mortem court (5 lignes max):
   - cause
   - détection
   - fix
   - prévention
   - action de suivi

## 9) Example

`/incident-hotfix incident="500 on POST /lobbies/:uuid/kick" severity=high`

## 10) Related Workflows

`/run-tests-and-fix`, `/quality-gate`, `/release-prep`, `/ddd-refactor-safe`
