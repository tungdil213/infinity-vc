# Architecture Technique

## Vue d'ensemble

L'application **Infinity Gauntlet Love Letter** suit une architecture **Clean Architecture** avec **Domain-Driven Design**, implémentée sur **AdonisJS v6** avec **React/Inertia.js**.

## Stack Technique

### Backend
- **Framework** : AdonisJS v6+ avec TypeScript
- **Base de données** : PostgreSQL avec Lucid ORM
- **Authentification** : Session-based avec middleware auth
- **Validation** : VineJS pour la validation des données
- **Tests** : Japa avec couverture complète

### Frontend
- **Framework** : React 18 avec TypeScript
- **Routing** : Inertia.js (SPA-like avec SSR)
- **Styling** : Tailwind CSS + shadcn/ui components
- **Build** : Vite avec Hot Module Replacement

### Infrastructure
- **Containerisation** : Docker avec compose.yml
- **Package Manager** : pnpm avec workspace monorepo
- **CI/CD** : Turbo pour les builds optimisés

## Architecture Clean Architecture

### Structure des Couches

```
src/
├── features/                    # Domaines métier (Bounded Contexts)
│   ├── authentication/         # Gestion des utilisateurs
│   │   ├── controllers/        # Couche Présentation
│   │   ├── use_cases/          # Couche Application
│   │   ├── domain/             # Couche Domaine
│   │   └── repositories/       # Couche Infrastructure
│   ├── lobbies/                # Gestion des lobbies
│   ├── games/                  # Logique de jeu
│   └── notifications/          # Système de notifications
└── shared/                     # Code partagé
    ├── contracts/              # Interfaces communes
    ├── exceptions/             # Gestions d'erreurs
    └── utils/                  # Utilitaires
```

### Couches et Responsabilités

#### 1. Couche Domaine (Domain Layer)
**Responsabilité** : Logique métier pure, indépendante de toute technologie

```typescript
// Exemple : Entité Lobby
export default class Lobby extends SessionBase {
  private _players: PlayerInterface[] = []
  private _maxPlayers: number = 4
  
  public addPlayer(player: PlayerInterface): void {
    this.validateCanAddPlayer(player)
    this._players.push(player)
    this.updateStatus()
  }
  
  private validateCanAddPlayer(player: PlayerInterface): void {
    if (!this.isOpen()) {
      throw new LobbyClosedException()
    }
    if (this._players.length >= this._maxPlayers) {
      throw new LobbyFullException()
    }
  }
}
```

#### 2. Couche Application (Use Cases)
**Responsabilité** : Orchestration de la logique métier, cas d'usage

```typescript
// Exemple : Use Case de création de lobby
export default class CreateLobbyUseCase {
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository,
    private eventBus: EventBus
  ) {}
  
  async execute(userUUID: string): Promise<LobbyDTO> {
    const player = await this.playerRepository.findByUUID(userUUID)
    const lobby = new Lobby(player)
    
    await this.lobbyRepository.save(lobby)
    await this.eventBus.publish(new LobbyCreatedEvent(lobby))
    
    return lobby.toDTO()
  }
}
```

#### 3. Couche Infrastructure (Repositories)
**Responsabilité** : Accès aux données, services externes

```typescript
// Exemple : Repository de lobby
export default class DatabaseLobbyRepository implements LobbyRepository {
  async save(lobby: Lobby): Promise<void> {
    const lobbyModel = await LobbyModel.create({
      uuid: lobby.uuid,
      name: lobby.name,
      status: lobby.status,
      maxPlayers: lobby.maxPlayers
    })
    
    // Sauvegarde des relations players
    await lobbyModel.related('players').sync(lobby.playerIds)
  }
}
```

#### 4. Couche Présentation (Controllers)
**Responsabilité** : Gestion des requêtes HTTP, validation, réponses

```typescript
// Exemple : Controller de lobby
export default class CreateLobbyController {
  constructor(private createLobbyUseCase: CreateLobbyUseCase) {}
  
  async handle({ auth, inertia }: HttpContext) {
    const userUUID = auth.user!.uuid
    const lobby = await this.createLobbyUseCase.execute(userUUID)
    
    return inertia.render('lobbies/show', { lobby })
  }
}
```

## Injection de Dépendances

### Configuration IoC Container

```typescript
// providers/AppProvider.ts
export default class AppProvider {
  async boot() {
    const { default: app } = await import('@adonisjs/core/services/app')
    
    // Repositories
    app.container.bind('PlayerRepository', () => {
      return new DatabasePlayerRepository()
    })
    
    // Use Cases
    app.container.bind('CreateLobbyUseCase', () => {
      const playerRepo = app.container.make('PlayerRepository')
      const lobbyRepo = app.container.make('LobbyRepository')
      return new CreateLobbyUseCase(playerRepo, lobbyRepo)
    })
  }
}
```

## Gestion des États

### Pattern State Machine

Les lobbies et parties suivent une machine à états stricte :

```typescript
// Domain/StateMachine/LobbyStateMachine.ts
export class LobbyStateMachine {
  private transitions: Record<LobbyStatus, LobbyStatus[]> = {
    [LOBBY_STATUS.OPEN]: [LOBBY_STATUS.WAITING, LOBBY_STATUS.FULL],
    [LOBBY_STATUS.WAITING]: [LOBBY_STATUS.READY, LOBBY_STATUS.OPEN],
    [LOBBY_STATUS.READY]: [LOBBY_STATUS.STARTING, LOBBY_STATUS.WAITING],
    [LOBBY_STATUS.STARTING]: [], // Terminal state
  }
  
  canTransition(from: LobbyStatus, to: LobbyStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false
  }
}
```

