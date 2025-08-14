# API Reference

## Vue d'ensemble

Cette documentation décrit l'API REST de l'application **Infinity Gauntlet Love Letter**. L'API suit les conventions RESTful et utilise JSON pour les échanges de données.

## Configuration de Base

- **Base URL** : `http://localhost:3333/api/v1`
- **Content-Type** : `application/json`
- **Authentification** : Session-based avec cookies
- **Rate Limiting** : 100 requêtes/minute par utilisateur

## Authentification

### POST /auth/register
Inscription d'un nouvel utilisateur.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "password_confirmation": "securePassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": null,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "player": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "nickName": "johndoe"
  }
}
```

**Erreurs:**
- `400` : Données invalides
- `422` : Email ou username déjà utilisé

### POST /auth/login
Connexion utilisateur.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "message": "Login successful"
}
```

**Erreurs:**
- `401` : Identifiants invalides
- `422` : Données manquantes

### POST /auth/logout
Déconnexion utilisateur.

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

## Gestion des Joueurs

### GET /players/me
Récupération du profil du joueur connecté.

**Headers:** `Authorization: Bearer <session_cookie>`

**Response (200):**
```json
{
  "user": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "player": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "nickName": "johndoe"
  },
  "stats": {
    "gamesPlayed": 15,
    "gamesWon": 8,
    "winRate": 0.53
  }
}
```

### PUT /players/me
Mise à jour du profil joueur.

**Request Body:**
```json
{
  "nickName": "NewNickname",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "player": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "nickName": "NewNickname"
  },
  "message": "Profile updated successfully"
}
```

## Gestion des Lobbies

### GET /lobbies
Liste des lobbies disponibles.

**Query Parameters:**
- `status` : Filtrer par statut (`OPEN`, `WAITING`, `READY`, `FULL`)
- `hasSlots` : `true` pour les lobbies avec places disponibles
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 25, max: 100)

**Response (200):**
```json
{
  "data": [
    {
      "uuid": "lobby-123",
      "name": "Partie rapide",
      "status": "WAITING",
      "currentPlayers": 2,
      "maxPlayers": 4,
      "createdBy": {
        "uuid": "user-123",
        "nickName": "PlayerOne"
      },
      "players": [
        {
          "uuid": "user-123",
          "nickName": "PlayerOne"
        },
        {
          "uuid": "user-456",
          "nickName": "PlayerTwo"
        }
      ],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "perPage": 25,
    "currentPage": 1,
    "lastPage": 2
  }
}
```

### POST /lobbies
Création d'un nouveau lobby.

**Request Body:**
```json
{
  "name": "Ma partie",
  "maxPlayers": 4,
  "isPrivate": false
}
```

