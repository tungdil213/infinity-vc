# Gestion des Joueurs

## Vue d'ensemble

Le système de gestion des joueurs gère l'authentification, les profils utilisateurs, et les sessions de jeu. Il fait la distinction entre les **Users** (comptes authentifiés) et les **Players** (profils de jeu).

## Architecture

### Modèle de Données

#### User (Utilisateur)
```typescript
interface User {
  id: number
  uuid: string           // Identifiant unique
  email: string          // Email (unique)
  firstName: string      // Prénom
  lastName: string       // Nom
  username: string       // Nom d'utilisateur (unique)
  password: string       // Mot de passe hashé
  avatarUrl?: string     // URL de l'avatar
  emailVerifiedAt?: DateTime // Date de vérification email
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Player (Profil Joueur)
```typescript
interface Player {
  id: number
  nickName: string       // Pseudonyme de jeu
  userId: number         // Référence vers User
  user: User            // Relation vers User
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Relations

- **User** `1:1` **Player** : Un utilisateur a un profil joueur unique
- **Player** `N:M` **Session** : Un joueur peut participer à plusieurs sessions

## Authentification

### Système d'Auth AdonisJS

Configuration dans `config/auth.ts` :

```typescript
const authConfig = defineConfig({
  default: 'web',
  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: providers.lucid({
        model: () => import('#models/user'),
        uids: ['email'],
        passwordColumnName: 'password',
      }),
    }),
  },
})
```

### Endpoints d'Authentification

#### Inscription
**POST** `/register`
- Validation des données (email unique, mot de passe fort)
- Création du User et du Player associé
- Envoi d'email de bienvenue

#### Connexion
**POST** `/login`
- Vérification des credentials
- Création de session
- Redirection vers dashboard

#### Déconnexion
**POST** `/logout`
- Invalidation de la session
- Redirection vers page d'accueil

## Gestion des Profils

### Interface PlayerInterface

```typescript
export interface PlayerInterface {
  uuid: string      // UUID de l'utilisateur
  nickName: string  // Pseudonyme de jeu
}
```

### Repository Pattern

#### PlayerRepository (Abstraction)
```typescript
export default abstract class PlayerRepository {
  abstract findAll(): Promise<PlayerInterface[]>
  abstract findByUUID(playerUUID: string): Promise<PlayerInterface>
  abstract save(player: PlayerInterface): Promise<void>
}
```

#### DatabasePlayerRepository (Implémentation)
```typescript
export class DatabasePlayerRepository extends PlayerRepository {
  async findByUUID(playerUUID: string): Promise<PlayerInterface> {
    const player = await Player.query()
      .preload('user', (query) => {
        query.where('uuid', playerUUID)
      })
      .first()
      
    if (!player) {
      throw new Error(`Player with UUID ${playerUUID} not found`)
    }
    
    return this.toPlayerInterface(player)
  }

  private toPlayerInterface(playerModel: Player): PlayerInterface {
    return {
      uuid: playerModel.user.uuid,
      nickName: playerModel.nickName,
    }
  }
}
```

## Services Applicatifs

### Use Cases

#### Profil Utilisateur
**GET** `/player/me` - Affichage du profil

```typescript
export default class ShowMeController {
  async handle({ auth, inertia }: HttpContext) {
    const user = auth.user!
    const player = await this.playerRepository.findByUUID(user.uuid)
    
    return inertia.render('player/profile', {
      user,
      player
    })
  }
}
```

## Middleware et Sécurité

### Middleware d'Authentification

```typescript
// Dans kernel.ts
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
})

// Utilisation sur les routes
router
  .group(() => {
    router.get('/me', [ShowMeController]).as('me.show')
  })
  .prefix('player')
  .use(middleware.auth())
```

### Validation des Données

#### Validation d'Inscription
```typescript
const registerValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(2),
    lastName: vine.string().trim().minLength(2),
    username: vine.string().trim().minLength(3).unique(),
    email: vine.string().email().unique(),
    password: vine.string().minLength(8).confirmed(),
  })
)
```

## Factory et Seeders

### UserFactory
```typescript
export const UserFactory = factory
  .define(User, async ({ faker }) => {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      avatarUrl: faker.image.avatar(),
      emailVerifiedAt: DateTime.fromJSDate(faker.date.past()),
    }
  })
  .build()
```

## Interface Utilisateur

### Pages Principales

#### `/register` - Inscription
- Formulaire d'inscription
- Validation côté client et serveur
- Redirection après inscription

#### `/login` - Connexion
- Formulaire de connexion
- Option "Se souvenir de moi"
- Lien mot de passe oublié

#### `/player/me` - Profil
- Affichage des informations utilisateur
- Modification du pseudonyme
- Historique des parties

### Composants React

```typescript
interface PlayerProfileProps {
  user: User
  player: PlayerInterface
}

export default function PlayerProfile({ user, player }: PlayerProfileProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <img 
            src={user.avatarUrl || '/default-avatar.png'} 
            alt="Avatar"
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h1 className="text-2xl font-bold">{player.nickName}</h1>
            <p className="text-gray-600">{user.firstName} {user.lastName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Gestion des Sessions

### Sessions de Jeu

Les joueurs peuvent participer à plusieurs sessions simultanément :

```typescript
// Relation Many-to-Many
@manyToMany(() => Session)
declare sessions: ManyToMany<typeof Session>
```

### États du Joueur

```typescript
interface PlayerState {
  isOnline: boolean
  currentSession?: string  // UUID de la session active
  lastActivity: DateTime
}
```

## Notifications

### Email de Bienvenue

```typescript
export default class WelcomeNotification extends BaseMail {
  constructor(private user: User) {
    super()
  }

  prepare() {
    this.message
      .to(this.user.email)
      .subject('Bienvenue sur Infinity Gauntlet Love Letter!')
      .htmlView('emails/welcome', { user: this.user })
  }
}
```

### Notifications en Temps Réel

- Invitations à rejoindre des lobbies
- Notifications de début de partie
- Messages de chat

## Sécurité

### Hashage des Mots de Passe

```typescript
// Configuration dans config/hash.ts
const hashConfig = defineConfig({
  default: 'scrypt',
  list: {
    scrypt: scryptDriver({
      cost: 16384,
      blockSize: 8,
      parallelization: 1,
      maxMemory: 33554432,
    }),
  },
})
```

### Protection CSRF

- Tokens CSRF sur tous les formulaires
- Validation automatique par AdonisJS
- Protection contre les attaques XSS

### Validation des Permissions

```typescript
// Exemple de vérification de propriété
async validatePlayerOwnership(userUUID: string, playerUUID: string) {
  if (userUUID !== playerUUID) {
    throw new UnauthorizedException('Access denied')
  }
}
```

## Monitoring

### Métriques Utilisateurs

- Nombre d'utilisateurs actifs
- Taux de conversion inscription → première partie
- Temps moyen de session
- Fréquence de connexion

### Logs d'Audit

- Connexions/déconnexions
- Modifications de profil
- Actions sensibles (changement mot de passe)

## Tests

### Tests Unitaires

```typescript
test('should create player profile after user registration', async ({ assert }) => {
  const user = await UserFactory.create()
  const player = await Player.findBy('user_id', user.id)
  
  assert.isNotNull(player)
  assert.equal(player.userId, user.id)
})
```

### Tests d'Intégration

- Flux complet d'inscription
- Authentification et autorisation
- Gestion des sessions multiples
