# 🏛️ Architecture Bounded Contexts - Infinity

Documentation technique de la nouvelle architecture par domaines fonctionnels.

---

## 📐 Vue d'Ensemble

### Principes Fondamentaux

**Bounded Context** = Un domaine métier avec :
- Sa propre **ubiquitous language** (vocabulaire métier)
- Ses propres **modèles** (entités, value objects)
- Sa propre **logique** (rules, policies)
- Son **isolation** (pas de dépendances directes)

### Les 3 Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────┐
│                        INFINITY                                 │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐      │
│  │             │    │             │    │              │      │
│  │     IAM     │    │    LOBBY    │    │ GAME ENGINE  │      │
│  │             │    │             │    │              │      │
│  │ • User      │    │ • Lobby     │    │ • Game       │      │
│  │ • Session   │    │ • Player    │    │ • Plugin     │      │
│  │ • Auth      │    │ • Invite    │    │ • Turn       │      │
│  │             │    │             │    │              │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬───────┘      │
│         │                  │                   │              │
│         └──────────────────┴───────────────────┘              │
│                            │                                  │
│                     ┌──────┴────────┐                         │
│                     │               │                         │
│                     │ SHARED KERNEL │                         │
│                     │               │                         │
│                     │ • Result<T>   │                         │
│                     │ • DomainEvent │                         │
│                     │ • BaseEntity  │                         │
│                     │ • Logger      │                         │
│                     │               │                         │
│                     └───────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Bounded Context: IAM

### Ubiquitous Language

- **User** : Utilisateur de la plateforme
- **Credentials** : Email + Password
- **Session** : Session active d'un user
- **Token** : JWT pour authentification
- **Role** : Admin, Player, Guest

### Structure Complète

```
domains/iam/
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   │   export class User extends BaseEntity {
│   │   │     private email: Email
│   │   │     private password: Password
│   │   │     private username: Username
│   │   │     
│   │   │     static create(props): Result<User>
│   │   │     authenticate(pwd: string): Result<boolean>
│   │   │     updateProfile(data): Result<void>
│   │   │   }
│   │   │
│   │   └── session.entity.ts
│   │       export class Session extends BaseEntity {
│   │         private userId: string
│   │         private token: string
│   │         private expiresAt: Date
│   │         
│   │         isValid(): boolean
│   │         refresh(): Result<Session>
│   │       }
│   │
│   ├── value_objects/
│   │   ├── email.vo.ts
│   │   │   export class Email extends ValueObject {
│   │   │     static create(value: string): Result<Email>
│   │   │     private static isValid(email: string): boolean
│   │   │   }
│   │   │
│   │   ├── password.vo.ts
│   │   │   export class Password extends ValueObject {
│   │   │     static create(plain: string): Result<Password>
│   │   │     verify(plain: string): Promise<boolean>
│   │   │     private static meetsRequirements(pwd: string): boolean
│   │   │   }
│   │   │
│   │   └── username.vo.ts
│   │
│   ├── events/
│   │   ├── user_registered.event.ts
│   │   ├── user_logged_in.event.ts
│   │   └── user_logged_out.event.ts
│   │
│   └── repositories/
│       └── user_repository.interface.ts
│           export interface IUserRepository {
│             save(user: User): Promise<Result<User>>
│             findById(id: string): Promise<Result<User>>
│             findByEmail(email: Email): Promise<Result<User>>
│             delete(id: string): Promise<Result<void>>
│           }
│
├── application/
│   ├── commands/
│   │   ├── register_user/
│   │   │   ├── register_user.command.ts
│   │   │   ├── register_user.handler.ts
│   │   │   └── register_user.validator.ts
│   │   │
│   │   ├── authenticate_user/
│   │   └── logout_user/
│   │
│   ├── queries/
│   │   ├── get_user/
│   │   └── check_auth_status/
│   │
│   └── services/
│       └── auth.service.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── lucid/
│   │   │   ├── user.model.ts          # Lucid Model
│   │   │   └── user_repository.lucid.ts
│   │   │
│   │   └── in_memory/
│   │       └── user_repository.memory.ts  # Pour tests
│   │
│   ├── security/
│   │   ├── bcrypt_password_hasher.ts
│   │   └── jwt_token_generator.ts
│   │
│   └── events/
│       └── iam_event_bridge.ts        # Transmit bridge
│
└── presentation/
    ├── controllers/
    │   └── auth.controller.ts
    │       export default class AuthController {
    │         constructor(
    │           private registerHandler: RegisterUserHandler,
    │           private authHandler: AuthenticateUserHandler
    │         ) {}
    │         
    │         async register({ request, response, session }) {
    │           const command = new RegisterUserCommand(...)
    │           const result = await this.registerHandler.handle(command)
    │           
    │           if (result.isFailure) {
    │             return response.badRequest({ error: result.error })
    │           }
    │           
    │           session.flash('success', 'Account created!')
    │           return response.redirect('/lobbies')
    │         }
    │       }
    │
    ├── middleware/
    │   └── auth.middleware.ts
    │
    └── routes/
        └── auth.routes.ts
```

