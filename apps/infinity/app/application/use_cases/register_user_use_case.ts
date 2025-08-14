import User from '../../domain/entities/user.js'
import Player from '../../domain/entities/player.js'
import { UserRepository } from '../repositories/user_repository.js'
import { PlayerRepository } from '../repositories/player_repository.js'

export interface RegisterUserRequest {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  nickName?: string
}

export interface RegisterUserResponse {
  success: boolean
  user?: {
    uuid: string
    firstName: string
    lastName: string
    username: string
    email: string
    avatarUrl?: string
    createdAt: Date
  }
  player?: {
    uuid: string
    nickName: string
  }
  error?: string
}

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private playerRepository: PlayerRepository
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    try {
      // Validation des données d'entrée
      await this.validateRequest(request)

      // Création de l'utilisateur
      const user = User.create({
        firstName: request.firstName,
        lastName: request.lastName,
        username: request.username,
        email: request.email,
        password: request.password, // Should be hashed before this call
      })

      // Création du profil joueur
      const nickName = request.nickName || request.username
      const player = Player.create({
        userUuid: user.uuid,
        nickName: nickName,
      })

      // Sauvegarde
      await this.userRepository.save(user)
      await this.playerRepository.save(player)

      return {
        success: true,
        user: {
          uuid: user.uuid,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
        player: {
          uuid: player.uuid,
          nickName: player.nickName,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  private async validateRequest(request: RegisterUserRequest): Promise<void> {
    // Vérifier l'unicité de l'email
    const existingUserByEmail = await this.userRepository.existsByEmail(request.email)
    if (existingUserByEmail) {
      throw new Error('Email already exists')
    }

    // Vérifier l'unicité du username
    const existingUserByUsername = await this.userRepository.existsByUsername(request.username)
    if (existingUserByUsername) {
      throw new Error('Username already exists')
    }

    // Vérifier l'unicité du nickname si fourni
    if (request.nickName) {
      const existingPlayerByNickName = await this.playerRepository.existsByNickName(
        request.nickName
      )
      if (existingPlayerByNickName) {
        throw new Error('Nickname already exists')
      }
    } else {
      // Si pas de nickname fourni, utiliser le username, vérifier qu'il n'existe pas comme nickname
      const existingPlayerByNickName = await this.playerRepository.existsByNickName(
        request.username
      )
      if (existingPlayerByNickName) {
        throw new Error('Username already exists as nickname')
      }
    }
  }
}
