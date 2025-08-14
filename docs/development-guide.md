# Guide de Développement

## Configuration de l'Environnement

### Prérequis
- **Node.js** : v20+ avec pnpm
- **PostgreSQL** : v14+
- **Docker** : Pour le développement containerisé
- **Git** : Pour le contrôle de version

### Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/your-org/infinity-test.git
   cd infinity-test
   ```

2. **Installer les dépendances**
   ```bash
   pnpm install
   ```

3. **Configuration de l'environnement**
   ```bash
   cd apps/infinity
   cp .env.example .env
   ```

4. **Variables d'environnement**
   ```bash
   # .env
   NODE_ENV=development
   PORT=3333
   APP_KEY=your-32-char-secret-key
   
   # Base de données
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=infinity
   DB_PASSWORD=secret
   DB_DATABASE=infinity_gauntlet
   
   # Session
   SESSION_DRIVER=cookie
   ```

5. **Démarrage de la base de données**
   ```bash
   # Avec Docker
   docker-compose up -d postgres
   
   # Ou installation locale PostgreSQL
   createdb infinity_gauntlet
   ```

6. **Migrations et seeds**
   ```bash
   cd apps/infinity
   node ace migration:run
   node ace db:seed
   ```

7. **Démarrage du serveur de développement**
   ```bash
   pnpm dev
   ```

## Structure du Projet

### Architecture Monorepo
```
infinity-test/
├── apps/
│   ├── infinity/           # Application principale AdonisJS
│   │   ├── app/           # Code source (vide, à implémenter)
│   │   ├── appsample/     # Exemples de référence
│   │   ├── config/        # Configuration AdonisJS
│   │   ├── database/      # Migrations et seeders
│   │   ├── resources/     # Vues et assets
│   │   └── tests/         # Tests
│   └── docs/              # Documentation Storybook
├── packages/
│   └── ui/                # Composants UI partagés (shadcn/ui)
├── docs/                  # Documentation du projet
└── docker/                # Configuration Docker
```

### Conventions de Nommage

#### Fichiers et Dossiers
- **PascalCase** : Classes, composants React (`UserController.ts`, `LobbyCard.tsx`)
- **camelCase** : Variables, fonctions (`createLobby`, `playerCount`)
- **kebab-case** : Fichiers de configuration (`database-config.ts`)
- **snake_case** : Base de données (`user_id`, `created_at`)

#### Code
```typescript
// Classes (PascalCase)
export default class LobbyController {}

// Interfaces (PascalCase + Interface suffix)
export interface PlayerInterface {}

// Types (PascalCase + Type suffix)
export type LobbyStatusType = 'OPEN' | 'WAITING'

// Constantes (UPPER_SNAKE_CASE)
export const LOBBY_STATUS = {
  OPEN: 'OPEN',
  WAITING: 'WAITING'
} as const

// Fonctions et variables (camelCase)
const createNewLobby = async (userUUID: string) => {}
```

## Architecture Clean Architecture

### Organisation par Features
```
app/
├── features/
│   ├── authentication/
│   │   ├── controllers/     # Couche Présentation
│   │   ├── use_cases/       # Couche Application
│   │   ├── domain/          # Couche Domaine
│   │   │   ├── entities/
│   │   │   ├── value_objects/
│   │   │   └── events/
│   │   └── repositories/    # Couche Infrastructure
│   ├── lobbies/
│   └── games/
└── shared/
    ├── contracts/           # Interfaces partagées
    ├── exceptions/          # Gestions d'erreurs
    └── utils/              # Utilitaires
```

### Règles de Dépendances
1. **Domaine** ne dépend de rien
2. **Application** dépend uniquement du Domaine
3. **Infrastructure** peut dépendre de tout
4. **Présentation** dépend d'Application et Infrastructure

### Exemple d'Implémentation
```typescript
// Domain/Entities/Lobby.ts
export default class Lobby {
  private constructor(
    private _uuid: string,
    private _name: string,
    private _players: PlayerInterface[]
  ) {}
  
  static create(name: string, creator: PlayerInterface): Lobby {
    return new Lobby(
      generateUUID(),
      name,
      [creator]
    )
  }
  
  addPlayer(player: PlayerInterface): void {
    this.validateCanAddPlayer(player)
    this._players.push(player)
    this.recordEvent(new PlayerJoinedEvent(this, player))
  }
}

// Application/UseCases/CreateLobbyUseCase.ts
export default class CreateLobbyUseCase {
  constructor(
    private playerRepository: PlayerRepository,
    private lobbyRepository: LobbyRepository
  ) {}
  
  async execute(userUUID: string, name: string): Promise<LobbyDTO> {
    const player = await this.playerRepository.findByUUID(userUUID)
    const lobby = Lobby.create(name, player)
    
    await this.lobbyRepository.save(lobby)
    
    return lobby.toDTO()
  }
}

