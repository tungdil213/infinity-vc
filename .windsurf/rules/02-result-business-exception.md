# Result Pattern & BusinessException Invariants

## Result pattern
- Les use cases retournent `Promise<Result<T>>`
- Utiliser `Result.ok` / `Result.fail` pour les flux métier
- Interdiction d'accéder à `result.value` sans garde `isSuccess`/`isFailure`
- Éviter le `throw` pour le flux métier dans domain/application

## BusinessException
- Référence: `apps/infinity/app/exceptions/business_exception.ts`
- Handler global: `apps/infinity/app/exceptions/handler.ts`
- Métadonnées requises:
  - `classification`
  - `severity`
  - `userMessage`
  - `toastType`
  - `context`
- Classifications:
  - `USER_SAFE`
  - `INTERNAL`
  - `SECURITY`

## Forbidden
- `throw new Error()` dans les chemins métier (domain/application/infrastructure)

## Presentation mapping
- Controller vérifie d'abord `Result`
- Échec -> `BusinessException` (ou réponse sécurisée)
- Succès -> `render` / `redirect` / `json`
- Pour mutation web, utiliser `session.flash('success'|'error', ...)`
