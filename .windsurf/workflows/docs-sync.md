---
description: Synchroniser la documentation avec scripts et structure réelle du repo
---

## 1) Intent

Maintenir une documentation exacte, alignée sur les scripts réellement exécutables et la structure actuelle du monorepo.

## 2) Motivation

Une doc obsolète coûte du temps, casse l’onboarding et provoque de faux diagnostics. Ce workflow évite les commandes fantômes.

## 3) Applicability

Utiliser après ajout/modification de scripts, workflows, packages, ou conventions d’architecture.
Ne pas utiliser pour corriger un bug runtime.

## 4) Structure

inputs -> docs ciblées + état repo
steps -> inventorier -> vérifier -> corriger -> valider
outputs -> docs à jour et vérifiables

## 5) Participants

Dev, Cascade, Repo, CLI (`pnpm`, `turbo`, `docker`), lecteurs docs.

## 6) Collaboration

Après mise à jour docs technique, lancer `Call /quality-gate` si du code a été modifié en parallèle.

## 7) Consequences

Bénéfices: onboarding fiable, moins d’ambiguïté en PR.
Tradeoffs: discipline continue requise.

## 8) Implementation

1. Lister les scripts réels à partir de:
   - `package.json` racine
   - `apps/infinity/package.json`
   - `apps/docs/package.json`
   - `packages/ui/package.json`
2. Vérifier que les docs citent des commandes existantes.
   - Si script absent, remplacer par fallback explicite (`pnpm turbo run <task>` ou `pnpm --filter ...`).
3. Vérifier cohérence structure monorepo.
   - `apps/**`, `packages/**`, app principale `apps/infinity`, UI `packages/ui`.
4. Vérifier conventions d’architecture mentionnées:
   - DDD, DI, Result pattern, BusinessException, Screens/Inertia.
5. Mettre à jour docs cibles (ex: `README.md`, `docs/**`, workflows).
   - Vérifier le cas particulier repo: `.windsurf` peut être un fichier, donc workflows stockés dans `tmp-wind/workflows/` tant qu’un dossier `.windsurf/workflows/` n’existe pas.
6. Ajouter une section "Commandes vérifiées" dans la doc modifiée.
7. Contrôle rapide:
   - exécuter au moins une commande par catégorie (dev/build/test/lint/docker).
8. Produire un diff de doc résumant:
   - commandes corrigées
   - sections ajoutées/supprimées
   - éventuels scripts à créer

Notes projet:

- Éviter de documenter `pnpm test` à la racine (script absent actuellement).
- Préférer `pnpm turbo run test` en commande monorepo de référence.

## 9) Example

`/docs-sync targets="README.md,docs/development-guide.md"`

## 10) Related Workflows

`/bootstrap-dev`, `/quality-gate`, `/turbo-optimize`, `/release-prep`
