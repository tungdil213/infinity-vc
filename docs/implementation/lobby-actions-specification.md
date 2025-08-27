# Spécification Exhaustive des Actions de Lobby

## Actions Principales

### 1. **CREATE_LOBBY** - Créer un lobby
- **Description**: Créer un nouveau lobby de jeu
- **Acteur**: Utilisateur authentifié
- **Prérequis**: Utilisateur non présent dans un autre lobby
- **Paramètres**: name, maxPlayers (2-8), isPrivate, password?
- **Résultat**: Lobby créé avec le créateur comme premier joueur
- **États possibles**: OPEN
- **Use Case**: ✅ CreateLobbyUseCase (existant)

### 2. **JOIN_LOBBY** - Rejoindre un lobby
- **Description**: Rejoindre un lobby existant
- **Acteur**: Utilisateur authentifié
- **Prérequis**: Lobby ouvert, places disponibles, utilisateur non déjà présent
- **Paramètres**: lobbyUuid, userUuid, password?
- **Résultat**: Utilisateur ajouté au lobby
- **États possibles**: OPEN → WAITING/READY/FULL
- **Use Case**: ❌ JoinLobbyUseCase (à créer)

### 3. **LEAVE_LOBBY** - Quitter un lobby
- **Description**: Quitter un lobby
- **Acteur**: Joueur présent dans le lobby
- **Prérequis**: Joueur présent dans le lobby
- **Paramètres**: lobbyUuid, userUuid
- **Résultat**: Joueur retiré, lobby supprimé si vide, transfert ownership si créateur
- **États possibles**: Tous → OPEN/DELETED
- **Use Case**: ❌ LeaveLobbyUseCase (à créer)

### 4. **START_GAME** - Démarrer une partie
- **Description**: Démarrer une partie depuis le lobby
- **Acteur**: Créateur du lobby
- **Prérequis**: Lobby READY ou FULL, minimum 2 joueurs
- **Paramètres**: lobbyUuid, userUuid
- **Résultat**: Game créé, lobby en état STARTING
- **États possibles**: READY/FULL → STARTING
- **Use Case**: ❌ StartGameUseCase (à créer)

### 5. **SHOW_LOBBY** - Afficher les détails d'un lobby
- **Description**: Récupérer les informations détaillées d'un lobby
- **Acteur**: Utilisateur authentifié
- **Prérequis**: Lobby existant
- **Paramètres**: lobbyUuid
- **Résultat**: Détails complets du lobby
- **États possibles**: Tous
- **Use Case**: ❌ ShowLobbyUseCase (à créer)

### 6. **LIST_LOBBIES** - Lister les lobbies
- **Description**: Lister les lobbies publics disponibles
- **Acteur**: Utilisateur authentifié
- **Prérequis**: Aucun
- **Paramètres**: filters?, pagination?
- **Résultat**: Liste des lobbies publics ouverts
- **États possibles**: OPEN, WAITING, READY
- **Use Case**: ❌ ListLobbiesUseCase (à créer)

## Actions Avancées

### 7. **KICK_PLAYER** - Expulser un joueur
- **Description**: Expulser un joueur du lobby
- **Acteur**: Créateur du lobby
- **Prérequis**: Joueur présent, acteur est créateur
- **Paramètres**: lobbyUuid, targetUserUuid, creatorUuid
- **Résultat**: Joueur expulsé
- **États possibles**: Tous → OPEN/WAITING
- **Use Case**: ❌ KickPlayerUseCase (à créer)

### 8. **TRANSFER_OWNERSHIP** - Transférer la propriété
- **Description**: Transférer la propriété du lobby à un autre joueur
- **Acteur**: Créateur du lobby
- **Prérequis**: Joueur cible présent, acteur est créateur
- **Paramètres**: lobbyUuid, newOwnerUuid, currentOwnerUuid
- **Résultat**: Propriété transférée
- **États possibles**: Tous
- **Use Case**: ❌ TransferOwnershipUseCase (à créer)

### 9. **UPDATE_LOBBY_SETTINGS** - Modifier les paramètres
- **Description**: Modifier les paramètres du lobby
- **Acteur**: Créateur du lobby
- **Prérequis**: Lobby pas encore démarré, acteur est créateur
- **Paramètres**: lobbyUuid, name?, maxPlayers?, isPrivate?, password?
- **Résultat**: Paramètres mis à jour
- **États possibles**: OPEN, WAITING
- **Use Case**: ❌ UpdateLobbySettingsUseCase (à créer)

