# 🚀 Plan d'Implémentation - Architecture InMemory + DB

**Date:** 13 novembre 2025 - 00:00  
**Status:** 📝 **EN COURS**

---

## ✅ Phase 1: Infrastructure (COMPLÉTÉ)

### 1.1 Repositories
- [x] Créer `LobbyRepositoryInMemory`
- [x] Mettre à jour interface `LobbyRepository`
- [x] Corriger `LobbyRepositoryLucid` (number pour ownerId)
- [x] Créer `LobbyMigrationService`

### 1.2 Documentation
- [x] `LOBBY_PERSISTENCE_STRATEGY.md` - Stratégie complète
- [x] `ID_VS_UUID_STRATEGY.md` - Double identifiant
- [x] `IMPLEMENTATION_PLAN.md` - Ce document

---

## 🔄 Phase 2: Configuration DI (EN COURS)

### 2.1 Container Setup
```typescript
// providers/app_provider.ts ou start/container.ts

import { LobbyRepositoryInMemory } from '#domains/lobby/infrastructure/persistence/lobby_repository.in_memory'
import { LobbyRepositoryLucid } from '#domains/lobby/infrastructure/persistence/lobby_repository.lucid'
import { LobbyMigrationService } from '#domains/lobby/application/services/lobby_migration_service'

// Singleton pour InMemory (partagé entre toutes les requêtes)
container.singleton('LobbyRepositoryInMemory', () => {
  return new LobbyRepositoryInMemory()
})

// Singleton pour Lucid
container.singleton('LobbyRepositoryLucid', () => {
  return new LobbyRepositoryLucid()
})

// Par défaut : InMemory pour create, join, leave
container.bind('LobbyRepository', () => {
  return container.make('LobbyRepositoryInMemory')
})

// Migration service
container.singleton('LobbyMigrationService', () => {
  return new LobbyMigrationService(
    container.make('LobbyRepositoryInMemory'),
    container.make('LobbyRepositoryLucid')
  )
})
```

### 2.2 Fichiers à Modifier
- [ ] `providers/app_provider.ts` - Configuration DI
- [ ] `start/container.ts` - Si séparé

---

## 🔧 Phase 3: Commands & Handlers

### 3.1 CreateLobbyHandler (PRIORITAIRE)
```typescript
// app/domains/lobby/application/commands/create_lobby/create_lobby.handler.ts

@inject()
export class CreateLobbyHandler {
  constructor(
    @inject('LobbyRepositoryInMemory')  // ✅ Utiliser InMemory
    private readonly lobbyRepository: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: CreateLobbyCommand): Promise<Result<LobbyAggregate>> {
    // 1. Créer lobby
    const lobby = Lobby.create({...})
    
    // 2. Créer aggregate
    const aggregate = LobbyAgg.create(lobby)
    
    // 3. Sauver en MÉMOIRE ✅
    const result = await this.lobbyRepository.save(aggregate)
    
    // 4. Publier événements
    await this.eventBus.publishAll(aggregate.domainEvents)
    
    return result
  }
}
```

### 3.2 StartLobbyHandler (NOUVEAU)
```typescript
// app/domains/lobby/application/commands/start_lobby/start_lobby.handler.ts

@inject()
export class StartLobbyHandler {
  constructor(
    @inject('LobbyMigrationService')
    private readonly migrationService: LobbyMigrationService,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: StartLobbyCommand): Promise<Result<void>> {
    // 1. Trouver lobby (en mémoire)
    const findResult = await this.migrationService.findLobby(command.lobbyId)
    
    if (findResult.isFailure || !findResult.value) {
      return Result.fail('Lobby not found')
    }
    
    const aggregate = findResult.value
    
    // 2. Vérifier permissions (isOwner)
    if (aggregate.lobbyEntity.ownerId !== command.userId) {
      return Result.fail('Only owner can start the lobby')
    }
    
    // 3. Vérifier min players
    if (aggregate.playersList.length < aggregate.lobbyEntity.settings.minPlayers) {
      return Result.fail(`Need at least ${aggregate.lobbyEntity.settings.minPlayers} players`)
    }
    
    // 4. Démarrer (change status)
    const startResult = aggregate.start()
    if (startResult.isFailure) {
      return startResult
    }
    
    // 5. MIGRER vers DB ✅
    const migrateResult = await this.migrationService.migrateToDatabase(aggregate.lobbyEntity.id)
    if (migrateResult.isFailure) {
      return Result.fail(`Failed to migrate lobby: ${migrateResult.error}`)
    }
    
    // 6. Publier événements
    await this.eventBus.publishAll(aggregate.domainEvents)
    
    return Result.ok()
  }
}
```

