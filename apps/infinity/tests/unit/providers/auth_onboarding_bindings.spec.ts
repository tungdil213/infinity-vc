import { test } from '@japa/runner'
import { GenerateInvitationCodeUseCase } from '#application/use_cases/generate_invitation_code_use_case'
import { ListMyInvitationsUseCase } from '#application/use_cases/list_my_invitations_use_case'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import { RegisterWithInvitationUseCase } from '#application/use_cases/register_with_invitation_use_case'
import { RevokeInvitationCodeUseCase } from '#application/use_cases/revoke_invitation_code_use_case'
import { ValidateInvitationCodeUseCase } from '#application/use_cases/validate_invitation_code_use_case'
import { DatabaseInvitationRepository } from '#infrastructure/repositories/database_invitation_repository'
import { DatabasePlayerRepository } from '#infrastructure/repositories/database_player_repository'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import { registerAuthOnboardingBindings } from '../../../providers/bindings/auth_onboarding_bindings.js'
import {
  MapBindingResolver,
  RecordingBindingRegistrar,
  type ContainerBinding,
} from './support/binding_test_helpers.js'

test.group('auth_onboarding_bindings', () => {
  test('registers auth onboarding and invitation bindings in dependency order', ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()

    registerAuthOnboardingBindings(registrar)

    assert.deepEqual(
      [...registrar.bindings.keys()],
      [
        RegisterUserUseCase,
        ValidateInvitationCodeUseCase,
        RegisterWithInvitationUseCase,
        GenerateInvitationCodeUseCase,
        ListMyInvitationsUseCase,
        RevokeInvitationCodeUseCase,
      ]
    )
  })

  test('resolves representative auth onboarding bindings with the same dependency graph', async ({
    assert,
  }) => {
    const registrar = new RecordingBindingRegistrar()
    registerAuthOnboardingBindings(registrar)

    const userRepository = new DatabaseUserRepository()
    const playerRepository = new DatabasePlayerRepository()
    const invitationRepository = new DatabaseInvitationRepository()

    const resolver = new MapBindingResolver(
      new Map<ContainerBinding<unknown>, unknown>([
        [DatabaseUserRepository, userRepository],
        [DatabasePlayerRepository, playerRepository],
        [DatabaseInvitationRepository, invitationRepository],
      ])
    )

    const registerUserFactory = registrar.bindings.get(RegisterUserUseCase)
    const validateInvitationFactory = registrar.bindings.get(ValidateInvitationCodeUseCase)
    const generateInvitationFactory = registrar.bindings.get(GenerateInvitationCodeUseCase)
    const revokeInvitationFactory = registrar.bindings.get(RevokeInvitationCodeUseCase)

    assert.exists(registerUserFactory)
    assert.exists(validateInvitationFactory)
    assert.exists(generateInvitationFactory)
    assert.exists(revokeInvitationFactory)

    const registerUserUseCase = await registerUserFactory!(resolver)
    const validateInvitationUseCase = await validateInvitationFactory!(resolver)
    const generateInvitationUseCase = await generateInvitationFactory!(resolver)
    const revokeInvitationUseCase = await revokeInvitationFactory!(resolver)

    assert.instanceOf(registerUserUseCase, RegisterUserUseCase)
    assert.instanceOf(validateInvitationUseCase, ValidateInvitationCodeUseCase)
    assert.instanceOf(generateInvitationUseCase, GenerateInvitationCodeUseCase)
    assert.instanceOf(revokeInvitationUseCase, RevokeInvitationCodeUseCase)
  })
})