### 10. **SET_READY** - Marquer comme prêt
- **Description**: Marquer un lobby comme prêt à démarrer
- **Acteur**: Créateur du lobby
- **Prérequis**: Minimum 2 joueurs
- **Paramètres**: lobbyUuid, userUuid
- **Résultat**: Lobby en état READY
- **États possibles**: WAITING → READY
- **Use Case**: ❌ SetLobbyReadyUseCase (à créer)

### 11. **INVITE_PLAYER** - Inviter un joueur
- **Description**: Inviter un joueur spécifique au lobby
- **Acteur**: Créateur du lobby
- **Prérequis**: Lobby privé, places disponibles
- **Paramètres**: lobbyUuid, targetUserUuid, inviterUuid
- **Résultat**: Invitation envoyée
- **États possibles**: OPEN, WAITING
- **Use Case**: ❌ InvitePlayerUseCase (à créer)

### 12. **ACCEPT_INVITATION** - Accepter une invitation
- **Description**: Accepter une invitation à rejoindre un lobby
- **Acteur**: Utilisateur invité
- **Prérequis**: Invitation valide, lobby ouvert
- **Paramètres**: invitationUuid, userUuid
- **Résultat**: Joueur ajouté au lobby
- **États possibles**: OPEN → WAITING/READY/FULL
- **Use Case**: ❌ AcceptInvitationUseCase (à créer)

## Actions de Consultation

### 13. **GET_LOBBY_HISTORY** - Historique du lobby
- **Description**: Récupérer l'historique des actions du lobby
- **Acteur**: Joueur présent ou créateur
- **Prérequis**: Lobby existant, permissions
- **Paramètres**: lobbyUuid, userUuid
- **Résultat**: Liste des événements
- **États possibles**: Tous
- **Use Case**: ❌ GetLobbyHistoryUseCase (à créer)

### 14. **GET_PLAYER_LOBBIES** - Lobbies d'un joueur
- **Description**: Récupérer les lobbies d'un joueur
- **Acteur**: Utilisateur authentifié
- **Prérequis**: Utilisateur existant
- **Paramètres**: userUuid
- **Résultat**: Liste des lobbies du joueur
- **États possibles**: Tous
- **Use Case**: ❌ GetPlayerLobbiesUseCase (à créer)

## États et Transitions

### Machine à États
```
OPEN → (player joins) → WAITING
WAITING → (ready set) → READY
WAITING → (player leaves) → OPEN
READY → (game starts) → STARTING
READY → (player leaves) → WAITING
FULL → (game starts) → STARTING
FULL → (player leaves) → READY
STARTING → (game created) → COMPLETED
```

### Règles Métier
- **Minimum joueurs**: 2
- **Maximum joueurs**: 8
- **Créateur**: Ne peut pas quitter si d'autres joueurs présents (sauf transfert)
- **Lobby vide**: Supprimé automatiquement
- **Lobby privé**: Nécessite invitation ou mot de passe
- **Game start**: Uniquement par le créateur, minimum 2 joueurs

## Tests à Implémenter

### Tests Unitaires par Use Case
1. **CreateLobbyUseCase**: ✅ Fait
2. **JoinLobbyUseCase**: Succès, lobby plein, déjà présent, lobby inexistant
3. **LeaveLobbyUseCase**: Succès, créateur quitte, dernier joueur, transfert ownership
4. **StartGameUseCase**: Succès, pas assez de joueurs, pas le créateur, lobby pas prêt
5. **ShowLobbyUseCase**: Succès, lobby inexistant, permissions
6. **ListLobbiesUseCase**: Succès, filtres, pagination
7. **KickPlayerUseCase**: Succès, pas le créateur, joueur inexistant
8. **TransferOwnershipUseCase**: Succès, pas le créateur, joueur inexistant
9. **UpdateLobbySettingsUseCase**: Succès, pas le créateur, lobby démarré
10. **SetLobbyReadyUseCase**: Succès, pas assez de joueurs, pas le créateur

### Tests d'Intégration
- Flux complet: Créer → Rejoindre → Démarrer
- Gestion des erreurs et rollback
- Événements temps réel (SSE)
- Concurrence (plusieurs joueurs simultanés)

### Tests End-to-End
- Interface utilisateur complète
- Notifications temps réel
- Gestion des déconnexions
- Performance avec multiple lobbies

## Problème Identifié: hasAvailableSlots

### Analyse
Le problème "Lobby is full" vient probablement d'une désynchronisation entre:
1. Les données backend (correctes)
2. Les données frontend (potentiellement obsolètes)
3. Les événements SSE (possibles interruptions)

### Solution
1. Vérifier la synchronisation des données via SSE
2. Ajouter des logs pour tracer hasAvailableSlots
3. Implémenter un refresh manuel si nécessaire
4. Corriger la logique de calcul si incohérente
