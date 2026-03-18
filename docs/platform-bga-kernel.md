# Plateforme BGA-like: noyau open source + jeux proprietaires

Ce document decrit le socle ajoute pour separer la plateforme (open source) des modules de jeux (open source ou proprietaires).

## Ce qui est en place

- **Contrats de module etendus** dans `@infinity.dev/game-engine`:
  - licensing (`open-source` / `proprietary`)
  - capabilities (tour par tour, infos cachees, replay, spectateurs, etc.)
  - politique de securite (settings inconnus, taille payload action, spectateur)
  - descriptors d'actions (utile pour UI dynamique / framework de creation de jeux)
- **Catalogue filtre des jeux** dans le launcher:
  - filtrage par capacites
  - filtrage open source seulement
  - validation defensive des modules en enregistrement
- **Session de jeu enrichie**:
  - l'etat initial est expose apres `startSession`, ce qui evite une double initialisation.

## Couche application AdonisJS

- **Port de catalogue**: `GameCatalogPort`
- **Adaptateur concret**: `LauncherGameCatalog`
- **Port runtime**: `GameRuntimePort`
- **Use cases debranches du concret**:
  - `CreateLobbyUseCase` depend d'un `GameCatalogPort`
  - `StartGameUseCase` depend d'un `GameRuntimePort`

Cette approche facilite:
- les tests unitaires
- l'introduction de jeux proprietaires hors repo principal
- le remplacement progressif des implementations sans casser le domaine

## Effect (TypeScript) - pilote

- Le package `effect` est ajoute a `apps/infinity`.
- `GameEngineService#createGame` utilise maintenant un pipeline Effect pour:
  - composer le lancement / demarrage
  - capturer les erreurs de maniere explicite
  - retourner un `Result` applicatif propre

## Pattern cible pour jeux proprietaires

1. Garder `@infinity.dev/game-engine` et les ports Adonis en open source.
2. Publier les jeux proprietaires comme modules npm prives (ou packages internes).
3. Renseigner `licensing.distribution = "proprietary"` dans la definition.
4. Charger ces modules au demarrage via un registre interne.
5. N'exposer au frontend que le catalogue filtre (pas de logique interne du jeu).

## Checklist securite recommandee

- Refuser les `settings` inconnus par defaut.
- Limiter la taille des payloads d'actions.
- Appliquer validation stricte sur IDs de modules et schemas d'actions.
- Conserver la sanitation des erreurs (`safeSystemError`) avant reponse client.
- Garder la logique d'autorisation de lobby/partie cote serveur uniquement.
