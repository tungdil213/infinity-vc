---
description: Vérification docker de type production (build + run + smoke + sanity)
---

## 1) Intent

Valider rapidement qu’une image Docker du monorepo démarre et sert l’application en conditions proches production.

## 2) Motivation

Un build vert local n’assure pas un conteneur exécutable. Ce workflow détecte tôt les erreurs d’image, d’env et de runtime.

## 3) Applicability

Utiliser avant release et après changements Docker/infra.
Ne pas utiliser pour debug fonctionnel fin (préférer `/run-tests-and-fix`).

## 4) Structure

inputs -> Docker daemon + env minimal
steps -> build -> run -> smoke -> stop
outputs -> statut de démarrage + sanity report

## 5) Participants

Dev, Cascade, Docker CLI, Repo, app `@infinity/app`.

## 6) Collaboration

Si échec applicatif, enchaîner avec `Call /incident-hotfix`.

## 7) Consequences

Bénéfices: confiance déploiement, défauts runtime capturés tôt.
Tradeoffs: exécution plus lente qu’un test local classique.

## 8) Implementation

1. Construire l’image.
   - Script repo: `pnpm docker:build`
   - Fallback: `docker build . -t site`
   - Vérifier que le tag attendu est bien `site` (aligné script racine).
2. Vérifier l’env minimale requise.
   - Fichier attendu: `apps/infinity/.env`
   - Variables minimales: `NODE_ENV`, `HOST`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `APP_KEY`.
3. Démarrer le conteneur.
   - Script repo: `pnpm docker:run`
   - Fallback: `docker run --rm --env-file ./apps/infinity/.env -p 3333:3333 site`
   - Sur macOS, si DB locale hors conteneur, utiliser `DB_HOST=host.docker.internal`.
4. Smoke test HTTP local.
   - Vérifier qu’une route publique répond sur `http://localhost:3333`.
5. Sanity check.
   - Logs sans crash loop.
   - Connexion DB sans erreur fatale.
6. Arrêt/nettoyage.
   - `pnpm docker:down` si stack compose utilisée.
   - Sinon `docker stop <container>`.
7. Produire un rapport court: image tag, durée boot, endpoint smoke, anomalies.

Notes projet:

- Le script `docker:run` configure déjà `NODE_ENV=production`, `HOST=0.0.0.0` et mapping `3333:3333`.
- Si l’application démarre mais la page échoue, vérifier d’abord les erreurs de migration ou de connexion PostgreSQL.

## 9) Example

`/docker-prod-check image=site port=3333`

## 10) Related Workflows

`/release-prep`, `/incident-hotfix`, `/bootstrap-dev`
