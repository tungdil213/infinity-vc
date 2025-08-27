import User from '../../domain/entities/user.js'
import Player from '../../domain/entities/player.js'
import { UserRepository } from '../repositories/user_repository.js'
import { PlayerRepository } from '../repositories/player_repository.js'
import { Result } from '../../domain/shared/result.js'

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

  async execute(request: AuthenticateUserRequest): Promise<Result<AuthenticateUserResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<AuthenticateUserResponse>(validationResult.error)
      }

      // Rechercher l'utilisateur par email
      const user = await this.userRepository.findByEmail(request.email)
      if (!user) {
        return Result.fail('Invalid credentials')
      }

      // Vérifier le mot de passe (should be hashed comparison in real implementation)
      if (user.password !== request.password) {
        return Result.fail('Invalid credentials')
      }

      // Récupérer le profil joueur
      const player = await this.playerRepository.findByUserUuidOrFail(user.uuid)

      const response: AuthenticateUserResponse = {
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

      return Result.ok(response)
    } catch (error) {
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private validateRequest(request: AuthenticateUserRequest): Result<void> {
    if (!request.email || !request.email.trim()) {
      return Result.fail('Email is required')
    }
    if (!request.password || !request.password.trim()) {
      return Result.fail('Password is required')
    }
    return Result.ok(undefined)
  }
}