## Gestion des Événements

### Event-Driven Architecture

```typescript
// Domain/Events/LobbyCreatedEvent.ts
export class LobbyCreatedEvent implements DomainEvent {
  constructor(
    public readonly lobby: Lobby,
    public readonly occurredOn: Date = new Date()
  ) {}
}

// Application/EventHandlers/LobbyCreatedHandler.ts
export class LobbyCreatedHandler {
  async handle(event: LobbyCreatedEvent): Promise<void> {
    // Envoyer notification SSE
    await this.sseService.broadcast('lobby:created', {
      lobbyId: event.lobby.uuid,
      name: event.lobby.name
    })
  }
}
```

## Modèles de Données

### Entités Principales

#### User (Authentification)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Player (Profil de Jeu)
```sql
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nick_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Game (Parties Persistées)
```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  game_data JSONB NOT NULL, -- État complet du jeu
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Sécurité

### Authentification et Autorisation

```typescript
// Middleware d'authentification
export default class AuthMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    await auth.check()
    
    if (!auth.user) {
      return response.redirect('/login')
    }
    
    await next()
  }
}

// Validation des permissions
export class LobbyPermissionService {
  canJoinLobby(user: User, lobby: Lobby): boolean {
    return lobby.isOpen() && !lobby.hasPlayer(user.uuid)
  }
  
  canStartGame(user: User, lobby: Lobby): boolean {
    return lobby.isCreatedBy(user.uuid) && lobby.isReady()
  }
}
```

### Validation des Données

```typescript
// Validation avec VineJS
const createLobbyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(50),
    maxPlayers: vine.number().range([2, 4]),
    isPrivate: vine.boolean().optional()
  })
)
```

## Performance et Optimisation

### Stratégies de Cache

```typescript
// Cache des lobbies actifs
export class LobbyCache {
  private cache = new Map<string, LobbyDTO>()
  
  async getActiveLobbies(): Promise<LobbyDTO[]> {
    if (this.cache.size === 0) {
      const lobbies = await this.lobbyRepository.findActive()
      lobbies.forEach(lobby => this.cache.set(lobby.uuid, lobby))
    }
    
    return Array.from(this.cache.values())
  }
  
  invalidate(lobbyUUID: string): void {
    this.cache.delete(lobbyUUID)
  }
}
```

### Pagination et Filtrage

```typescript
// Pagination des résultats
export class LobbyListUseCase {
  async execute(filters: LobbyFilters, page: number = 1): Promise<PaginatedResult<LobbyDTO>> {
    return await this.lobbyRepository.findPaginated({
      status: filters.status,
      hasSlots: filters.hasSlots,
      page,
      limit: 25
    })
  }
}
```

## Tests

### Architecture de Tests

```typescript
// Tests unitaires (Domain)
test('should add player to open lobby', async ({ assert }) => {
  const lobby = new Lobby(createPlayer())
  const newPlayer = createPlayer()
  
  lobby.addPlayer(newPlayer)
  
  assert.equal(lobby.playerCount, 2)
  assert.equal(lobby.status, LOBBY_STATUS.WAITING)
})

// Tests d'intégration (Use Cases)
test('should create lobby and notify via SSE', async ({ assert }) => {
  const useCase = new CreateLobbyUseCase(playerRepo, lobbyRepo, eventBus)
  
  const lobby = await useCase.execute(userUUID)
  
  assert.isTrue(eventBus.wasPublished(LobbyCreatedEvent))
})

// Tests E2E (Controllers)
test('POST /lobby/create should create new lobby', async ({ client }) => {
  const user = await UserFactory.create()
  
  const response = await client
    .post('/lobby/create')
    .loginAs(user)
    .json({ name: 'Test Lobby' })
  
  response.assertStatus(200)
  response.assertBodyContains({ name: 'Test Lobby' })
})
```

## Déploiement

### Configuration Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3333
CMD ["npm", "start"]
```

### Variables d'Environnement

```bash
# .env.production
NODE_ENV=production
PORT=3333
APP_KEY=your-secret-key

DB_HOST=postgres
DB_PORT=5432
DB_USER=infinity
DB_PASSWORD=secret
DB_DATABASE=infinity_gauntlet

REDIS_HOST=redis
REDIS_PORT=6379
```

## Monitoring et Observabilité

### Logging

```typescript
// Structured logging
import logger from '@adonisjs/core/services/logger'

export class LobbyService {
  async createLobby(userUUID: string): Promise<Lobby> {
    logger.info('Creating new lobby', { 
      userUUID, 
      timestamp: new Date().toISOString() 
    })
    
    try {
      const lobby = await this.createLobbyUseCase.execute(userUUID)
      
      logger.info('Lobby created successfully', { 
        lobbyUUID: lobby.uuid,
        userUUID 
      })
      
      return lobby
    } catch (error) {
      logger.error('Failed to create lobby', { 
        userUUID, 
        error: error.message 
      })
      throw error
    }
  }
}
```

### Métriques

```typescript
// Métriques applicatives
export class MetricsService {
  private metrics = {
    activeLobbies: 0,
    totalGamesPlayed: 0,
    averageGameDuration: 0
  }
  
  incrementActiveLobbies(): void {
    this.metrics.activeLobbies++
  }
  
  getMetrics(): ApplicationMetrics {
    return { ...this.metrics }
  }
}
```

Cette architecture garantit :
- **Maintenabilité** : Code organisé par domaines métier
- **Testabilité** : Injection de dépendances et isolation des couches
- **Évolutivité** : Ajout facile de nouvelles fonctionnalités
- **Performance** : Cache et optimisations intégrées
- **Sécurité** : Validation et authentification à tous les niveaux
