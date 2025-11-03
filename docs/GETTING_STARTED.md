# 🚀 Guide de démarrage rapide - Infinity

## Prérequis

- Node.js 20+ (LTS recommandé)
- pnpm 10+
- PostgreSQL 16+
- Redis 7+
- Docker Desktop (recommandé pour l'infrastructure)

## Installation en 5 minutes

### 1. Cloner et installer

```bash
git clone <votre-repo>
cd infinity-test
pnpm install
```

### 2. Configuration environnement

```bash
cd apps/infinity
cp .env.example .env
```

Éditez `.env` et configurez :

```env
# Application
APP_KEY=           # ← Généré à l'étape 3
NODE_ENV=development
PORT=3333

# Database
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=infinity
DB_PASSWORD=your_password
DB_DATABASE=infinity

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Sentry (optionnel)
SENTRY_DSN=
```

### 3. Générer APP_KEY

```bash
node ace generate:key
```

Copiez la clé générée dans `.env`.

### 4. Démarrer l'infrastructure

```bash
# Depuis la racine du projet
docker-compose up -d database redis
```

Vérifiez que les services sont UP :
```bash
docker-compose ps
```

### 5. Migrations

```bash
cd apps/infinity
node ace migration:run
node ace db:seed
```

### 6. Lancer le serveur

```bash
pnpm dev
```

Visitez **http://localhost:3333** 🎉

## Vérification

### Health checks

```bash
curl http://localhost:3333/health
# {"status":"ok","timestamp":"..."}

curl http://localhost:3333/health/detailed
# Status détaillé des services
```

### Logs

Les logs apparaissent dans la console avec formatage coloré en dev.

### Redis

```bash
docker exec -it infinity-redis redis-cli
> PING
PONG
> KEYS infinity:*
```

### PostgreSQL

```bash
docker exec -it infinity-db psql -U infinity -d infinity
\dt  # Lister les tables
```

## Créer un compte

1. Allez sur http://localhost:3333
2. Cliquez sur "S'inscrire"
3. Remplissez le formulaire
4. Vous êtes connecté ! 🎮

## Créer un lobby

1. Cliquez sur "Créer un lobby"
2. Configurez (nom, nombre de joueurs, jeu)
3. Partagez le code d'invitation
4. Attendez que les joueurs rejoignent
5. Lancez la partie ! 🚀

## Problèmes courants

### Erreur "APP_KEY is required"

```bash
node ace generate:key
# Copier dans .env
```

### Erreur "Cannot connect to database"

Vérifiez que PostgreSQL tourne :
```bash
docker-compose ps database
docker-compose logs database
```

### Erreur "Redis connection refused"

Vérifiez que Redis tourne :
```bash
docker-compose ps redis
docker-compose logs redis
```

### Port 3333 déjà utilisé

Changez le port dans `.env` :
```env
PORT=4000
```

## Next steps

- 📚 Lire la [documentation](./README.md)
- 🎮 [Créer votre premier jeu](./guides/creating-a-game.md)
- 🏗️ Comprendre l'[architecture](./architecture/overview.md)
- 🧪 Écrire des [tests](../apps/infinity/tests)

Bon développement ! 🚀