### Exemple: Register User Command

```typescript
// domains/iam/application/commands/register_user/register_user.command.ts
export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly username: string
  ) {}
}

// register_user.handler.ts
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, User> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: IEventBus
  ) {}
  
  async handle(command: RegisterUserCommand): Promise<Result<User>> {
    // 1. Validate & create Value Objects
    const emailResult = Email.create(command.email)
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error)
    }
    
    const passwordResult = await Password.create(command.password)
    if (passwordResult.isFailure) {
      return Result.fail(passwordResult.error)
    }
    
    const usernameResult = Username.create(command.username)
    if (usernameResult.isFailure) {
      return Result.fail(usernameResult.error)
    }
    
    // 2. Check email uniqueness
    const existingUser = await this.userRepository.findByEmail(emailResult.value)
    if (existingUser.isSuccess) {
      return Result.fail('Email already exists')
    }
    
    // 3. Create User entity
    const userResult = User.create({
      email: emailResult.value,
      password: passwordResult.value,
      username: usernameResult.value
    })
    
    if (userResult.isFailure) {
      return Result.fail(userResult.error)
    }
    
    // 4. Persist
    const saveResult = await this.userRepository.save(userResult.value)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }
    
    // 5. Emit domain event
    await this.eventBus.publish(
      new UserRegisteredEvent(userResult.value.id, command.email)
    )
    
    return Result.ok(userResult.value)
  }
}
```

---

## 🎮 Bounded Context: LOBBY

### Ubiquitous Language

- **Lobby** : Salle d'attente pour un jeu
- **Player** : Joueur dans un lobby
- **Owner** : Créateur du lobby
- **Invitation** : Code pour rejoindre un lobby privé
- **Ready Status** : Joueur prêt ou non
- **Lobby State** : WAITING, STARTING, IN_GAME, FINISHED

### Structure Complète

```
domains/lobby/
├── domain/
│   ├── entities/
│   │   ├── lobby.entity.ts
│   │   └── player.entity.ts
│   │
│   ├── value_objects/
│   │   ├── lobby_settings.vo.ts
│   │   │   export class LobbySettings extends ValueObject {
│   │   │     name: string
│   │   │     maxPlayers: number
│   │   │     minPlayers: number
│   │   │     isPrivate: boolean
│   │   │     gameType: string
│   │   │   }
│   │   │
│   │   ├── lobby_status.vo.ts
│   │   │   export enum LobbyStatus {
│   │   │     WAITING = 'waiting',
│   │   │     STARTING = 'starting',
│   │   │     IN_GAME = 'in_game',
│   │   │     FINISHED = 'finished'
│   │   │   }
│   │   │
│   │   ├── invitation_code.vo.ts
│   │   └── player_status.vo.ts
│   │
│   ├── aggregates/
│   │   └── lobby.aggregate.ts
│   │       export class LobbyAggregate extends AggregateRoot {
│   │         private lobby: Lobby
│   │         private players: Player[] = []
│   │         
│   │         // CONSISTENCY BOUNDARY
│   │         addPlayer(player: Player): Result<void> {
│   │           if (this.players.length >= this.lobby.maxPlayers) {
│   │             return Result.fail('Lobby is full')
│   │           }
│   │           
│   │           this.players.push(player)
│   │           this.addDomainEvent(
│   │             new PlayerJoinedEvent(this.lobby.id, player.id)
│   │           )
│   │           return Result.ok()
│   │         }
│   │         
│   │         removePlayer(playerId: string): Result<void> {
│   │           const index = this.players.findIndex(p => p.id === playerId)
│   │           if (index === -1) {
│   │             return Result.fail('Player not found')
│   │           }
│   │           
│   │           this.players.splice(index, 1)
│   │           this.addDomainEvent(
│   │             new PlayerLeftEvent(this.lobby.id, playerId)
│   │           )
│   │           return Result.ok()
│   │         }
│   │         
│   │         startGame(): Result<void> {
│   │           if (this.players.length < this.lobby.minPlayers) {
│   │             return Result.fail('Not enough players')
│   │           }
│   │           
│   │           const allReady = this.players.every(p => p.isReady)
│   │           if (!allReady) {
│   │             return Result.fail('Not all players are ready')
│   │           }
│   │           
│   │           this.lobby.status = LobbyStatus.STARTING
│   │           this.addDomainEvent(
│   │             new GameStartedEvent(this.lobby.id, this.players.map(p => p.id))
│   │           )
│   │           return Result.ok()
│   │         }
│   │       }
│   │
│   ├── events/
│   │   ├── lobby_created.event.ts
│   │   ├── player_joined.event.ts
│   │   ├── player_left.event.ts
│   │   ├── player_ready_changed.event.ts
│   │   └── game_started.event.ts
│   │
│   ├── services/
│   │   ├── lobby_validator.service.ts
│   │   └── invitation_generator.service.ts
│   │
│   ├── policies/
│   │   └── lobby_access.policy.ts
│   │       export class LobbyAccessPolicy {
│   │         canJoin(user: User, lobby: Lobby): Result<boolean>
│   │         canKick(user: User, targetPlayer: Player, lobby: Lobby): Result<boolean>
│   │         canStart(user: User, lobby: Lobby): Result<boolean>
│   │       }
│   │
│   └── repositories/
│       └── lobby_repository.interface.ts
│
├── application/
│   ├── commands/
│   │   ├── create_lobby/
│   │   ├── join_lobby/
│   │   ├── leave_lobby/
│   │   ├── start_game/
│   │   ├── kick_player/
│   │   └── update_settings/
│   │
│   ├── queries/
│   │   ├── list_lobbies/
│   │   ├── get_lobby/
│   │   └── get_available_lobbies/
│   │
│   └── services/
│       └── lobby_orchestrator.service.ts
│
├── infrastructure/
│   ├── persistence/
│   │   ├── lucid/
│   │   │   ├── lobby.model.ts
│   │   │   ├── player.model.ts
│   │   │   └── lobby_repository.lucid.ts
│   │   │
│   │   └── cache/
│   │       └── lobby_cache.service.ts      # Redis cache
│   │
│   ├── events/
│   │   └── lobby_event_bridge.ts
│   │
│   └── sse/
│       └── lobby_sse_broadcaster.ts        # Temps réel
│
└── presentation/
    ├── controllers/
    │   ├── lobbies.controller.ts
    │   └── lobby_sync.controller.ts
    │
    └── routes/
        └── lobbies.routes.ts
```

