import { GenerateInvitationCodeUseCase } from '#application/use_cases/generate_invitation_code_use_case'
import { ListMyInvitationsUseCase } from '#application/use_cases/list_my_invitations_use_case'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import { RegisterWithInvitationUseCase } from '#application/use_cases/register_with_invitation_use_case'
import { RevokeInvitationCodeUseCase } from '#application/use_cases/revoke_invitation_code_use_case'
import { ValidateInvitationCodeUseCase } from '#application/use_cases/validate_invitation_code_use_case'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import env from '#start/env'
import type { BindingRegistrar } from './binding_contracts.js'

export type { BindingRegistrar, BindingResolver } from './binding_contracts.js'

export function registerAuthOnboardingBindings(registrar: BindingRegistrar): void {
  registrar.singleton(RegisterUserUseCase, async (resolver) => {
    const userRepository = await resolver.make(DatabaseUserRepository)
    const playerRepository = await resolver.make(DatabasePlayerRepository)
    return new RegisterUserUseCase(userRepository, playerRepository)
  })

  registrar.singleton(ValidateInvitationCodeUseCase, async (resolver) => {
    const invitationRepository = await resolver.make(DatabaseInvitationRepository)
    return new ValidateInvitationCodeUseCase(invitationRepository)
  })

  registrar.singleton(RegisterWithInvitationUseCase, async (resolver) => {
    const invitationRepository = await resolver.make(DatabaseInvitationRepository)
    return new RegisterWithInvitationUseCase(invitationRepository)
  })

  registrar.singleton(GenerateInvitationCodeUseCase, async (resolver) => {
    const invitationRepository = await resolver.make(DatabaseInvitationRepository)
    return new GenerateInvitationCodeUseCase(
      invitationRepository,
      env.get('INVITATION_CODE_QUOTA_PER_USER') ?? 5,
      env.get('INVITATION_CODE_TTL_HOURS') ?? 168
    )
  })

  registrar.singleton(ListMyInvitationsUseCase, async (resolver) => {
    const invitationRepository = await resolver.make(DatabaseInvitationRepository)
    return new ListMyInvitationsUseCase(invitationRepository)
  })

  registrar.singleton(RevokeInvitationCodeUseCase, async (resolver) => {
    const invitationRepository = await resolver.make(DatabaseInvitationRepository)
    return new RevokeInvitationCodeUseCase(invitationRepository)
  })
}
