import {
  type InvitationCodeRecord,
  type InvitationRepository,
} from '#application/repositories/invitation_repository'

export interface ListMyInvitationsResponse {
  invitations: InvitationCodeRecord[]
}

export class ListMyInvitationsUseCase {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  async execute(userUuid: string): Promise<ListMyInvitationsResponse> {
    const invitations = await this.invitationRepository.listByIssuerUserUuid(userUuid)

    return { invitations }
  }
}
