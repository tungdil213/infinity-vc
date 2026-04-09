---
description: Build + démarrage production local (Adonis/Inertia) avec contrôle manifest
---

## 1) Intent

Exécuter un démarrage production local fiable de l’app `@infinity/app` en évitant les erreurs de type `Missing manifest file`.

## 2) Motivation

Le mode production Adonis + Vite dépend du manifest construit. Un build partiel, un mauvais entrypoint Inertia, ou un démarrage depuis le mauvais contexte peut provoquer une erreur runtime 500.

## 3) Applicability

Utiliser ce workflow pour:
- vérifier un build prod local,
- reproduire le comportement de démarrage serveur prod,
- diagnostiquer les erreurs liées au manifest Vite.

Ne pas utiliser pour le flux de dev HMR (`yarn dev`).

## 4) Structure

inputs -> deps installées + `.env` app
steps -> build -> checks manifest -> start -> smoke HTTP -> logs
outputs -> serveur prod local up + page `/` répond + manifest valide

## 5) Participants

Dev, Cascade, CLI (`yarn`), app Adonis (`apps/infinity`), runtime Node.

## 6) Collaboration

Cascade exécute les commandes dans l’ordre et valide chaque point de contrôle avant de passer au suivant.

## 7) Consequences

Bénéfices: run prod reproductible et diagnostic rapide des erreurs d’assets.
Tradeoffs: plus lent qu’un run dev; dépend d’un build complet préalable.

## 8) Implementation

1. Installer les dépendances lockées à la racine.
   - `yarn install --frozen-lockfile`
2. Lancer le build production du monorepo (script root).
   - `yarn build`
3. Vérifier la présence du manifest attendu.
   - Fichier attendu: `apps/infinity/build/public/assets/.vite/manifest.json`
4. Démarrer le serveur production via script racine.
   - `yarn start`
5. Effectuer un smoke test HTTP.
   - `curl -i http://127.0.0.1:3333/`
   - Attendu: statut `200` (pas d’erreur manifest).
6. Si erreur, diagnostiquer dans cet ordre:
   - vérifier que `yarn build` vient juste d’être exécuté sans erreur,
   - vérifier la présence du manifest (étape 3),
   - vérifier l’entrypoint Inertia demandé dans la vue root:
     `apps/infinity/resources/views/inertia_layout.edge` doit référencer une clé existante du manifest,
   - redémarrer le process `yarn start` après correction.

## 9) Example

`/build-start-prod`

## 10) Related Workflows

`/bootstrap-dev`, `/docker-prod-check`, `/quality-gate`