**Response (201):**
```json
{
  "lobby": {
    "uuid": "lobby-789",
    "name": "Ma partie",
    "status": "OPEN",
    "currentPlayers": 1,
    "maxPlayers": 4,
    "isPrivate": false,
    "createdBy": {
      "uuid": "user-123",
      "nickName": "PlayerOne"
    },
    "players": [
      {
        "uuid": "user-123",
        "nickName": "PlayerOne"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Erreurs:**
- `400` : Données invalides
- `401` : Non authentifié
- `429` : Trop de lobbies créés

### GET /lobbies/:lobbyId
Détails d'un lobby spécifique.

**Response (200):**
```json
{
  "lobby": {
    "uuid": "lobby-123",
    "name": "Partie rapide",
    "status": "READY",
    "currentPlayers": 3,
    "maxPlayers": 4,
    "isPrivate": false,
    "createdBy": {
      "uuid": "user-123",
      "nickName": "PlayerOne"
    },
    "players": [
      {
        "uuid": "user-123",
        "nickName": "PlayerOne"
      },
      {
        "uuid": "user-456",
        "nickName": "PlayerTwo"
      },
      {
        "uuid": "user-789",
        "nickName": "PlayerThree"
      }
    ],
    "availableActions": ["PLAYER_JOINED", "PLAYER_LEFT", "GAME_STARTED"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Erreurs:**
- `404` : Lobby non trouvé

### POST /lobbies/:lobbyId/join
Rejoindre un lobby.

**Response (200):**
```json
{
  "lobby": {
    "uuid": "lobby-123",
    "status": "READY",
    "currentPlayers": 3,
    "players": [
      // Liste mise à jour des joueurs
    ]
  },
  "message": "Successfully joined lobby"
}
```

**Erreurs:**
- `400` : Lobby complet ou fermé
- `409` : Joueur déjà dans le lobby
- `404` : Lobby non trouvé

### POST /lobbies/:lobbyId/leave
Quitter un lobby.

**Response (200):**
```json
{
  "message": "Successfully left lobby"
}
```

**Erreurs:**
- `400` : Joueur pas dans le lobby
- `404` : Lobby non trouvé

### POST /lobbies/:lobbyId/start
Démarrer une partie (créateur uniquement).

**Response (201):**
```json
{
  "game": {
    "uuid": "game-456",
    "status": "IN_PROGRESS",
    "players": [
      {
        "uuid": "user-123",
        "nickName": "PlayerOne"
      },
      {
        "uuid": "user-456",
        "nickName": "PlayerTwo"
      }
    ],
    "startedAt": "2024-01-15T11:00:00Z"
  },
  "redirectUrl": "/games/game-456"
}
```

**Erreurs:**
- `403` : Pas le créateur du lobby
- `400` : Lobby pas prêt à démarrer
- `404` : Lobby non trouvé

## Gestion des Parties

### GET /games/:gameId
Détails d'une partie.

**Response (200):**
```json
{
  "game": {
    "uuid": "game-456",
    "status": "IN_PROGRESS",
    "players": [
      {
        "uuid": "user-123",
        "nickName": "PlayerOne",
        "position": 0,
        "isActive": true,
        "cards": 1,
        "isEliminated": false
      },
      {
        "uuid": "user-456",
        "nickName": "PlayerTwo",
        "position": 1,
        "isActive": false,
        "cards": 1,
        "isEliminated": false
      }
    ],
    "currentRound": 1,
    "currentTurn": 0,
    "gameData": {
      "deck": {
        "remaining": 14
      },
      "discardPile": [
        {
          "card": "GUARD",
          "playedBy": "user-123",
          "target": "user-456",
          "guess": "PRIEST"
        }
      ]
    },
    "startedAt": "2024-01-15T11:00:00Z",
    "availableActions": ["PLAY_CARD", "VIEW_HAND"]
  }
}
```

**Erreurs:**
- `403` : Pas autorisé à voir cette partie
- `404` : Partie non trouvée

### POST /games/:gameId/actions
Jouer une action dans la partie.

**Request Body:**
```json
{
  "action": "PLAY_CARD",
  "card": "GUARD",
  "target": "user-456",
  "guess": "PRIEST"
}
```

**Response (200):**
```json
{
  "game": {
    // État mis à jour de la partie
  },
  "result": {
    "success": true,
    "message": "Card played successfully",
    "effects": [
      {
        "type": "CARD_REVEALED",
        "target": "user-456",
        "card": "BARON"
      }
    ]
  }
}
```

**Erreurs:**
- `400` : Action invalide
- `403` : Pas le tour du joueur
- `404` : Partie non trouvée

### GET /games/:gameId/hand
Récupération de la main du joueur.

**Response (200):**
```json
{
  "hand": [
    {
      "card": "PRIEST",
      "description": "Look at another player's hand",
      "value": 2
    }
  ],
  "canPlay": true,
  "availableTargets": ["user-456", "user-789"]
}
```

## Server-Sent Events (SSE)

### GET /sse/connect
Connexion au flux d'événements temps réel.

**Headers:** `Authorization: Bearer <session_cookie>`

**Response:** Stream d'événements SSE

**Événements disponibles:**
- `connected` : Confirmation de connexion
- `lobby:created` : Nouveau lobby créé
- `lobby:updated` : Lobby mis à jour
- `lobby:removed` : Lobby supprimé
- `lobby:player_joined` : Joueur rejoint un lobby
- `lobby:player_left` : Joueur quitte un lobby
- `game:started` : Partie démarrée
- `game:updated` : État de partie mis à jour
- `game:finished` : Partie terminée
- `chat:message` : Nouveau message de chat
- `ping` : Heartbeat

**Exemple d'événement:**
```
event: lobby:player_joined
data: {"event":"lobby:player_joined","data":{"lobbyId":"lobby-123","player":{"uuid":"user-456","nickName":"PlayerTwo"},"currentPlayers":2,"lobbyStatus":"WAITING"},"timestamp":"2024-01-15T11:00:00Z"}

```

## Codes d'Erreur

### Erreurs Génériques
- `400 Bad Request` : Requête malformée ou données invalides
- `401 Unauthorized` : Authentification requise
- `403 Forbidden` : Accès interdit
- `404 Not Found` : Ressource non trouvée
- `422 Unprocessable Entity` : Erreurs de validation
- `429 Too Many Requests` : Rate limit dépassé
- `500 Internal Server Error` : Erreur serveur

### Erreurs Métier
- `LOBBY_FULL` : Lobby complet
- `LOBBY_CLOSED` : Lobby fermé
- `PLAYER_NOT_IN_LOBBY` : Joueur pas dans le lobby
- `INVALID_GAME_ACTION` : Action de jeu invalide
- `NOT_PLAYER_TURN` : Pas le tour du joueur
- `GAME_FINISHED` : Partie terminée

**Format d'erreur:**
```json
{
  "error": {
    "code": "LOBBY_FULL",
    "message": "This lobby is full and cannot accept more players",
    "details": {
      "lobbyId": "lobby-123",
      "currentPlayers": 4,
      "maxPlayers": 4
    }
  }
}
```

## Rate Limiting

### Limites par Endpoint
- **Authentification** : 5 tentatives/minute
- **Création de lobby** : 10/minute
- **Actions de jeu** : 30/minute
- **API générale** : 100/minute

### Headers de Rate Limiting
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Pagination

### Format Standard
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "perPage": 25,
    "currentPage": 2,
    "lastPage": 6,
    "from": 26,
    "to": 50
  },
  "links": {
    "first": "/api/v1/lobbies?page=1",
    "last": "/api/v1/lobbies?page=6",
    "prev": "/api/v1/lobbies?page=1",
    "next": "/api/v1/lobbies?page=3"
  }
}
```

## Filtrage et Tri

### Paramètres de Filtrage
- `filter[status]` : Filtrer par statut
- `filter[createdBy]` : Filtrer par créateur
- `filter[hasSlots]` : Lobbies avec places disponibles

### Paramètres de Tri
- `sort` : Champ de tri (`createdAt`, `name`, `currentPlayers`)
- `order` : Ordre de tri (`asc`, `desc`)

**Exemple:**
```
GET /api/v1/lobbies?filter[status]=WAITING&sort=createdAt&order=desc
```

## Webhooks (Optionnel)

### Configuration
Les webhooks permettent de recevoir des notifications sur des événements spécifiques.

**Événements disponibles:**
- `game.started`
- `game.finished`
- `lobby.created`
- `player.registered`

**Format de payload:**
```json
{
  "event": "game.finished",
  "data": {
    "gameId": "game-456",
    "winner": "user-123",
    "duration": 1200,
    "finishedAt": "2024-01-15T11:20:00Z"
  },
  "timestamp": "2024-01-15T11:20:00Z",
  "signature": "sha256=..."
}
```

## Exemples d'Utilisation

### Créer et Rejoindre un Lobby
```javascript
// 1. Créer un lobby
const createResponse = await fetch('/api/v1/lobbies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Ma partie',
    maxPlayers: 4
  })
});
const { lobby } = await createResponse.json();

// 2. Rejoindre le lobby (autre joueur)
const joinResponse = await fetch(`/api/v1/lobbies/${lobby.uuid}/join`, {
  method: 'POST'
});

// 3. Démarrer la partie
const startResponse = await fetch(`/api/v1/lobbies/${lobby.uuid}/start`, {
  method: 'POST'
});
const { game } = await startResponse.json();
```

### Écouter les Événements SSE
```javascript
const eventSource = new EventSource('/sse/connect');

eventSource.addEventListener('lobby:player_joined', (event) => {
  const data = JSON.parse(event.data);
  console.log('Nouveau joueur:', data.player.nickName);
});

eventSource.addEventListener('game:started', (event) => {
  const data = JSON.parse(event.data);
  window.location.href = `/games/${data.gameId}`;
});
```

Cette API offre une interface complète pour :
- **Gestion des utilisateurs** et authentification
- **Création et gestion des lobbies** avec états temps réel
- **Parties multijoueurs** avec actions validées
- **Communication temps réel** via SSE
- **Monitoring et debugging** avec codes d'erreur détaillés
