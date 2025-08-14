/**
 * Template de test orienté comportement (BDD style)
 * Ce helper permet d'écrire des tests qui suivent le pattern Arrange/Act/Assert (Given/When/Then)
 * et qui se concentrent sur le comportement métier plutôt que sur l'implémentation technique.
 */
import { test as japaTest } from '@japa/runner'
import { Assert } from '@japa/assert'

/**
 * Type pour la fonction de configuration du test
 */
export type SetupFn<TContext> = () => Promise<TContext> | TContext

/**
 * Type pour la fonction d'action du test
 */
export type ActionFn<TContext, TResult> = (context: TContext) => Promise<TResult> | TResult

/**
 * Type pour la fonction d'assertion du test
 */
export type AssertionFn<TContext, TResult> = (
  assert: Assert,
  result: TResult,
  context: TContext
) => Promise<void> | void

/**
 * Crée un test orienté comportement avec les phases Arrange/Act/Assert
 * @param description Description du test en langage métier
 * @param setupFn Fonction de configuration (Given/Arrange)
 * @param actionFn Fonction d'action (When/Act)
 * @param assertionFn Fonction d'assertion (Then/Assert)
 */
export function createBehaviorTest<TContext, TResult>(
  description: string,
  setupFn: SetupFn<TContext>,
  actionFn: ActionFn<TContext, TResult>,
  assertionFn: AssertionFn<TContext, TResult>
): void {
  japaTest(description, async ({ assert }) => {
    // Given / Arrange
    const context = await Promise.resolve(setupFn())
    
    // When / Act
    const result = await Promise.resolve(actionFn(context))
    
    // Then / Assert
    await Promise.resolve(assertionFn(assert, result, context))
  })
}

/**
 * Crée un groupe de tests comportementaux
 * @param groupTitle Titre du groupe de tests
 * @param setupGroupFn Fonction de configuration pour l'ensemble du groupe
 * @param fn Fonction de définition des tests du groupe
 */
export function behaviorTestGroup(
  groupTitle: string, 
  setupGroupFn: () => any, 
  fn: () => void
): void {
  japaTest.group(groupTitle, (group) => {
    // Configuration pour l'ensemble du groupe
    group.each.setup(setupGroupFn)
    
    // Exécuter la fonction de définition des tests
    fn()
  })
}

/**
 * Exemple d'utilisation:
 * 
 * behaviorTestGroup('Document approval workflow', setupDocumentServices, () => {
 *   createBehaviorTest(
 *     'Reviewer should be able to approve document and make it eligible for publication',
 *     // Setup - Given
 *     async () => {
 *       const document = await documentService.createDocument(data, authorId)
 *       await documentService.submitForReview(document.uuid, authorId)
 *       return { document, authorId, reviewerId: 123 }
 *     },
 *     // Action - When
 *     async ({ document, reviewerId }) => {
 *       return await documentService.approveDocument(document.uuid, reviewerId)
 *     },
 *     // Assertion - Then
 *     async (assert, approvedDocument, { authorId }) => {
 *       assertDocumentHasStatus(assert, approvedDocument, 'approved')
 *       const canBePublished = await publicationService.isEligibleForPublication(approvedDocument.uuid)
 *       assert.isTrue(canBePublished)
 *       const notifications = await notificationService.getNotificationsForUser(authorId)
 *       assert.isTrue(
 *         notifications.some(n => n.type === 'document_approved'), 
 *         "L'auteur devrait recevoir une notification d'approbation"
 *       )
 *     }
 *   )
 * })
 */
