import { Result } from '#shared/result'
import {
  type GenerateInvitationCodeResponse,
  type InvitationRepository,
} from '#application/repositories/invitation_repository'

export interface GenerateInvitationCodeRequest {
  issuerUserUuid: string
  restrictedEmail?: string
}

export class GenerateInvitationCodeUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly maxActiveInvitationsPerUser: number,
    private readonly defaultInvitationTtlHours: number | null
  ) {}

  async execute(
    request: GenerateInvitationCodeRequest
  ): Promise<Result<GenerateInvitationCodeResponse>> {
    const activeCount = await this.invitationRepository.countActiveByIssuerUserUuid(
      request.issuerUserUuid
    )

    if (activeCount >= this.maxActiveInvitationsPerUser) {
      return Result.fail('Invitation quota exceeded')
    }

    const restrictedEmail = request.restrictedEmail?.trim().toLowerCase() || null
    const expiresAt =
      this.defaultInvitationTtlHours === null
        ? null
        : new Date(Date.now() + this.defaultInvitationTtlHours * 60 * 60 * 1000)

    return this.invitationRepository.generateCode({
      issuerUserUuid: request.issuerUserUuid,
      restrictedEmail,
      maxUses: 1,
      expiresAt,
    })
  }
}
