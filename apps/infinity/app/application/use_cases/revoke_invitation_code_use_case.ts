import type { Result } from '#shared/result'
import {
  type InvitationCodeRecord,
  type InvitationRepository,
} from '#application/repositories/invitation_repository'

export class RevokeInvitationCodeUseCase {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  async execute(
    actorUserUuid: string,
    invitationUuid: string,
    allowAdminOverride = false
  ): Promise<Result<InvitationCodeRecord>> {
    return this.invitationRepository.revokeByUuid(invitationUuid, actorUserUuid, allowAdminOverride)
  }
}
