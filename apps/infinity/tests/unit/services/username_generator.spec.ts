import { test } from '@japa/runner'
import { generateUsernameFromEmail } from '#application/services/username_generator'

test.group('generateUsernameFromEmail', () => {
  test('sanitizes dotted local-parts without rejecting valid emails', ({ assert }) => {
    const username = generateUsernameFromEmail('john.doe@example.com')

    assert.equal(username, 'john_doe')
  })

  test('normalizes casing and strips unsupported characters', ({ assert }) => {
    const username = generateUsernameFromEmail('  Jane+Sales.Team@Example.com ')

    assert.equal(username, 'jane_sales_team')
  })

  test('falls back to generated username when local-part is too short', ({ assert }) => {
    const username = generateUsernameFromEmail('ab@example.com')

    assert.match(username, /^user_[a-z0-9]{16}$/)
  })
})

