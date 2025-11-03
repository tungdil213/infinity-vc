# 📖 Référence Technique - Infinity

## Stack Technologique

### Backend
- **Framework**: AdonisJS 6
- **Langage**: TypeScript 5.7 (strict)
- **Base de données**: PostgreSQL 16
- **Cache**: Redis 7
- **Logger**: Pino (JSON structuré)
- **Error Tracking**: Sentry
- **Tests**: Japa
- **WebSocket**: Transmit (SSE)

### Frontend
- **Framework UI**: React 19
- **SSR/SPA**: Inertia.js
- **Styling**: TailwindCSS 3
- **Components**: Shadcn UI
- **Build**: Vite
- **State**: React Hooks + Context

### Infrastructure
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry + Logs structurés

## Architecture Layers

### 1. Domain Layer (Pure Logic)

**Responsabilité**: Logique métier pure, sans dépendances externes

```
app/domain/
├── entities/          # Entités métier (User, Lobby, Game)
├── events/            # Système d'événements modulaire
│   ├── base/          # Infrastructure événements
│   └── modules/       # Événements par domaine
└── games/             # Plugins de jeux
    ├── base/          # Interface GamePlugin
    └── plugins/       # Jeux implémentés
```

**Règles**:
- Aucune dépendance sur l'infrastructure
- Entities avec logique métier
- Value Objects immutables
- Domain Events pour communication

### 2. Application Layer (Use Cases)

**Responsabilité**: Orchestration de la logique métier

```
app/application/
├── use_cases/         # Use cases métier
│   ├── create_lobby_use_case.ts
│   ├── join_lobby_use_case.ts
│   └── start_game_use_case.ts
└── services/          # Services applicatifs
```

**Pattern Result<T>**:
```typescript
class CreateLobbyUseCase {
  async execute(request: CreateLobbyRequest): Promise<Result<Lobby>> {
    // Validation
    if (!request.name) {
      return Result.fail('Name required')
    }
    
    // Business logic
    const lobby = Lobby.create(...)
    
    // Persistence
    await this.repository.save(lobby)
    
    return Result.ok(lobby)
  }
}
```

### 3. Infrastructure Layer (Technical)

**Responsabilité**: Implémentation technique, adapters

```
app/infrastructure/
├── logging/           # Logger Pino
├── cache/             # Redis cache service
├── events/            # Transmit bridges
└── repositories/      # Data access
```

**Services**:
- **Logger**: Pino avec redaction secrets
- **Cache**: Redis multi-connexions
- **Events**: Transmit SSE broadcasting

### 4. Interface Layer (Controllers)

**Responsabilité**: HTTP/WebSocket interface

```
app/controllers/
├── lobbies_controller.ts     # Main CRUD
├── lobby_sync_controller.ts  # SSE real-time
├── games_controller.ts       # Game actions
└── health_controller.ts      # Health checks
```

## Patterns & Conventions

### Result<T> Pattern

Tous les use cases retournent `Result<T>`:

```typescript
// Success
return Result.ok(data)

// Failure
return Result.fail('Error message')

// Usage in controller
const result = await useCase.execute(request)
if (result.isFailure) {
  return response.badRequest({ error: result.error })
}
return response.ok(result.value)
```

### Event-Driven Architecture

```typescript
// 1. Définir l'événement
class LobbyCreatedEvent extends DomainEvent {
  constructor(public readonly lobbyUuid: string) {
    super('lobby.created')
  }
}

// 2. Émettre
await eventBus.publish(new LobbyCreatedEvent(lobby.uuid))

// 3. Écouter
eventBus.subscribe('lobby.created', async (event) => {
  // Handle event
})

// 4. Bridge Transmit (optionnel)
lobbyTransmitBridge.configure({
  'lobby.created': {
    channel: (event) => `lobbies`,
    transform: (event) => ({ type: 'created', uuid: event.lobbyUuid })
  }
})
```

### Logging

**Backend (Pino)**:
```typescript
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('MyService')

logger.info({ userId: 123 }, 'User action')
logger.error({ err: error }, 'Error occurred')
logger.debug({ data }, 'Debug info')
```

**Frontend (Browser)**:
```typescript
import { createBrowserLogger } from '@/utils/browser_logger'

const logger = createBrowserLogger('MyComponent')

logger.info('Component mounted')
logger.error({ error }, 'Action failed')
```

### Cache Service

```typescript
import { RedisCacheService } from '#infrastructure/cache/redis_cache_service'

const cache = new RedisCacheService()

// Simple get/set
await cache.set('key', value, { ttl: 3600 })
const value = await cache.get<Type>('key')

// Remember pattern
const data = await cache.remember('expensive:key', async () => {
  return await expensiveOperation()
}, { ttl: 3600 })

// Delete
await cache.delete('key')

// Flush pattern
await cache.flush('user:*')
```

## Configuration Environnement

