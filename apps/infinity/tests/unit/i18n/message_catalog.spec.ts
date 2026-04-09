import { test } from '@japa/runner'
import { deMessages } from '@infinity.dev/shared-i18n/messages/de'
import { enMessages } from '@infinity.dev/shared-i18n/messages/en'
import { frMessages } from '@infinity.dev/shared-i18n/messages/fr'

const getMissingKeys = (reference: Record<string, string>, compared: Record<string, string>) => {
  const referenceKeys = new Set(Object.keys(reference))
  const comparedKeys = new Set(Object.keys(compared))

  return [...referenceKeys].filter((key) => !comparedKeys.has(key))
}

test.group('Shared I18n Message Catalog', () => {
  test('all locale catalogs contain the same keys as english', ({ assert }) => {
    const missingInFrench = getMissingKeys(enMessages, frMessages)
    const missingInGerman = getMissingKeys(enMessages, deMessages)

    assert.deepEqual(
      missingInFrench,
      [],
      `Missing keys in fr catalog: ${missingInFrench.join(', ')}`
    )
    assert.deepEqual(
      missingInGerman,
      [],
      `Missing keys in de catalog: ${missingInGerman.join(', ')}`
    )
  })

  test('critical lobby and auth translation keys exist', ({ assert }) => {
    const criticalKeys = [
      'header.joinDialogTitle',
      'lobbies.pageTitle',
      'lobbyList.filtersTitle',
      'createLobby.heading',
      'joinLobby.invitedTitle',
      'auth.login.title',
      'auth.register.title',
      'welcome.heroTitle',
      'passwordDialog.title',
      'gameLobby.playersTitle',
      'footer.description',
    ]

    for (const key of criticalKeys) {
      assert.isTrue(
        Object.prototype.hasOwnProperty.call(enMessages, key),
        `Missing key in en catalog: ${key}`
      )
      assert.isTrue(
        Object.prototype.hasOwnProperty.call(frMessages, key),
        `Missing key in fr catalog: ${key}`
      )
      assert.isTrue(
        Object.prototype.hasOwnProperty.call(deMessages, key),
        `Missing key in de catalog: ${key}`
      )
    }
  })
})
