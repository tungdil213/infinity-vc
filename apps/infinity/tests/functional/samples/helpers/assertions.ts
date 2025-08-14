/**
 * Assertions métier pour les tests
 * Ces fonctions permettent de tester les comportements métier attendus
 * sans exposer les détails d'implémentation dans les tests.
 */
import { Assert } from '@japa/assert'

/**
 * Vérifie qu'un dossier existe et a les propriétés attendues
 * @param assert Instance d'assertion Japa
 * @param folder Objet dossier à vérifier
 * @param expectedData Données attendues
 */
export function assertFolderExists(
  assert: Assert,
  folder: any,
  expectedData?: { name?: string; description?: string; circleId?: number | string; userId?: number }
) {
  assert.isNotNull(folder, 'Le dossier devrait exister')
  assert.isDefined(folder.uuid, 'Le dossier devrait avoir un UUID')

  if (expectedData) {
    if (expectedData.name) {
      assert.equal(folder.name, expectedData.name, 'Le nom du dossier devrait correspondre')
    }
    if (expectedData.description) {
      assert.equal(
        folder.description,
        expectedData.description,
        'La description du dossier devrait correspondre'
      )
    }
    if (expectedData.circleId) {
      // Gestion des types string/number pour les IDs
      const folderCircleId = typeof folder.circleId === 'string' ? folder.circleId : folder.circleId.toString()
      const expectedCircleId =
        typeof expectedData.circleId === 'string'
          ? expectedData.circleId
          : expectedData.circleId.toString()
      assert.equal(folderCircleId, expectedCircleId, "L'ID du cercle devrait correspondre")
    }
    if (expectedData.userId) {
      assert.equal(folder.userId, expectedData.userId, "L'ID de l'utilisateur devrait correspondre")
    }
  }
}

/**
 * Vérifie qu'un document a un statut spécifique
 * @param assert Instance d'assertion Japa
 * @param document Document à vérifier
 * @param status Statut attendu
 */
export function assertDocumentHasStatus(assert: Assert, document: any, status: string) {
  assert.isNotNull(document, 'Le document devrait exister')
  assert.isDefined(document.metadata, 'Le document devrait avoir des métadonnées')
  assert.equal(document.metadata.status, status, `Le document devrait avoir le statut ${status}`)
  
  // Vérifier que le statut existe dans l'historique
  assert.isTrue(
    document.metadata.statusHistory &&
    document.metadata.statusHistory.some((entry: any) => entry.status === status),
    `L'historique devrait contenir le statut ${status}`
  )
}

/**
 * Vérifie qu'un utilisateur a le rôle attendu dans un cercle
 * @param assert Instance d'assertion Japa 
 * @param userId ID de l'utilisateur
 * @param roleId ID du rôle
 * @param circleId ID du cercle
 * @param attributions Liste d'attributions à vérifier
 */
export function assertUserHasRoleInCircle(
  assert: Assert,
  userId: number,
  roleId: number,
  circleId: number,
  attributions: any[]
) {
  const userAttribution = attributions.find(
    (attr) => 
      attr.userId === userId && 
      attr.roleId === roleId && 
      attr.circleId === circleId
  )
  
  assert.exists(
    userAttribution,
    `L'utilisateur ${userId} devrait avoir le rôle ${roleId} dans le cercle ${circleId}`
  )
}

/**
 * Vérifie qu'un objet est accessible par un utilisateur
 * @param assert Instance d'assertion Japa
 * @param isAccessible Résultat de la vérification d'accès
 * @param objectType Type d'objet
 * @param userRole Rôle de l'utilisateur
 */
export function assertObjectAccessibility(
  assert: Assert,
  isAccessible: boolean,
  objectType: string,
  userRole: string
) {
  assert.isTrue(
    isAccessible,
    `Un utilisateur avec le rôle ${userRole} devrait pouvoir accéder à l'objet de type ${objectType}`
  )
}