### Variables requises

```env
# App
APP_KEY=                    # REQUIRED: base64:... (generate with ace)
NODE_ENV=                   # development|production|test
PORT=3333

# Database
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=infinity
DB_PASSWORD=
DB_DATABASE=infinity

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Sentry (optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
```

### Validation au démarrage

Le serveur refuse de démarrer si :
- `APP_KEY` manquant ou format invalide
- Variables critiques absentes
- Connexion DB/Redis impossible

## Health Checks

### Endpoints

**GET /health** - Simple health check
```json
{"status": "ok", "timestamp": "2025-11-03T22:30:00.000Z"}
```

**GET /health/detailed** - Detailed status
```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": {"status": "healthy", "latency": 5},
    "redis": {"status": "healthy", "latency": 2},
    "cache": {"status": "healthy"}
  }
}
```

**GET /health/ready** - Readiness probe (K8s)
- 200 = Service ready to accept traffic
- 503 = Service not ready

**GET /health/live** - Liveness probe (K8s)
- 200 = Process alive
- Toujours 200 (sinon container restart)

## Testing

### Structure

```
tests/
├── unit/              # Tests unitaires isolés
├── integration/       # Tests avec DB/Redis
└── functional/        # Tests HTTP end-to-end
```

### Conventions

- **Fichiers**: `*.spec.ts` (pas `.test.ts`)
- **Framework**: Japa
- **Groupes**: `test.group('Name', () => {})`
- **Tests**: `test('description', ({ assert }) => {})`

### Exemple

```typescript
import { test } from '@japa/runner'

test.group('CreateLobbyUseCase', () => {
  test('creates lobby with valid data', async ({ assert }) => {
    const useCase = new CreateLobbyUseCase(...)
    const result = await useCase.execute({
      name: 'My Lobby',
      maxPlayers: 4
    })
    
    assert.isTrue(result.isSuccess)
    assert.exists(result.value.uuid)
  })
})
```

## Scripts npm

### Développement
```bash
pnpm dev                # Watch mode avec HMR
pnpm lint              # ESLint check
pnpm lint:fix          # ESLint fix
pnpm format            # Prettier format
pnpm typecheck         # TypeScript check
```

### Tests
```bash
pnpm test              # Tous les tests
pnpm test:unit         # Tests unitaires
pnpm test:watch        # Mode watch
pnpm test:coverage     # Coverage report
```

### Production
```bash
pnpm build             # Build pour production
node build/bin/server.js  # Start production
```

### Database
```bash
node ace migration:run      # Run migrations
node ace migration:rollback # Rollback
node ace db:seed            # Seed data
node ace migration:fresh --seed  # Reset + seed
```

## Sécurité

### Secrets Redaction

Le logger masque automatiquement :
- `password`, `pwd`, `secret`
- `token`, `access_token`, `refresh_token`
- `api_key`, `apiKey`, `private_key`
- Tous champs matchant ces patterns

### CSRF Protection

Activé par défaut sauf pour :
- Routes API avec token Bearer
- `/api/v1/lobbies/leave-on-close` (beacon)

### Rate Limiting

TODO: À implémenter

### SQL Injection

Protection native Lucid ORM avec prepared statements.

### XSS Protection

- React escape automatique
- Content Security Policy headers
- Helmet middleware activé

## Performance

### Cache Strategy

- **Read-through**: Remember pattern
- **Write-through**: Cache invalidation on update
- **TTL**: Par type de données
- **Eviction**: LRU (maxmemory-policy)

### Database

- **Connection pool**: 10 connexions
- **Indexes**: Sur foreign keys + recherches fréquentes
- **Migrations**: Versionnées et rollbackables

### Redis

- **Persistence**: AOF + RDB snapshot
- **Memory**: 512MB max, LRU eviction
- **Connections**: 3 isolées (events, cache, sessions)

## Déploiement

### Build

```bash
pnpm build
cd build
npm ci --omit=dev
node bin/server.js
```

### Variables Production

```env
NODE_ENV=production
APP_KEY=base64:...
LOG_LEVEL=info          # Pas de debug en prod
SENTRY_DSN=https://...  # Obligatoire en prod
```

### Health Monitoring

- Liveness probe: `/health/live` toutes les 10s
- Readiness probe: `/health/ready` avant routing
- Logs structurés JSON dans stdout
- Sentry pour erreurs critiques

## Troubleshooting

### Logs ne s'affichent pas

Vérifier `LOG_LEVEL` dans `.env`

### Redis connection failed

```bash
docker-compose ps redis
docker-compose restart redis
```

### Database migration failed

```bash
node ace migration:rollback
node ace migration:run
```

### Tests échouent

```bash
# Nettoyer et réinstaller
rm -rf node_modules
pnpm install
pnpm test
```

Voir [GETTING_STARTED.md](./GETTING_STARTED.md) pour plus de détails.