### 3.3 Autres Handlers
- [x] CreateLobbyHandler - Utiliser InMemory
- [ ] JoinLobbyHandler - Trouver dans InMemory ou DB
- [ ] LeaveLobbyHandler - Trouver dans InMemory ou DB
- [ ] StartLobbyHandler - Migrer vers DB
- [ ] KickPlayerHandler - Trouver dans InMemory ou DB

---

## 🎮 Phase 4: Contrôleurs

### 4.1 LobbiesController
```typescript
@inject()
export class LobbiesController {
  constructor(
    @inject('LobbyMigrationService')
    private readonly migrationService: LobbyMigrationService,
    @inject('LobbyRepositoryInMemory')
    private readonly inMemoryRepo: LobbyRepository,
    @inject('LobbyRepositoryLucid')
    private readonly lucidRepo: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Liste des lobbies (WAITING uniquement)
   */
  async index({ inertia }: HttpContext) {
    // Récupérer TOUS les lobbies (mémoire + DB)
    const result = await this.migrationService.findAllLobbies()
    
    if (result.isFailure) {
      return inertia.render('errors/500')
    }
    
    // Filtrer seulement WAITING (joinables)
    const waitingLobbies = result.value.filter(
      agg => agg.lobbyEntity.status === 'waiting'
    )
    
    return inertia.render('lobbies/index', {
      lobbies: waitingLobbies.map(this.toLobbyDTO)
    })
  }

  /**
   * Afficher un lobby spécifique
   */
  async show({ params, inertia }: HttpContext) {
    const uuid = params.uuid
    
    // Chercher dans les DEUX sources
    const result = await this.migrationService.findLobby(uuid)
    
    if (result.isFailure || !result.value) {
      return inertia.render('errors/404')
    }
    
    return inertia.render('lobbies/show', {
      lobby: this.toLobbyDTO(result.value)
    })
  }

  /**
   * Démarrer un lobby
   */
  async start({ params, auth, response }: HttpContext) {
    const handler = new StartLobbyHandler(this.migrationService, this.eventBus)
    
    const command = new StartLobbyCommand(
      params.uuid,
      auth.user!.id
    )
    
    const result = await handler.handle(command)
    
    if (result.isFailure) {
      return response.badRequest({ error: result.error })
    }
    
    return response.redirect().toRoute('lobbies.show', { uuid: params.uuid })
  }
}
```

### 4.2 Fichiers à Modifier
- [ ] `lobbies_controller.ts` - Utiliser MigrationService
- [ ] Ajouter méthode `start()`
- [ ] Mettre à jour `index()` pour filtrer WAITING
- [ ] Mettre à jour `show()` pour chercher partout

---

## 📊 Phase 5: Entity & Aggregate

### 5.1 Lobby Entity
```typescript
// domain/entities/lobby.entity.ts

export class Lobby extends BaseEntity {
  // ... existing code ...

  /**
   * Start the lobby (change status to IN_GAME)
   * This triggers migration to DB
   */
  start(): Result<void> {
    // Vérifications
    if (this.status !== LobbyStatus.WAITING && this.status !== LobbyStatus.READY) {
      return Result.fail('Lobby must be in WAITING or READY state to start')
    }
    
    // Changer status
    this.props.status = LobbyStatus.IN_GAME
    this.touch()
    
    return Result.ok()
  }
}
```

