# Contribuer à ce projet

Merci de ton intérêt pour ce projet ! Voici un guide rapide pour installer l’environnement et proposer des modifications.

## 1. Pré-requis

- Node.js (version LTS recommandée)
- Yarn 1.22.22
- Docker (optionnel mais recommandé pour PostgreSQL et les tests manuels)

## 2. Installation

```bash
git clone <url_du_dépôt>
cd <nom_du_dépôt>

yarn install
```

## 3. Démarrer l’application infinity

```bash
cd apps/infinity
cp .env.example .env
# Adapter les variables d’environnement si nécessaire

# Lancer les migrations / seeds si besoin
node ace migration:run
node ace db:seed

# Démarrer le serveur de dev
yarn dev
```

L’application sera disponible sur `http://localhost:3333`.

## 4. Scripts principaux

Depuis la racine du monorepo :

```bash
# Lancer le dev (workspaces)
yarn dev

# Lancer les tests de l’app infinity
cd apps/infinity
yarn test

# Lancer ESLint sur le monorepo
cd ../..
yarn lint

# Vérifier les types
yarn typecheck
```

Pour le design system et les packages partagés :

```bash
# Design system UI + Storybook
cd apps/docs
yarn dev

# Build du package UI
cd ../../packages/ui
yarn build
```

## 5. Style de code

- TypeScript partout (backend + frontend + packages).
- ESLint + Prettier configurés au niveau du monorepo.
- Merci de corriger les éventuels warnings/erreurs ESLint avant de proposer une PR.

## 6. Proposer une contribution

1. Créer une branche :
   ```bash
   git checkout -b feature/nom-de-la-fonctionnalite
   ```
2. Faire les modifications + ajouter des tests si possible.
3. Vérifier :
   ```bash
   yarn lint
   yarn typecheck
   ```
4. Pousser la branche et ouvrir une Pull Request en décrivant :
   - le problème résolu ou la fonctionnalité ajoutée,
   - les parties impactées (apps, packages),
   - comment tester.
