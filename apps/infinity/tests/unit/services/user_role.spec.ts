import { test } from '@japa/runner'
import {
  USER_ROLES,
  canModerateLobbies,
  hasAnyRole,
  hasRequiredRole,
  normalizeUserRole,
} from '../../../app/domain/value_objects/user_role.js'

test.group('user_role', () => {
  test('normalizeUserRole should fallback to PLAYER for unknown roles', ({ assert }) => {
    assert.equal(normalizeUserRole(undefined), USER_ROLES.PLAYER)
    assert.equal(normalizeUserRole('something-else'), USER_ROLES.PLAYER)
  })

  test('normalizeUserRole should normalize casing', ({ assert }) => {
    assert.equal(normalizeUserRole('admin'), USER_ROLES.ADMIN)
    assert.equal(normalizeUserRole('Moderator'), USER_ROLES.MODERATOR)
  })

  test('hasRequiredRole should enforce hierarchy', ({ assert }) => {
    assert.isTrue(hasRequiredRole(USER_ROLES.ADMIN, USER_ROLES.MODERATOR))
    assert.isTrue(hasRequiredRole(USER_ROLES.MODERATOR, USER_ROLES.PLAYER))
    assert.isFalse(hasRequiredRole(USER_ROLES.PLAYER, USER_ROLES.MODERATOR))
  })

  test('hasAnyRole should match one of allowed roles', ({ assert }) => {
    assert.isTrue(hasAnyRole(USER_ROLES.ADMIN, [USER_ROLES.PLAYER, USER_ROLES.ADMIN]))
    assert.isFalse(hasAnyRole(USER_ROLES.PLAYER, [USER_ROLES.MODERATOR, USER_ROLES.ADMIN]))
  })

  test('canModerateLobbies should allow MODERATOR and ADMIN only', ({ assert }) => {
    assert.isTrue(canModerateLobbies(USER_ROLES.MODERATOR))
    assert.isTrue(canModerateLobbies(USER_ROLES.ADMIN))
    assert.isFalse(canModerateLobbies(USER_ROLES.PLAYER))
  })
})
