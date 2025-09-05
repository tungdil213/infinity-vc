import User from '../../domain/entities/user.js'
import Player from '../../domain/entities/player.js'
import { UserRepository } from '../repositories/user_repository.js'
import { PlayerRepository } from '../repositories/player_repository.js'
import { Result } from '../../domain/shared/result.js'

export interface RegisterUserRequest {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  nickName?: string
}

export interface RegisterUserResponse {
  user: {
    uuid: string
    firstName: string
    lastName: string
    username: string
    email: string
    avatarUrl?: string
    createdAt: Date
  }
  player: {
    uuid: string
    nickName: string
  }
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly playerRepository: PlayerRepository
  ) {}

  async execute(request: RegisterUserRequest): Promise<Result<RegisterUserResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = await this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail(validationResult.error)
      }

      // Création de l'utilisateur
      const user = User.create({
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        username: request.username.trim(),
        email: request.email.toLowerCase().trim(),
        password: request.password, // Le hachage est fait dans l'entité
      })

      // Création du joueur associé
      const nickName = request.nickName?.trim() || `${request.firstName} ${request.lastName}`
      const player = Player.create({
        userUuid: user.uuid,
        nickName,
      })

      // Sauvegarde en base
      await this.userRepository.save(user)
      await this.playerRepository.save(player)

      return Result.ok({
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
      })
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error.message : 'Registration failed due to an unexpected error'
      )
    }
  }

  private async validateRequest(request: RegisterUserRequest): Promise<Result<void>> {
    // Validation des longueurs des champs
    if (
      !request.username ||
      request.username.trim().length < 3 ||
      request.username.trim().length > 50
    ) {
      return Result.fail('Username must be between 3 and 50 characters')
    }

    if (
      request.nickName &&
      (request.nickName.trim().length < 3 || request.nickName.trim().length > 30)
    ) {
      return Result.fail('Nickname must be between 3 and 30 characters')
    }

    // Vérifier l'unicité de l'email (sécurité : message générique)
    const existingUserByEmail = await this.userRepository.existsByEmail(request.email)
    if (existingUserByEmail) {
      return Result.fail('An account with this information already exists')
    }

    // Vérifier l'unicité du nom d'utilisateur
    const existingUserByUsername = await this.userRepository.existsByUsername(request.username)
    if (existingUserByUsername) {
      return Result.fail('Username is already taken')
    }

    // Vérifier l'unicité du pseudonyme si fourni
    if (request.nickName) {
      const existingPlayerByNickname = await this.playerRepository.existsByNickName(
        request.nickName
      )
      if (existingPlayerByNickname) {
        return Result.fail('Nickname is already taken')
      }
    } else {
      // Vérifier l'unicité du pseudonyme généré automatiquement
      const generatedNickName = `${request.firstName} ${request.lastName}`
      const existingPlayerByGeneratedNickname =
        await this.playerRepository.existsByNickName(generatedNickName)
      if (existingPlayerByGeneratedNickname) {
        return Result.fail('This name combination is already taken as a nickname')
      }
    }

    return Result.ok(undefined)
  }
}