---

## 🎲 Bounded Context: GAME ENGINE

### Ubiquitous Language

- **Game** : Instance de jeu en cours
- **Plugin** : Implémentation d'un type de jeu
- **Turn** : Tour de jeu
- **Game State** : État complet du jeu
- **Game Action** : Action d'un joueur
- **Game Result** : Résultat final (winner, draw)

### Structure Complète

```
domains/game_engine/
├── domain/
│   ├── entities/
│   │   ├── game.entity.ts
│   │   └── game_session.entity.ts
│   │
│   ├── value_objects/
│   │   ├── game_state.vo.ts
│   │   ├── game_status.vo.ts
│   │   ├── turn.vo.ts
│   │   └── game_result.vo.ts
│   │
│   ├── plugins/                           # PLUGIN SYSTEM
│   │   ├── base/
│   │   │   ├── game_plugin.interface.ts
│   │   │   │   export interface GamePlugin<TState, TAction> {
│   │   │   │     id: string
│   │   │   │     name: string
│   │   │   │     minPlayers: number
│   │   │   │     maxPlayers: number
│   │   │   │     
│   │   │   │     initializeState(players: string[]): TState
│   │   │   │     validateAction(state: TState, playerId: string, action: TAction): Result
│   │   │   │     applyAction(state: TState, playerId: string, action: TAction): TState
│   │   │   │     checkWinCondition(state: TState): GameResult
│   │   │   │     isGameOver(state: TState): boolean
│   │   │   │   }
│   │   │   │
│   │   │   └── game_plugin_registry.ts
│   │   │       export class GamePluginRegistry {
│   │   │         private plugins = new Map<string, GamePlugin<any, any>>()
│   │   │         
│   │   │         register(plugin: GamePlugin<any, any>): void
│   │   │         get(id: string): GamePlugin<any, any>
│   │   │         getAll(): GamePlugin<any, any>[]
│   │   │       }
│   │   │
│   │   ├── tic_tac_toe/
│   │   │   ├── tic_tac_toe_plugin.ts
│   │   │   ├── tic_tac_toe_state.ts
│   │   │   └── tic_tac_toe_action.ts
│   │   │
│   │   └── checkers/                     # Futur jeu
│   │
│   ├── events/
│   │   ├── game_created.event.ts
│   │   ├── turn_played.event.ts
│   │   └── game_ended.event.ts
│   │
│   ├── services/
│   │   ├── game_validator.service.ts
│   │   └── turn_manager.service.ts
│   │
│   └── repositories/
│       └── game_repository.interface.ts
│
├── application/
│   ├── commands/
│   │   ├── create_game/
│   │   ├── play_turn/
│   │   └── end_game/
│   │
│   └── queries/
│       ├── get_game/
│       ├── get_game_state/
│       └── get_game_history/
│
├── infrastructure/
│   ├── persistence/
│   │   └── lucid/
│   │       ├── game.model.ts
│   │       └── game_repository.lucid.ts
│   │
│   └── events/
│       └── game_event_bridge.ts
│
└── presentation/
    ├── controllers/
    │   └── games.controller.ts
    │
    └── routes/
        └── games.routes.ts
```