### 5.2 Lobby Aggregate
```typescript
// domain/aggregates/lobby.aggregate.ts

export class LobbyAggregate extends AggregateRoot {
  // ... existing code ...

  /**
   * Start the lobby
   * Emits lobby.started event
   */
  start(): Result<void> {
    const startResult = this.lobbyEntity.start()
    
    if (startResult.isFailure) {
      return startResult
    }
    
    // Émettre événement
    this.addDomainEvent(new LobbyStartedEvent(this.lobbyEntity.id))
    
    return Result.ok()
  }
}
```

### 5.3 Fichiers à Modifier
- [ ] `lobby.entity.ts` - Ajouter méthode `start()`
- [ ] `lobby.aggregate.ts` - Ajouter méthode `start()`
- [ ] Créer `LobbyStartedEvent`

---

## 🧪 Phase 6: Tests

### 6.1 Tests InMemory Repository
```typescript
// tests/unit/lobby_repository_in_memory.spec.ts

test.group('LobbyRepositoryInMemory', () => {
  test('should save lobby in memory', async ({ assert }) => {
    const repo = new LobbyRepositoryInMemory()
    const aggregate = createTestAggregate()
    
    const result = await repo.save(aggregate)
    
    assert.isTrue(result.isSuccess)
    assert.equal(repo.count(), 1)
  })
  
  test('should lose lobbies on restart', async ({ assert }) => {
    const repo = new LobbyRepositoryInMemory()
    await repo.save(createTestAggregate())
    
    repo.clear()  // Simulate restart
    
    assert.equal(repo.count(), 0)
  })
  
  test('should find available lobbies', async ({ assert }) => {
    const repo = new LobbyRepositoryInMemory()
    await repo.save(createWaitingLobby())  // Public, has slots
    await repo.save(createPrivateLobby())  // Private
    await repo.save(createFullLobby())     // Full
    
    const result = await repo.findAvailable()
    
    assert.isTrue(result.isSuccess)
    assert.equal(result.value.length, 1)  // Only the waiting public one
  })
})
```

### 6.2 Tests Migration Service
```typescript
// tests/unit/lobby_migration_service.spec.ts

test.group('LobbyMigrationService', () => {
  test('should migrate lobby to DB when started', async ({ assert }) => {
    const inMemory = new LobbyRepositoryInMemory()
    const lucid = new LobbyRepositoryLucid()
    const service = new LobbyMigrationService(inMemory, lucid)
    
    // 1. Create in memory
    const aggregate = createTestAggregate()
    await inMemory.save(aggregate)
    
    // 2. Migrate
    await service.migrateToDatabase(aggregate.lobbyEntity.id)
    
    // 3. Should be in DB, not in memory
    const memResult = await inMemory.findById(aggregate.lobbyEntity.id)
    const dbResult = await lucid.findById(aggregate.lobbyEntity.id)
    
    assert.isNull(memResult.value)
    assert.isNotNull(dbResult.value)
  })
  
  test('should rollback on migration failure', async ({ assert }) => {
    // ... test rollback logic
  })
})
```

### 6.3 Tests Fonctionnels
```typescript
// tests/functional/lobby_lifecycle.spec.ts

test.group('Lobby Lifecycle', () => {
  test('complete lobby lifecycle: create → join → start → finish', async ({ client, assert }) => {
    // 1. Create lobby (should be in memory)
    const createResponse = await client.post('/lobbies').json({
      name: 'Test Lobby',
      maxPlayers: 4
    })
    assert.equal(createResponse.status(), 201)
    
    const lobbyUuid = createResponse.body().uuid
    
    // 2. Join lobby (still in memory)
    await client.post(`/lobbies/${lobbyUuid}/join`)
    await client.post(`/lobbies/${lobbyUuid}/join`)  // Player 2
    
    // 3. Start lobby (migrates to DB)
    await client.post(`/lobbies/${lobbyUuid}/start`)
    
    // 4. Verify in DB
    const lobby = await LobbyModel.findBy('uuid', lobbyUuid)
    assert.isNotNull(lobby)
    assert.equal(lobby!.status, 'in_game')
  })
})
```

