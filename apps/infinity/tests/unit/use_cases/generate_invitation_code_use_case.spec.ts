import { test } from '@japa/runner'
import { Result } from '#shared/result'
import { GenerateInvitationCodeUseCase } from '#application/use_cases/generate_invitation_code_use_case'
import type {
  GenerateInvitationCodeRequest,
  GenerateInvitationCodeResponse,
  InvitationRepository,
} from '#application/repositories/invitation_repository'

test.group('GenerateInvitationCodeUseCase', () => {
  test('fails when the issuer has reached the configured active invitation quota', async ({
    assert,
  }) => {
    const invitationRepository: InvitationRepository = {
      validateCode: async () => Result.fail('not implemented'),
      registerUserWithInvitation: async () => Result.fail('not implemented'),
      generateCode: async () => Result.fail('should not be called'),
      listByIssuerUserUuid: async () => [],
      countActiveByIssuerUserUuid: async () => 3,
      revokeByUuid: async () => Result.fail('not implemented'),
    }

    const useCase = new GenerateInvitationCodeUseCase(invitationRepository, 3, 24)
    const result = await useCase.execute({
      issuerUserUuid: 'issuer-uuid',
      restrictedEmail: 'friend@example.com',
    })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Invitation quota exceeded')
  })

  test('normalizes the restricted email and forwards a default expiration date', async ({
    assert,
  }) => {
    let forwardedRequest: GenerateInvitationCodeRequest | null = null

    const invitationRepository: InvitationRepository = {
      validateCode: async () => Result.fail('not implemented'),
      registerUserWithInvitation: async () => Result.fail('not implemented'),
      generateCode: async (request) => {
        forwardedRequest = request

        return Result.ok({
          plainCode: 'ABCD-EFGH-IJKL',
          invitation: {
            uuid: 'invitation-uuid',
            issuerUserUuid: request.issuerUserUuid,
            status: 'active',
            expiresAt: request.expiresAt ?? null,
            maxUses: request.maxUses ?? 1,
            usedCount: 0,
            restrictedEmail: request.restrictedEmail ?? null,
            usedByUserUuid: null,
            usedAt: null,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } satisfies GenerateInvitationCodeResponse)
      },
      listByIssuerUserUuid: async () => [],
      countActiveByIssuerUserUuid: async () => 0,
      revokeByUuid: async () => Result.fail('not implemented'),
    }

    const useCase = new GenerateInvitationCodeUseCase(invitationRepository, 3, 24)
    const beforeExecution = Date.now()
    const result = await useCase.execute({
      issuerUserUuid: 'issuer-uuid',
      restrictedEmail: ' Friend@Example.com ',
    })
    const afterExecution = Date.now()

    assert.isTrue(result.isSuccess)
    assert.exists(forwardedRequest)
    assert.equal(forwardedRequest!.restrictedEmail, 'friend@example.com')
    assert.equal(forwardedRequest!.maxUses, 1)
    assert.exists(forwardedRequest!.expiresAt)

    const lowerBound = beforeExecution + 23 * 60 * 60 * 1000
    const upperBound = afterExecution + 25 * 60 * 60 * 1000

    assert.isAtLeast(forwardedRequest!.expiresAt!.getTime(), lowerBound)
    assert.isAtMost(forwardedRequest!.expiresAt!.getTime(), upperBound)
  })
})
