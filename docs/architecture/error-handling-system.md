# Système de Gestion d'Erreur Avancée

## Vue d'ensemble

Le système de gestion d'erreur avancée d'Infinity implémente une approche sécurisée et structurée pour la gestion des erreurs avec classification de sécurité, toasts automatiques et préparation pour l'intégration Sentry.

## Architecture

### Classification des Erreurs

```typescript
enum ErrorClassification {
  USER_SAFE = 'user_safe',    // Messages affichables à l'utilisateur
  INTERNAL = 'internal',      // Erreurs techniques (logs uniquement)
  SECURITY = 'security',      // Erreurs sensibles (logs sécurisés)
}
```

### Composants Principaux

1. **BusinessException** : Exception de base avec métadonnées de sécurité
2. **Auth Exceptions** : Exceptions spécifiques à l'authentification
3. **HttpExceptionHandler** : Handler amélioré avec toasts automatiques
4. **ToastHandler** : Composant React pour l'affichage automatique des toasts

## Utilisation

### Créer une Exception Métier

```typescript
import BusinessException from '#exceptions/business_exception'
import { ErrorClassification, ErrorSeverity, ToastType } from '#exceptions/types/error_classification'

export class CustomException extends BusinessException {
  constructor(technicalMessage: string, context?: Record<string, any>) {
    super(technicalMessage, {
      status: 422,
      code: 'E_CUSTOM_ERROR',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Une erreur est survenue. Veuillez réessayer.',
      toastType: ToastType.ERROR,
      context,
      tags: ['custom', 'business'],
      reportToSentry: true,
    })
  }
}
```

### Dans un Use Case

```typescript
// Lancer une exception avec gestion automatique
throw new EmailAlreadyExistsException(email)

// L'exception sera automatiquement :
// 1. Loggée avec le niveau approprié
// 2. Convertie en toast pour l'utilisateur
// 3. Préparée pour Sentry (si activé)
```

### Dans un Contrôleur

```typescript
// Les BusinessException sont gérées automatiquement
// Pas besoin de try/catch spécifique
async store({ request, response }: HttpContext) {
  const data = request.all()
  await this.registerUserUseCase.execute(data)
  
  // Si exception : toast automatique + redirection
  // Si succès : continuer normalement
  return response.redirect('/dashboard')
}
```

## Sécurité

### Messages Utilisateur vs Logs

- **Messages utilisateur** : Génériques et sécurisés
- **Logs techniques** : Détaillés pour le debug
- **Classification SECURITY** : Évite l'énumération d'utilisateurs

### Exemple : Gestion Email Existant

```typescript
// ❌ Ancien système (vulnérable)
if (emailExists) {
  throw new Error('Email already exists') // Révèle l'existence
}

// ✅ Nouveau système (sécurisé)
if (emailExists) {
  throw new EmailAlreadyExistsException(email)
  // User message: "An account with this information already exists"
  // Log: "Email already exists: user@example.com"
}
```

## Configuration Inertia

Les toasts sont automatiquement partagés via la configuration Inertia :

```typescript
sharedData: {
  toast: (ctx) => ctx.inertia.always(() => ({
    success: ctx.session?.flashMessages.get('success'),
    error: ctx.session?.flashMessages.get('error'),
    warning: ctx.session?.flashMessages.get('warning'),
    info: ctx.session?.flashMessages.get('info'),
  })),
}
```

## Intégration Sentry (Future)

Le système est préparé pour Sentry avec :

- Métadonnées structurées
- Tags pour la catégorisation
- Contexte utilisateur
- Niveaux de sévérité mappés

```typescript
// TODO: Activer quand Sentry est configuré
// Sentry.captureException(error, {
//   tags: this.metadata.tags,
//   extra: this.metadata.context,
//   user: { id: ctx.auth.user?.id },
//   level: this.getSentryLevel(),
// })
```

## Avantages

1. **Sécurité** : Messages génériques pour l'utilisateur, logs détaillés pour les développeurs
2. **UX** : Toasts automatiques sans code supplémentaire
3. **Monitoring** : Préparation Sentry avec métadonnées structurées
4. **Maintenabilité** : Gestion centralisée des erreurs
5. **Debugging** : Logs structurés avec contexte complet

## Migration

Pour migrer du système existant :

1. Remplacer `throw new Error()` par les exceptions métier appropriées
2. Supprimer les `try/catch` manuels dans les contrôleurs
3. Les toasts seront automatiquement gérés par le nouveau système
