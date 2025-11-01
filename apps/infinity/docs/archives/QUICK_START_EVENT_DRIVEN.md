# 🚀 Quick Start : Architecture Event-Driven

## ✅ Ce qui a été fait

Votre use case `CreateLobbyUseCase` est maintenant **Event-Driven** ! 

### Modifications appliquées :

1. **✅ EventBus Singleton créé** → `/app/infrastructure/events/event_bus_singleton.ts`
2. **✅ CreateLobbyUseCase migré** → Utilise `getEventBus()` pour publier les événements
3. **✅ Handlers configurés** → Persistence, BusinessRules, Transmit, Analytics

## 🔧 Test de l'architecture

### 1. Redémarrer le serveur

```bash
cd apps/infinity
pnpm run dev
```

### 2. Créer un lobby

Quand vous créez un lobby, vous devriez voir ces logs dans la console :

```
🚀 EventBusSingleton: Initializing Event-Driven system...
📡 CreateLobbyUseCase: Publishing 1 domain event(s)
🎯 EventBus: Publishing event lobby.created
💾 LobbyPersistenceHandler: Handling lobby.created
🔍 LobbyBusinessRulesHandler: Validating lobby.created
📡 TransmitEventBridge: Broadcasting lobby.created via Transmit
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies/uuid123
📊 LobbyAnalyticsHandler: Recording analytics for lobby.created
✅ CreateLobbyUseCase: Event lobby.created published successfully
```

### 3. Vérifier les événements Transmit

Les événements sont maintenant publiés **deux fois** :
1. **Via TransmitLobbyService (ancien)** → Sera retiré progressivement
2. **Via TransmitEventBridge (nouveau)** → Architecture Event-Driven ✅

Vous verrez donc les logs doublés pour le moment, c'est normal !

## 📊 Statistiques en temps réel

Pour voir les statistiques de l'EventBus, ajoutez cette route de test :

```typescript
// Dans un contrôleur
import { getEventBus } from '#infrastructure/events/event_bus_singleton'

async showStats({ response }: HttpContext) {
  const eventBus = await getEventBus()
  const stats = eventBus.getStats()
  
  return response.json({
    totalSubscriptions: stats.totalSubscriptions,
    eventsProcessed: stats.eventsProcessed,
    eventsPublished: stats.eventsPublished,
    averageProcessingTime: `${stats.averageProcessingTimeMs}ms`,
    handlers: stats.handlerStats.map(h => ({
      name: h.handlerName,
      eventsProcessed: h.eventsProcessed,
      avgTime: `${h.averageProcessingTimeMs}ms`,
      errors: h.errorCount
    }))
  })
}
```

## 🔄 Migration des autres Use Cases

### JoinLobbyUseCase

```typescript
// Même pattern que CreateLobbyUseCase
import { getEventBus } from '../../infrastructure/events/event_bus_singleton.js'
import { LobbyEventFactory } from '../../domain/events/lobby/lobby_domain_events.js'

async execute(request: JoinLobbyRequest): Promise<Result<JoinLobbyResponse>> {
  // ... logique métier ...
  
  // Publier l'événement
  const eventBus = await getEventBus()
  const event = LobbyEventFactory.playerJoined(
    lobby.uuid,
    player,
    { currentPlayers, maxPlayers, canStart, status }
  )
  await eventBus.publish(event)
}
```

### LeaveLobbyUseCase

```typescript
const eventBus = await getEventBus()
const event = LobbyEventFactory.playerLeft(
  lobby.uuid,
  player,
  { currentPlayers, maxPlayers, canStart, status },
  lobbyDeleted
)
await eventBus.publish(event)
```

## 🎯 Prochaines étapes

### 1. Supprimer les appels directs à TransmitLobbyService

Une fois que tous les use cases publient via EventBus, vous pouvez retirer :
- `TransmitLobbyService.notifyLobbyCreated()`
- `TransmitLobbyService.notifyPlayerJoined()`
- etc.

Le `TransmitEventBridge` gère maintenant tout automatiquement !

### 2. Ajouter de nouveaux handlers

Exemples de handlers utiles :

```typescript
// Notification par email quand un lobby se remplit
export class LobbyFullEmailHandler extends BaseEventHandler {
  readonly name = 'LobbyFullEmailHandler'
  readonly priority = 8

  canHandle(event: DomainEvent): boolean {
    return event.type === 'lobby.player.joined' && 
           event.data.lobbyState.currentPlayers === event.data.lobbyState.maxPlayers
  }

  async handle(event: PlayerJoinedLobbyDomainEvent) {
    // Envoyer email aux joueurs
    await emailService.sendLobbyFullNotification(event.data.lobbyUuid)
    return Result.ok(this.success('Email sent'))
  }
}

// Logging avancé pour Sentry
export class SentryLoggingHandler extends BaseEventHandler {
  readonly name = 'SentryLoggingHandler'
  readonly priority = 15

  canHandle(event: DomainEvent): boolean {
    return true // Log tous les événements
  }

  async handle(event: DomainEvent) {
    Sentry.addBreadcrumb({
      category: 'domain-event',
      message: event.type,
      data: event.data,
      level: 'info'
    })
    return Result.ok(this.success('Logged to Sentry'))
  }
}
```

### 3. Event Sourcing (optionnel)

Si vous voulez un historique complet :

```typescript
export class EventStoreHandler extends BaseEventHandler {
  readonly name = 'EventStoreHandler'
  readonly priority = 0 // Très haute priorité

  async handle(event: DomainEvent) {
    await database.table('event_store').insert({
      event_id: event.eventId,
      event_type: event.type,
      event_data: JSON.stringify(event.data),
      correlation_id: event.metadata.correlationId,
      created_at: event.metadata.timestamp
    })
    return Result.ok(this.success('Event stored'))
  }
}
```

## 🐛 Debugging

Si les événements ne sont pas publiés :

1. **Vérifier que l'EventBus est initialisé** :
```typescript
const eventBus = await getEventBus()
console.log('EventBus stats:', eventBus.getStats())
```

2. **Vérifier les événements du domaine** :
```typescript
const uncommittedEvents = lobby.getUncommittedEvents()
console.log('Uncommitted events:', uncommittedEvents)
```

3. **Activer les logs détaillés** dans `EventSystemFactory` :
```typescript
const eventBus = new InMemoryEventBus({
  enableDetailedLogging: true  // ← Mettre à true
})
```

## 🎉 Résultat Final

Votre architecture Event-Driven est **opérationnelle** ! 

- ✅ Événements publiés automatiquement
- ✅ Handlers exécutés en parallèle par priorité
- ✅ Transmit intégré nativement
- ✅ Analytics collectées
- ✅ Facile d'ajouter de nouveaux handlers sans toucher au code existant

**Félicitations ! 🚀**
