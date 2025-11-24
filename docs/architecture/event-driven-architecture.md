# Architecture Event-Driven pour Infinity

## 🎯 Vue d'ensemble

Cette documentation décrit la nouvelle architecture Event-Driven qui remplace le système de notifications directes par un système d'événements puissant et extensible.

## 🚀 Avantages de l'Architecture Event-Driven

### ✅ Avant (Approche Impérative)
```typescript
// Dans CreateLobbyUseCase
const lobby = Lobby.create(data)
await lobbyRepository.save(lobby)

// Notifications directes et couplées
transmitService.notifyLobbyCreated(lobby)
analyticsService.trackLobbyCreation(lobby)
// Chaque nouvelle fonctionnalité nécessite une modification du use case
```

### 🎉 Après (Approche Event-Driven)
```typescript
// Dans EventDrivenCreateLobbyUseCase
const lobby = Lobby.create(data)
await lobbyRepository.save(lobby)

// Un seul événement déclenche toutes les actions
const event = LobbyEventFactory.lobbyCreated(lobby)
await eventBus.publish(event)

// Automatiquement traité par :
// → LobbyPersistenceHandler
// → TransmitEventBridge  
// → LobbyAnalyticsHandler
// → [Futurs handlers sans modifier le code existant]
```

## 📁 Structure des Fichiers

```
app/
├── domain/events/
│   ├── base/
│   │   ├── domain_event.ts          # Interface de base pour tous les événements
│   │   └── event_handler.ts         # Interface des handlers + BaseEventHandler
│   └── lobby/
│       ├── lobby_domain_events.ts   # Événements typés du domaine Lobby
│       └── lobby_event_handlers.ts  # Handlers spécialisés (Persistence, BusinessRules, Analytics)
├── application/events/
│   ├── event_bus.ts                 # Interface de l'Event Bus
│   └── in_memory_event_bus.ts       # Implémentation complète avec timeout & retry
├── infrastructure/events/
│   ├── transmit_event_bridge.ts     # Pont vers Transmit pour temps réel
│   └── event_system_factory.ts     # Factory pour initialiser tout le système
├── providers/
│   └── event_driven_provider.ts    # Provider AdonisJS pour IoC
└── use_cases/
    └── event_driven_create_lobby_use_case.ts  # Exemple de migration
```

## 🔧 Composants Principaux

### 1. DomainEvent - Interface de Base
```typescript
interface DomainEvent {
  type: string                    // 'lobby.created', 'player.joined'
  eventId: string                 // UUID unique pour traçabilité
  data: Record<string, any>       // Données spécifiques à l'événement
  metadata: EventMetadata         // Timestamp, corrélation, contexte user
  version: number                 // Version pour compatibilité
}
```

### 2. EventBus - Cœur du Système
```typescript
interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<Result<void>>
  publishAndWait<T extends DomainEvent>(event: T): Promise<Result<EventHandlingResult[]>>
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): UnsubscribeFunction
}
```

### 3. EventHandler - Traitement par Domaine
```typescript
interface EventHandler<T extends DomainEvent> {
  readonly name: string           // Nom unique du handler
  readonly priority: number       // 0 = plus haute priorité
  canHandle(event: DomainEvent): boolean
  handle(event: T): Promise<Result<EventHandlingResult>>
}
```

## 🎮 Événements du Domaine Lobby

| Événement | Type | Description | Handlers |
|-----------|------|-------------|----------|
| **LobbyCreated** | `lobby.created` | Création d'un nouveau lobby | Persistence, BusinessRules, Transmit, Analytics |
| **PlayerJoined** | `lobby.player.joined` | Joueur rejoint un lobby | Persistence, BusinessRules, Transmit, Analytics |
| **PlayerLeft** | `lobby.player.left` | Joueur quitte un lobby | Persistence, BusinessRules, Transmit, Analytics |
| **StatusChanged** | `lobby.status.changed` | Changement de statut (WAITING→READY) | BusinessRules, Transmit |
| **GameStarted** | `lobby.game.started` | Démarrage d'une partie | Transmit, Analytics |
| **LobbyDeleted** | `lobby.deleted` | Suppression d'un lobby | Transmit, Analytics |

## 🔨 Handlers Spécialisés

### 1. LobbyPersistenceHandler (Priorité 0)
- **Responsabilité** : Vérifier et assurer la persistance des données
- **Actions** : Validation des sauvegardes, nettoyage des lobbies supprimés

### 2. LobbyBusinessRulesHandler (Priorité 1)  
- **Responsabilité** : Valider les règles métier
- **Actions** : Vérifier les transitions de statut, limites de joueurs, etc.

### 3. TransmitEventBridge (Priorité 5)
- **Responsabilité** : Diffuser les événements via Transmit
- **Actions** : Convertir événements en notifications temps réel
- **Canaux** : `lobbies/`, `lobbies/{uuid}`, `games/{uuid}`

