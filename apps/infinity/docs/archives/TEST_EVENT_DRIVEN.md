# 🧪 Test de l'Architecture Event-Driven

## ✅ Scénario de test complet

### 1. Redémarrer le serveur

```bash
cd apps/infinity
pnpm run dev
```

### 2. Scénario : 2 utilisateurs, 1 lobby

#### User 1 : Créer un lobby

1. Se connecter avec `user1@test.com`
2. Créer un lobby "Test Event-Driven"
3. **Observer les logs serveur :**

```
🚀 EventBusSingleton: Initializing Event-Driven system...
🎯 EventSystemFactory: Registering Lobby domain handlers...
✅ EventSystemFactory: Lobby handlers registered successfully
📡 EventSystemFactory: Registering Transmit bridge...
✅ EventSystemFactory: Transmit bridge registered successfully
✅ EventSystemFactory: Event-Driven system initialized successfully

📡 CreateLobbyUseCase: Publishing 1 domain event(s)
🎯 EventBus: Publishing event lobby.created

💾 LobbyPersistenceHandler: Handling lobby.created
✅ LobbyPersistenceHandler: Lobby persistence handled successfully

🔍 LobbyBusinessRulesHandler: Validating lobby.created
✅ LobbyBusinessRulesHandler: Business rules validation completed

📡 TransmitEventBridge: Broadcasting lobby.created via Transmit
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies/{uuid}

📊 LobbyAnalyticsHandler: Recording analytics for lobby.created
✅ LobbyAnalyticsHandler: Analytics recorded successfully

✅ CreateLobbyUseCase: Event lobby.created published successfully
```

#### User 2 : Rejoindre le lobby (dans un autre navigateur)

1. Se connecter avec `user2@test.com`
2. Voir le lobby dans la liste
3. Cliquer sur "Join"
4. **Observer les logs serveur :**

```
📡 JoinLobbyUseCase: Publishing 1 domain event(s)
🎯 EventBus: Publishing event lobby.player.joined

💾 LobbyPersistenceHandler: Handling lobby.player.joined
🔍 LobbyBusinessRulesHandler: Validating lobby.player.joined
📡 TransmitEventBridge: Broadcasting lobby.player.joined via Transmit
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies/{uuid}
📊 LobbyAnalyticsHandler: Recording analytics for lobby.player.joined

✅ JoinLobbyUseCase: PlayerJoined event published successfully
```

5. **🎉 VÉRIFIER : L'écran de User 1 se met à jour automatiquement !**
   - User 1 voit maintenant "2/4 players"
   - User 1 voit User 2 dans la liste des joueurs
   - **Pas besoin de recharger la page !**

#### User 2 : Quitter le lobby

1. Cliquer sur "Leave Lobby"
2. **Observer les logs serveur :**

```
📡 LeaveLobbyUseCase: Publishing 1 domain event(s)
🎯 EventBus: Publishing event lobby.player.left

💾 LobbyPersistenceHandler: Handling lobby.player.left
🔍 LobbyBusinessRulesHandler: Validating lobby.player.left
📡 TransmitEventBridge: Broadcasting lobby.player.left via Transmit
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies
✅ TransmitEventBridge: Successfully broadcasted to channel lobbies/{uuid}
📊 LobbyAnalyticsHandler: Recording analytics for lobby.player.left

✅ LeaveLobbyUseCase: PlayerLeft event published successfully
```

3. **🎉 VÉRIFIER : L'écran de User 1 se met à jour automatiquement !**
   - User 1 voit maintenant "1/4 players"
   - User 2 a disparu de la liste des joueurs

## 🔍 Debugging

### Vérifier que l'EventBus est actif

Ajoutez temporairement cette route dans un contrôleur :

```typescript
import { getEventBus } from '#infrastructure/events/event_bus_singleton'

async eventBusStats({ response }: HttpContext) {
  const eventBus = await getEventBus()
  const stats = eventBus.getStats()
  
  return response.json({
    status: 'EventBus is running',
    stats: {
      totalSubscriptions: stats.totalSubscriptions,
      eventTypes: stats.eventTypesCount,
      eventsProcessed: stats.eventsProcessed,
      eventsPublished: stats.eventsPublished,
      errors: stats.errorCount,
      avgProcessingTime: `${stats.averageProcessingTimeMs}ms`,
      handlers: stats.handlerStats.map(h => ({
        name: h.handlerName,
        processed: h.eventsProcessed,
        avgTime: `${h.averageProcessingTimeMs}ms`,
        errors: h.errorCount
      }))
    }
  })
}
```

Puis accédez à `GET /api/events/stats`

### Vérifier les événements Transmit côté client

Dans la console du navigateur :

```javascript
// Vérifier que TransmitContext est connecté
console.log('Transmit connected:', transmitContext.isConnected)

// Écouter tous les événements
transmitClient.on('*', (event) => {
  console.log('📡 Transmit event received:', event)
})
```

## ✅ Checklist de validation

- [ ] Le serveur démarre sans erreur
- [ ] Les logs `EventBusSingleton: Initializing...` apparaissent au démarrage
- [ ] Création de lobby → 4 handlers s'exécutent
- [ ] Join lobby → 4 handlers s'exécutent
- [ ] Leave lobby → 4 handlers s'exécutent
- [ ] **L'écran de User 1 se met à jour quand User 2 join**
- [ ] **L'écran de User 1 se met à jour quand User 2 leave**
- [ ] Aucune erreur dans les logs
- [ ] Stats EventBus accessibles via `/api/events/stats`

## 🐛 Problèmes courants

### Erreur : "EventBus is not defined"

**Cause :** L'EventBus singleton n'est pas initialisé

**Solution :** Vérifier que `getEventBus()` est appelé dans les use cases

### Erreur : "No handlers found for event"

**Cause :** Les handlers ne sont pas enregistrés

**Solution :** Vérifier que `EventSystemFactory` s'initialise correctement

### L'écran ne se met pas à jour

**Cause possible 1 :** Transmit n'est pas connecté côté client

**Solution :** Vérifier dans la console : `transmitContext.isConnected`

**Cause possible 2 :** Les événements ne sont pas écoutés

**Solution :** Vérifier que `LobbyService` ou `LobbyContext` écoute les événements Transmit

**Cause possible 3 :** L'ancien TransmitLobbyService interfère

**Solution :** Pour le moment, les deux systèmes cohabitent. Vérifier qu'au moins un des deux fonctionne.

## 🎯 Résultat attendu

Après ce test, vous devriez voir :

1. ✅ **Tous les événements sont loggés avec emojis** (🎯, 💾, 🔍, 📡, 📊)
2. ✅ **Les 4 handlers traitent chaque événement**
3. ✅ **TransmitEventBridge diffuse vers les bons canaux**
4. ✅ **Les écrans des utilisateurs se mettent à jour en temps réel**
5. ✅ **Aucune erreur dans la console serveur**

**Si tous ces points sont validés, votre architecture Event-Driven est opérationnelle ! 🎉**