---

## 🔗 Communication Inter-Domaines

### 1. Via Domain Events (Async)

```typescript
// Lobby domain émet un événement
@EventEmitter
export class LobbyAggregate {
  startGame(): Result<void> {
    this.addDomainEvent(
      new GameStartedEvent(this.lobby.id, this.players.map(p => p.id))
    )
    return Result.ok()
  }
}

// Game Engine domain réagit
@EventHandler('lobby.game_started')
export class GameStartedHandler {
  constructor(
    private readonly createGameHandler: CreateGameHandler
  ) {}
  
  async handle(event: GameStartedEvent) {
    const command = new CreateGameCommand(
      event.lobbyId,
      event.playerIds,
      'tic-tac-toe'
    )
    
    await this.createGameHandler.handle(command)
  }
}
```

### 2. Via Anti-Corruption Layer (Sync)

```typescript
// integration/lobby_to_game/lobby_to_game.adapter.ts
export class LobbyToGameAdapter {
  constructor(
    private readonly lobbyRepository: ILobbyRepository,
    private readonly gameRepository: IGameRepository
  ) {}
  
  async createGameFromLobby(lobbyId: string): Promise<Result<Game>> {
    // 1. Get lobby aggregate
    const lobbyResult = await this.lobbyRepository.findById(lobbyId)
    if (lobbyResult.isFailure) {
      return Result.fail(lobbyResult.error)
    }
    
    const lobby = lobbyResult.value
    
    // 2. Map to game domain
    const players = lobby.players.map(p => this.toGamePlayer(p))
    const gameSettings = this.toGameSettings(lobby.settings)
    
    // 3. Create game in game domain
    const gameResult = Game.create({
      lobbyId: lobby.id,
      players,
      settings: gameSettings
    })
    
    if (gameResult.isFailure) {
      return Result.fail(gameResult.error)
    }
    
    // 4. Persist
    return await this.gameRepository.save(gameResult.value)
  }
  
  private toGamePlayer(player: LobbyPlayer): GamePlayer {
    return {
      id: player.userId,  // Map from User domain
      name: player.username,
      isReady: true
    }
  }
}
```

### 3. Via Shared Kernel (Primitives Communes)

```typescript
// shared_kernel/domain/result.ts
export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: string
  ) {}
  
  static ok<T>(value?: T): Result<T> {
    return new Result<T>(true, value)
  }
  
  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error)
  }
  
  get isFailure(): boolean {
    return !this.isSuccess
  }
}

// Utilisé dans TOUS les domaines
```

---

## 📊 Comparaison Avant/Après

### Avant (Actuel)
```
❌ app/application/use_cases/
    ├── create_lobby_use_case.ts
    ├── register_user_use_case.ts
    └── create_game_use_case.ts    # MÉLANGÉ!

❌ app/domain/entities/
    ├── lobby.ts
    ├── user.ts
    └── game.ts                     # PAS DE CONTEXTE!

❌ app/controllers/
    └── lobbies_controller.ts       # 21273 bytes! MONOLITHE!
```

### Après (Cible)
```
✅ app/domains/iam/
    └── Tout ce qui concerne User, Auth

✅ app/domains/lobby/
    └── Tout ce qui concerne Lobby, Player

✅ app/domains/game_engine/
    └── Tout ce qui concerne Game, Plugins

✅ app/shared_kernel/
    └── Primitives communes

✅ app/integration/
    └── Anti-Corruption Layers
```

---

## 🎯 Règles Strictes

### ❌ INTERDIT

1. **Import direct entre domaines**
   ```typescript
   // ❌ INTERDIT
   import { User } from '../iam/domain/entities/user.entity'
   ```

2. **Dépendance circulaire**
   ```typescript
   // ❌ INTERDIT
   Lobby → User
   User → Lobby
   ```

3. **Logic métier dans Infrastructure**
   ```typescript
   // ❌ INTERDIT
   class LobbyRepository {
     async save(lobby: Lobby) {
       // ❌ Pas de business logic ici!
       if (lobby.players.length > 10) { ... }
     }
   }
   ```

### ✅ AUTORISÉ

1. **Domain Events**
   ```typescript
   // ✅ OK
   eventBus.publish(new GameStartedEvent(...))
   ```

2. **Anti-Corruption Layer**
   ```typescript
   // ✅ OK
   adapter.createGameFromLobby(lobbyId)
   ```

3. **Shared Kernel**
   ```typescript
   // ✅ OK
   import { Result } from '#shared_kernel/domain/result'
   ```

---

**Architecture prête à implémenter ! 🚀**
