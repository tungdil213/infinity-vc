import type { Result } from '#shared/result'
import {
  type InvitationRepository,
  type RegisterWithInvitationRequest,
  type RegisterWithInvitationResponse,
} from '#application/repositories/invitation_repository'

export class RegisterWithInvitationUseCase {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  async execute(
    request: RegisterWithInvitationRequest
  ): Promise<Result<RegisterWithInvitationResponse>> {
    return this.invitationRepository.registerUserWithInvitation(request)
  }
}
