import type { Result } from '#shared/result'

export type InvitationCodeStatus = 'active' | 'used' | 'expired' | 'revoked'

export interface InvitationCodeRecord {
  uuid: string
  issuerUserUuid: string
  status: InvitationCodeStatus
  expiresAt: Date | null
  maxUses: number
  usedCount: number
  restrictedEmail: string | null
  usedByUserUuid: string | null
  usedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date | null
}

export interface ValidatedInvitationCode {
  normalizedCode: string
  invitation: InvitationCodeRecord
  issuerDisplayName: string | null
}

export interface RegisterWithInvitationRequest {
  fullName: string
  email: string
  password: string
  invitationCode: string
}

export interface RegisterWithInvitationResponse {
  user: {
    uuid: string
    fullName: string
    email: string
    invitedByUserUuid: string
    createdAt: Date
  }
  player: {
    uuid: string
    nickName: string
  }
  inviter: {
    uuid: string
    fullName: string | null
  }
  invitation: {
    uuid: string
    status: InvitationCodeStatus
    usedCount: number
  }
}

export interface GenerateInvitationCodeRequest {
  issuerUserUuid: string
  restrictedEmail?: string | null
  maxUses?: number
  expiresAt?: Date | null
}

export interface GenerateInvitationCodeResponse {
  invitation: InvitationCodeRecord
  plainCode: string
}

export interface InvitationRepository {
  validateCode(invitationCode: string, email?: string): Promise<Result<ValidatedInvitationCode>>
  registerUserWithInvitation(
    request: RegisterWithInvitationRequest
  ): Promise<Result<RegisterWithInvitationResponse>>
  generateCode(
    request: GenerateInvitationCodeRequest
  ): Promise<Result<GenerateInvitationCodeResponse>>
  listByIssuerUserUuid(userUuid: string): Promise<InvitationCodeRecord[]>
  countActiveByIssuerUserUuid(userUuid: string, now?: Date): Promise<number>
  revokeByUuid(
    uuid: string,
    actorUserUuid: string,
    allowAdminOverride?: boolean
  ): Promise<Result<InvitationCodeRecord>>
}
