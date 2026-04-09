import type { Result } from '#shared/result'
import {
  type InvitationRepository,
  type ValidatedInvitationCode,
} from '#application/repositories/invitation_repository'

export interface ValidateInvitationCodeRequest {
  invitationCode: string
  email?: string
}

export class ValidateInvitationCodeUseCase {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  async execute(request: ValidateInvitationCodeRequest): Promise<Result<ValidatedInvitationCode>> {
    return this.invitationRepository.validateCode(request.invitationCode, request.email)
  }
}