// Infrastructure/Repositories/DatabaseLobbyRepository.ts
export default class DatabaseLobbyRepository implements LobbyRepository {
  async save(lobby: Lobby): Promise<void> {
    // Implémentation spécifique à la base de données
  }
}

// Presentation/Controllers/CreateLobbyController.ts
export default class CreateLobbyController {
  constructor(private createLobbyUseCase: CreateLobbyUseCase) {}
  
  async handle({ auth, request, inertia }: HttpContext) {
    const { name } = request.only(['name'])
    const lobby = await this.createLobbyUseCase.execute(auth.user!.uuid, name)
    
    return inertia.render('lobbies/show', { lobby })
  }
}
```

## Tests

### Structure des Tests
```
tests/
├── unit/                   # Tests unitaires (Domain)
│   ├── entities/
│   ├── value_objects/
│   └── services/
├── integration/            # Tests d'intégration (Use Cases)
│   ├── use_cases/
│   └── repositories/
├── functional/             # Tests fonctionnels (Controllers)
│   ├── auth/
│   ├── lobbies/
│   └── games/
└── e2e/                    # Tests end-to-end
    └── scenarios/
```

### Conventions de Tests

#### Tests Unitaires (Domain)
```typescript
// tests/unit/entities/Lobby.test.ts
import { test } from '@japa/runner'
import Lobby from '#domain/entities/Lobby'
import { PlayerFactory } from '#tests/factories/PlayerFactory'

test.group('Lobby Entity', () => {
  test('should create lobby with creator as first player', ({ assert }) => {
    const creator = PlayerFactory.create()
    const lobby = Lobby.create('Test Lobby', creator)
    
    assert.equal(lobby.name, 'Test Lobby')
    assert.equal(lobby.playerCount, 1)
    assert.isTrue(lobby.hasPlayer(creator.uuid))
  })
  
  test('should add player when lobby is open', ({ assert }) => {
    const creator = PlayerFactory.create()
    const newPlayer = PlayerFactory.create()
    const lobby = Lobby.create('Test Lobby', creator)
    
    lobby.addPlayer(newPlayer)
    
    assert.equal(lobby.playerCount, 2)
    assert.equal(lobby.status, LobbyStatus.WAITING)
  })
  
  test('should throw error when adding duplicate player', ({ assert }) => {
    const creator = PlayerFactory.create()
    const lobby = Lobby.create('Test Lobby', creator)
    
    assert.throws(() => {
      lobby.addPlayer(creator)
    }, 'Player already in lobby')
  })
})
```

#### Tests d'Intégration (Use Cases)
```typescript
// tests/integration/use_cases/CreateLobbyUseCase.test.ts
import { test } from '@japa/runner'
import CreateLobbyUseCase from '#use_cases/CreateLobbyUseCase'
import { UserFactory } from '#tests/factories/UserFactory'

test.group('CreateLobbyUseCase', (group) => {
  group.each.setup(async () => {
    // Setup de base de données pour chaque test
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })
  
  test('should create lobby and save to repository', async ({ assert }) => {
    const user = await UserFactory.create()
    const useCase = new CreateLobbyUseCase(playerRepo, lobbyRepo)
    
    const lobby = await useCase.execute(user.uuid, 'Test Lobby')
    
    assert.equal(lobby.name, 'Test Lobby')
    assert.equal(lobby.createdBy, user.uuid)
    
    // Vérifier que le lobby est sauvé
    const savedLobby = await lobbyRepo.findByUUID(lobby.uuid)
    assert.isNotNull(savedLobby)
  })
})
```

#### Tests Fonctionnels (Controllers)
```typescript
// tests/functional/lobbies/CreateLobby.test.ts
import { test } from '@japa/runner'
import { UserFactory } from '#tests/factories/UserFactory'

test.group('POST /lobbies', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })
  
  test('should create lobby when authenticated', async ({ client }) => {
    const user = await UserFactory.create()
    
    const response = await client
      .post('/lobbies')
      .loginAs(user)
      .json({
        name: 'Test Lobby',
        maxPlayers: 4
      })
    
    response.assertStatus(201)
    response.assertBodyContains({
      lobby: {
        name: 'Test Lobby',
        maxPlayers: 4,
        currentPlayers: 1
      }
    })
  })
  
  test('should return 401 when not authenticated', async ({ client }) => {
    const response = await client
      .post('/lobbies')
      .json({ name: 'Test Lobby' })
    
    response.assertStatus(401)
  })
})
```

### Factories
```typescript
// tests/factories/UserFactory.ts
import { factory } from '@adonisjs/lucid/factories'
import User from '#models/User'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'password123'
    }
  })
  .relation('player', () => PlayerFactory)
  .build()

// tests/factories/PlayerFactory.ts
export const PlayerFactory = factory
  .define(Player, async ({ faker }) => {
    return {
      nickName: faker.internet.userName()
    }
  })
  .build()
```

### Commandes de Tests
```bash
# Tous les tests
pnpm test

# Tests par type
pnpm test:unit
pnpm test:integration
pnpm test:functional
pnpm test:e2e

