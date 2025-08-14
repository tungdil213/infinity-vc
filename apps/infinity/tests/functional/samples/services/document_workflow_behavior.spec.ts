/**
 * Test comportemental du workflow de documents
 * Démonstration de l'utilisation du template de test orienté comportement
 */
import { Assert } from '@japa/assert'
import { createBehaviorTest, behaviorTestGroup } from '../helpers/behavior_test_template.js'
import { assertDocumentHasStatus } from '../helpers/assertions.js'
import { test } from '@japa/runner'

// Import des mocks et des services
import { MockStorageService } from '../../mocks/storage_service'
import { MockObjectRepository } from '../../mocks/object_repository'
import { MockDocumentLifecycleService } from '../../mocks/document_lifecycle_service'
import { DateTime } from 'luxon'

// Type pour le contexte partagé
interface TestContext {
  documentService: MockDocumentLifecycleService
  authorId: number
  reviewerId: number
  document?: any
}

// Setup du contexte de test
function setupTestContext(): TestContext {
  const objectRepository = new MockObjectRepository()
  const storageService = new MockStorageService()

  const documentService = new MockDocumentLifecycleService(objectRepository, storageService)

  return {
    documentService,
    authorId: 100,
    reviewerId: 200,
  }
}

// Test de l'ensemble du workflow du document
behaviorTestGroup('Document Workflow', setupTestContext, () => {
  createBehaviorTest<TestContext, any>(
    'Un auteur doit pouvoir créer un document en brouillon',
    // Arrange - Given
    (context) => context,
    // Act - When
    async ({ documentService, authorId }) => {
      const docData = {
        title: 'Test Document',
        content: 'Test content',
        metadata: { department: 'Test Department' },
      }

      return await documentService.createDocument(docData, authorId, 1)
    },
    // Assert - Then
    (assert, document) => {
      assertDocumentHasStatus(assert, document, 'draft')
      assert.equal(document.title, 'Test Document')
    }
  )

  createBehaviorTest<TestContext, any>(
    'Un document en brouillon doit pouvoir être soumis pour révision',
    // Arrange - Given
    async ({ documentService, authorId }) => {
      const document = await documentService.createDocument(
        { title: 'For Review', content: 'Please review this' },
        authorId,
        1
      )

      return { document, documentService, authorId }
    },
    // Act - When
    async ({ document, documentService, authorId }) => {
      return await documentService.submitForReview(document.uuid, authorId)
    },
    // Assert - Then
    (assert, document) => {
      assertDocumentHasStatus(assert, document, 'pending_review')
    }
  )

  createBehaviorTest<TestContext, any>(
    'Un validateur doit pouvoir approuver un document soumis pour révision',
    // Arrange - Given
    async ({ documentService, authorId, reviewerId }) => {
      // Créer un document et le soumettre pour révision
      const document = await documentService.createDocument(
        { title: 'To Approve', content: 'Approve this document' },
        authorId,
        1
      )
      await documentService.submitForReview(document.uuid, authorId)

      return { document, documentService, authorId, reviewerId }
    },
    // Act - When
    async ({ document, documentService, reviewerId }) => {
      return await documentService.approveDocument(document.uuid, reviewerId, 'Looks good!')
    },
    // Assert - Then
    (assert, document) => {
      assertDocumentHasStatus(assert, document, 'approved')

      // Vérification des commentaires
      assert.isTrue(
        document.metadata.statusHistory.some(
          (entry: any) => entry.comment === 'Looks good!' && entry.userId === 200
        ),
        "Le commentaire d'approbation devrait être enregistré dans l'historique"
      )
    }
  )

  createBehaviorTest<TestContext, any>(
    'Un validateur doit pouvoir rejeter un document soumis pour révision',
    // Arrange - Given
    async ({ documentService, authorId, reviewerId }) => {
      // Créer un document et le soumettre pour révision
      const document = await documentService.createDocument(
        { title: 'To Reject', content: 'This document has issues' },
        authorId,
        1
      )
      await documentService.submitForReview(document.uuid, authorId)

      return { document, documentService, authorId, reviewerId }
    },
    // Act - When
    async ({ document, documentService, reviewerId }) => {
      return await documentService.rejectDocument(document.uuid, reviewerId, 'Needs revision')
    },
    // Assert - Then
    (assert, document) => {
      assertDocumentHasStatus(assert, document, 'rejected')

      // Vérifier que le document revient à l'auteur
      assert.isTrue(
        document.metadata.statusHistory.some(
          (entry: any) => entry.status === 'rejected' && entry.userId === 200
        ),
        "Le rejet devrait être enregistré dans l'historique"
      )

      assert.equal(
        document.metadata.statusHistory.find((entry: any) => entry.status === 'rejected').comment,
        'Needs revision',
        'Le commentaire de rejet devrait être enregistré'
      )
    }
  )

  // Test de workflow complet
  createBehaviorTest<TestContext, any>(
    'Un document doit pouvoir suivre le workflow complet: création, révision, approbation et archivage',
    // Arrange - Given
    async ({ documentService, authorId, reviewerId }) => {
      // Création d'un nouveau document
      const document = await documentService.createDocument(
        { title: 'Workflow Document', content: 'Testing the full workflow' },
        authorId,
        1
      )

      return { document, documentService, authorId, reviewerId }
    },
    // Act - When
    async ({ document, documentService, authorId, reviewerId }) => {
      // Exécuter le workflow complet
      await documentService.submitForReview(document.uuid, authorId)
      const approvedDoc = await documentService.approveDocument(document.uuid, reviewerId)
      return await documentService.archiveDocument(approvedDoc.uuid, authorId)
    },
    // Assert - Then
    (assert, document, { documentService }) => {
      // Vérification de l'état final
      assertDocumentHasStatus(assert, document, 'archived')

      // Vérification de l'historique complet
      const history = document.metadata.statusHistory

      // Vérification que toutes les étapes sont présentes dans l'ordre
      const statusOrder = history.map((entry: any) => entry.status)

      assert.deepEqual(
        statusOrder,
        ['draft', 'pending_review', 'approved', 'archived'],
        'Le document doit passer par toutes les étapes du workflow dans le bon ordre'
      )
    }
  )
})

// Pour démontrer la compatibilité avec les tests existants
test.group('Tests traditionnels (pour comparaison)', () => {
  test('Test traditionnel - créer un document', async ({ assert }) => {
    // Setup
    const objectRepository = new MockObjectRepository()
    const storageService = new MockStorageService()
    const documentService = new MockDocumentLifecycleService(objectRepository, storageService)
    const userId = 100

    // Test
    const document = await documentService.createDocument(
      { title: 'Test Document', content: 'Test content' },
      userId,
      1
    )

    // Assertions
    assert.equal(document.title, 'Test Document')
    assert.equal(document.metadata.status, 'draft')
  })
})