### 4. LobbyAnalyticsHandler (Priorité 10)
- **Responsabilité** : Collecter les métriques et analytics
- **Actions** : Taux de remplissage, temps de session, etc.

## 📡 Intégration avec Transmit

L'architecture Event-Driven s'intègre parfaitement avec votre système Transmit existant :

```typescript
// TransmitEventBridge convertit automatiquement :
LobbyCreatedEvent → transmit.broadcast('lobbies', {
  type: 'lobby.created',
  lobby: { uuid, name, players, ... },
  timestamp: '2024-01-01T12:00:00Z'
})

PlayerJoinedEvent → transmit.broadcast('lobbies/uuid123', {
  type: 'lobby.player.joined', 
  player: { uuid, nickName },
  playerCount: 3
})
```

## 🚀 Guide de Migration

### Étape 1: Identifier les Use Cases à Migrer
```bash
# Rechercher les use cases avec notifications directes
grep -r "transmitService\|notificationService" app/application/use_cases/
```

### Étape 2: Créer les Événements Domaine
```typescript
// Remplacer les appels directs par des événements
// AVANT
transmitService.notifyPlayerJoined(lobby, player)

// APRÈS  
const event = LobbyEventFactory.playerJoined(lobby.uuid, player, lobbyState)
await eventBus.publish(event)
```

### Étape 3: Injecter l'EventBus
```typescript
@inject()
export class MyUseCase {
  constructor(
    // ... autres dépendances
    private eventBus: EventBus
  ) {}
}
```

### Étape 4: Tester la Migration
```typescript
// Test unitaire
const mockEventBus = createMockEventBus()
const useCase = new MyUseCase(/* deps */, mockEventBus)

const result = await useCase.execute(request)
expect(mockEventBus.publish).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'lobby.created' })
)
```

## 🔧 Configuration et Déploiement

### 1. Ajouter le Provider dans `config/app.ts`
```typescript
export const providers = [
  // ... autres providers
  () => import('#providers/event_driven_provider')
]
```

### 2. Configuration Environnement
```typescript
// Development
const eventBus = new InMemoryEventBus({
  parallelProcessing: true,
  handlerTimeoutMs: 10000,  // Respect règles Infinity
  enableDetailedLogging: true
})

// Production  
const eventBus = new InMemoryEventBus({
  parallelProcessing: true,
  handlerTimeoutMs: 5000,
  enableDetailedLogging: false
})
```

## 🎯 Règles et Bonnes Pratiques

### ✅ À Faire
- **Immutabilité** : Toujours créer de nouveaux objets événements
- **Timeout** : Respecter la limite de 10 secondes par handler
- **Fallback** : L'Event Bus ne doit jamais faire échouer le use case principal
- **Logging** : Utiliser les préfixes standardisés (🎯, 📡, 💾, 📊)
- **Result<T>** : Tous les handlers retournent Result<EventHandlingResult>

### ❌ À Éviter
- **Mutations directes** : Jamais modifier l'événement en place
- **Dépendances circulaires** : Un handler ne doit pas publier d'événements qui déclenchent d'autres handlers créant une boucle
- **Handlers bloquants** : Jamais d'opérations synchrones longues
- **Exceptions non gérées** : Toujours wrapper dans Result<T>

## 🔮 Extensions Futures

### Nouveaux Domaines
```typescript
// Futurs événements à ajouter
GameDomainEvent     // game.started, game.ended, player.action
PlayerDomainEvent   // player.connected, player.disconnected  
NotificationDomainEvent // notification.sent, notification.read
```

### Event Sourcing Avancé
```typescript
// Possibilité d'ajouter un Event Store pour replay/audit
interface EventStore {
  store(event: DomainEvent): Promise<void>
  getEvents(aggregateId: string): Promise<DomainEvent[]>
  replay(fromEventId: string): Promise<void>
}
```

### Handlers Conditionnels
```typescript
// Handlers qui ne s'exécutent que sous certaines conditions
export class ConditionalHandler extends BaseEventHandler {
  canHandle(event: DomainEvent): boolean {
    return event.type === 'lobby.created' && 
           event.data.isPrivate === false // Seulement lobbies publics
  }
}
```

## 📊 Monitoring et Observabilité

```typescript
// Statistiques disponibles via EventBus
const stats = eventBus.getStats()
console.log({
  totalSubscriptions: stats.totalSubscriptions,
  eventsProcessed: stats.eventsProcessed,
  averageProcessingTime: stats.averageProcessingTimeMs,
  errorCount: stats.errorCount,
  handlerStats: stats.handlerStats
})
```

L'architecture Event-Driven transforme votre code en un système puissant, extensible et maintenant prêt pour l'avenir ! 🚀
