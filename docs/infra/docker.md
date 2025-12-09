# Docker & Docker Compose

Ce document décrit comment construire et lancer l’application **Infinity** via Docker et Docker Compose.

## 1. Vue d’ensemble

L’image Docker est construite à partir du `Dockerfile` à la racine :

- Build des dépendances et workspaces avec **pnpm**
- Build des packages partagés :
  - `@tyfo.dev/ui`
  - `@tyfo.dev/events`
  - `@tyfo.dev/game-engine`
  - `@tyfo.dev/transcript`
- Build de l’application AdonisJS **Infinity** (`apps/infinity`)
- Image finale avec uniquement les dépendances de production pour `@infinity/app`

Le port exposé est **3333**.

## 2. Pré-requis

- Docker et Docker Compose
- Fichier d’environnement pour l’app Infinity :

```bash
cd apps/infinity
cp .env.example .env
# Adapter les valeurs (DB_HOST, DB_USER, DB_PASSWORD, etc.)
```

## 3. Build de l’image

Depuis la racine du projet :

```bash
pnpm docker:build
```

Cela exécute :

```bash
docker build . -t site
```

L’image produite se nomme `site` (tu peux la renommer selon tes besoins).

## 4. Lancement via Docker Compose

Le fichier `compose.yml` définit trois services :

- `site` : application Infinity (AdonisJS + Inertia)
- `database` : PostgreSQL
- `mailer` : Mailpit pour les emails de développement

Lancer l’ensemble :

```bash
pnpm docker:up
```

Ce qui exécute :

```bash
docker compose up -d
```

Le service `site` :

- utilise le `Dockerfile` à la racine,
- charge les variables depuis `./apps/infinity/.env`,
- expose `3333:3333` sur ta machine,
- dépend du service `database`.

Arrêter les services :

```bash
pnpm docker:down
```

Ce qui exécute :

```bash
docker compose down
```

## 5. Connexion à la base de données

Le service `database` utilise l’image `postgres:16-alpine3.19` et expose le port `5432`.

Les variables par défaut dans `compose.yml` :

```yaml
environment:
  - POSTGRES_USER=root
  - POSTGRES_PASSWORD=root
```

Adapte ton `.env` d’Infinity en conséquence :

```bash
DB_HOST=database
DB_PORT=5432
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=infinity_gauntlet
```

## 6. Vérification du build

Lors du build, le Dockerfile :

- construit les assets front (`apps/infinity/public/assets`),
- copie le `build` AdonisJS et les assets dans l’image finale,
- vérifie la présence des assets :

```dockerfile
RUN ls -l /app/apps/infinity/public/assets || echo "Assets NOT FOUND"
```

En cas de problème d’assets manquants, vérifie la configuration Vite/Tailwind dans `apps/infinity`.