# Tests avec couverture
pnpm test:coverage

# Tests en mode watch
pnpm test:watch

# Tests spécifiques
pnpm test tests/unit/entities/Lobby.test.ts
```

## Frontend (React + Inertia.js)

### Structure des Composants
```
resources/js/
├── components/             # Composants réutilisables
│   ├── ui/                # Composants UI de base (shadcn/ui)
│   ├── forms/             # Composants de formulaires
│   └── layout/            # Composants de layout
├── pages/                 # Pages Inertia.js
│   ├── auth/
│   ├── lobbies/
│   └── games/
├── hooks/                 # Hooks React personnalisés
├── contexts/              # Contexts React
├── utils/                 # Utilitaires frontend
└── types/                 # Types TypeScript
```

### Conventions React
```typescript
// Composants fonctionnels avec TypeScript
interface LobbyCardProps {
  lobby: LobbyDTO
  onJoin?: (lobbyId: string) => void
}

export default function LobbyCard({ lobby, onJoin }: LobbyCardProps) {
  const handleJoin = () => {
    onJoin?.(lobby.uuid)
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-lg font-semibold">{lobby.name}</h3>
      <p className="text-gray-600">
        {lobby.currentPlayers}/{lobby.maxPlayers} joueurs
      </p>
      {lobby.status === 'OPEN' && (
        <button 
          onClick={handleJoin}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Rejoindre
        </button>
      )}
    </div>
  )
}
```

### Hooks Personnalisés
```typescript
// hooks/useSSE.ts
export function useSSE(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<SSEEvent[]>([])
  
  useEffect(() => {
    const eventSource = new EventSource(url)
    
    eventSource.onopen = () => setIsConnected(true)
    eventSource.onerror = () => setIsConnected(false)
    
    return () => eventSource.close()
  }, [url])
  
  return { isConnected, events }
}
```

## Base de Données

### Migrations
```typescript
// database/migrations/001_create_users_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.uuid('uuid').notNullable().unique().defaultTo(this.raw('gen_random_uuid()'))
      table.string('email', 255).notNullable().unique()
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('username', 50).notNullable().unique()
      table.string('password', 255).notNullable()
      table.string('avatar_url', 500).nullable()
      table.timestamp('email_verified_at').nullable()
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Seeders
```typescript
// database/seeders/UserSeeder.ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { UserFactory } from '#tests/factories/UserFactory'

export default class extends BaseSeeder {
  async run() {
    // Admin user
    await UserFactory.merge({
      email: 'admin@example.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    }).create()
    
    // Test users
    await UserFactory.createMany(10)
  }
}
```

### Modèles Lucid
```typescript
// app/models/User.ts
import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import Player from './Player.js'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare uuid: string

  @column()
  declare email: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare username: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare avatarUrl: string | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => Player)
  declare player: HasOne<typeof Player>
}
```

## Déploiement

### Docker
```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS build
COPY . .
RUN npm run build

FROM base AS production
COPY --from=build /app/build ./build
EXPOSE 3333
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3333:3333"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: infinity_gauntlet
      POSTGRES_USER: infinity
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Outils de Développement

### Scripts Package.json
```json
{
  "scripts": {
    "dev": "node ace serve --watch",
    "build": "node ace build",
    "start": "node build/bin/server.js",
    "test": "node ace test",
    "test:unit": "node ace test tests/unit",
    "test:integration": "node ace test tests/integration",
    "test:functional": "node ace test tests/functional",
    "test:e2e": "node ace test tests/e2e",
    "test:coverage": "c8 node ace test",
    "lint": "eslint . --ext=.ts,.tsx",
    "lint:fix": "eslint . --ext=.ts,.tsx --fix",
    "format": "prettier --write .",
    "db:migrate": "node ace migration:run",
    "db:rollback": "node ace migration:rollback",
    "db:seed": "node ace db:seed",
    "db:reset": "node ace db:wipe && node ace migration:run && node ace db:seed"
  }
}
```

### Configuration ESLint
```javascript
// eslint.config.js
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
]
```

### Configuration Prettier
```javascript
// .prettierrc.js
module.exports = {
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  printWidth: 100
}
```

## Debugging

### Logs de Développement
```typescript
// config/logger.ts
import { defineConfig } from '@adonisjs/core/logger'

export default defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: env.get('APP_NAME'),
      level: env.get('LOG_LEVEL', 'info'),
      transport: {
        targets: [
          {
            target: 'pino-pretty',
            options: {
              colorize: true
            }
          }
        ]
      }
    }
  }
})
```

### Debug avec VSCode
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug AdonisJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/infinity/ace.js",
      "args": ["serve", "--watch"],
      "cwd": "${workspaceFolder}/apps/infinity",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

Ce guide couvre tous les aspects essentiels pour développer efficacement sur le projet Infinity Gauntlet Love Letter avec une approche Clean Architecture et des bonnes pratiques de développement.
