import User from '../../domain/entities/user.js'
import Player from '../../domain/entities/player.js'
import { UserRepository } from '../repositories/user_repository.js'
import { PlayerRepository } from '../repositories/player_repository.js'

export interface AuthenticateUserRequest {
  email: string
  password: string
}

export interface AuthenticateUserResponse {
  user: {
    uuid: string
    firstName: string
    lastName: string
    username: string
    email: string
    avatarUrl?: string
    isEmailVerified: boolean
  }
  player: {
    uuid: string
    nickName: string
    gamesPlayed: number
    gamesWon: number
    winRate: number
  }
}

export default class AuthenticateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private playerRepository: PlayerRepository
  ) {}

  async execute(request: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    // Validation des données d'entrée
    this.validateRequest(request)

    // Rechercher l'utilisateur par email
    const user = await this.userRepository.findByEmail(request.email)
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Vérifier le mot de passe (should be hashed comparison in real implementation)
    if (user.password !== request.password) {
      throw new Error('Invalid credentials')
    }

    // Récupérer le profil joueur
    const player = await this.playerRepository.findByUserUuidOrFail(user.uuid)

    return {
      user: {
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
      player: {
        uuid: player.uuid,
        nickName: player.nickName,
        gamesPlayed: player.gamesPlayed,
        gamesWon: player.gamesWon,
        winRate: player.winRate,
      },
    }
  }

  private validateRequest(request: AuthenticateUserRequest): void {
    if (!request.email || !request.email.trim()) {
      throw new Error('Email is required')
    }
    if (!request.password || !request.password.trim()) {
      throw new Error('Password is required')
    }
  }
}