### 6.4 Fichiers à Créer
- [ ] `tests/unit/lobby_repository_in_memory.spec.ts`
- [ ] `tests/unit/lobby_migration_service.spec.ts`
- [ ] `tests/functional/lobby_lifecycle.spec.ts`
- [ ] `tests/unit/start_lobby_handler.spec.ts`

---

## 🔍 Phase 7: Monitoring & Debug

### 7.1 Métriques
```typescript
// app/domains/lobby/infrastructure/monitoring/lobby_metrics.ts

export class LobbyMetrics {
  static async getStats() {
    const inMemoryRepo = container.make('LobbyRepositoryInMemory')
    const lucidRepo = container.make('LobbyRepositoryLucid')
    
    const inMemoryCount = inMemoryRepo.count()
    const dbResult = await lucidRepo.findAll()
    const dbCount = dbResult.isSuccess ? dbResult.value.length : 0
    
    return {
      inMemory: inMemoryCount,
      inDatabase: dbCount,
      total: inMemoryCount + dbCount,
      migrationRate: dbCount / (inMemoryCount + dbCount)
    }
  }
}
```

### 7.2 Route Admin
```typescript
// start/routes.ts

router.get('/admin/lobby-stats', async ({ response }) => {
  const stats = await LobbyMetrics.getStats()
  return response.ok(stats)
})
```

### 7.3 Fichiers à Créer
- [ ] `infrastructure/monitoring/lobby_metrics.ts`
- [ ] Route admin `/admin/lobby-stats`
- [ ] Dashboard monitoring (optionnel)

---

## 📝 Phase 8: Documentation Utilisateur

### 8.1 README Équipe
- [ ] Expliquer l'architecture InMemory + DB
- [ ] Documenter le workflow de migration
- [ ] Best practices pour les développeurs

### 8.2 API Documentation
- [ ] Endpoints lobbies
- [ ] États des lobbies
- [ ] Workflow création → démarrage

---

## ✅ Checklist Finale

### Infrastructure
- [x] LobbyRepositoryInMemory créé
- [x] LobbyMigrationService créé
- [ ] Container DI configuré
- [ ] Tests repositories

### Business Logic
- [ ] CreateLobbyHandler utilise InMemory
- [ ] StartLobbyHandler créé
- [ ] Lobby.start() implémenté
- [ ] LobbyStartedEvent créé

### Contrôleurs
- [ ] LobbiesController.index() filtré
- [ ] LobbiesController.show() cherche partout
- [ ] LobbiesController.start() implémenté

### Tests
- [ ] Tests unitaires InMemory
- [ ] Tests migration
- [ ] Tests fonctionnels lifecycle
- [ ] Tests handlers

### Monitoring
- [ ] Métriques implémentées
- [ ] Route admin stats
- [ ] Logs standardisés

### Documentation
- [x] Architecture documentée
- [x] Stratégie persistance documentée
- [ ] README équipe
- [ ] API docs

---

## 🎯 Prochaine Action Immédiate

**PRIORITÉ 1:** Configurer le Container DI pour que `CreateLobbyHandler` utilise `LobbyRepositoryInMemory`

```bash
# Étapes
1. Identifier le fichier de configuration DI
2. Ajouter les bindings InMemory et Lucid
3. Tester la création de lobby
4. Vérifier que lobby est en RAM (pas en DB)
```

---

**Auteur:** Cascade AI  
**Date:** 13 novembre 2025 - 00:00  
**Status:** 📝 **PLAN ÉTABLI - PRÊT POUR IMPLÉMENTATION**  
**Prochaine étape:** Configuration DI Container
