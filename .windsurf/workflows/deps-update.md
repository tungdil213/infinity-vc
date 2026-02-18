---
description: Mise à jour des dépendances (taze) par lots patch/minor/major avec validation
---

## 1) Intent

Mettre à jour les dépendances de façon contrôlée, par niveau de risque, puis valider la stabilité.

## 2) Motivation

Les upgrades massifs non segmentés cassent vite lint/build/tests. Ce workflow segmente patch/minor/major et impose une validation après chaque lot.

## 3) Applicability

Utiliser pour maintenance régulière ou préparation release.
Ne pas utiliser pendant un incident critique (préférer `/incident-hotfix`).

## 4) Structure

inputs -> stratégie upgrade + scopes
steps -> patch -> minor -> major -> quality gate -> changelog
outputs -> lockfile à jour + risques connus

## 5) Participants

Dev, Cascade, CLI (`pnpm`, `taze`, `turbo`), Repo, CI.

## 6) Collaboration

Après chaque lot significatif, déclencher `Call /quality-gate`.

## 7) Consequences

Bénéfices: upgrades traçables, rollback simplifié.
Tradeoffs: plus de runs CI/local.

## 8) Implementation

1. Vérifier l’outillage.
   - Script repo existant: `pnpm taze`
   - Le script actuel exécute `yarn dlx taze -r -I` via `pnpm taze`.
   - Si indisponible: fallback `pnpm dlx taze -r -I`.
2. Lot patch d’abord.
   - Option A (si votre version taze supporte le ciblage): `pnpm dlx taze -r -I --target patch`
   - Option B (fallback sûre): `pnpm taze` puis ne conserver que les updates patch dans le commit.
   - Installer: `pnpm install`
   - `Call /quality-gate`
3. Lot minor ensuite.
   - Option A: `pnpm dlx taze -r -I --target minor`
   - Option B: `pnpm taze` puis commit dédié minor.
   - `pnpm install`
   - `Call /quality-gate`
4. Lot major en dernier (optionnel et explicite).
   - Option A: `pnpm dlx taze -r -I --target latest`
   - Option B: `pnpm taze` puis commit dédié major.
   - `pnpm install`
   - `Call /quality-gate`
5. Produire un mini changelog local:
   - dépendances upgradées
   - breaking changes suspectés
   - actions manuelles restantes
6. Si une commande n’existe pas côté scripts repo, documenter l’ajout suggéré dans `package.json` racine.

Notes projet:

- Conserver la séparation patch/minor/major en commits distincts pour rollback simple.
- Après chaque lot, vérifier en priorité `@infinity/app` et `@infinity.dev/ui`.

## 9) Example

`/deps-update strategy=patch-minor-major includeMajors=false`

## 10) Related Workflows

`/quality-gate`, `/docs-sync`, `/release-prep`, `/turbo-optimize`
