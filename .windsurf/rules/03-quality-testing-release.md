# Scripts, Quality Gate, Testing & Release

## Scripts prioritaires

- Root:
  - `pnpm build`
  - `pnpm dev`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm docker:up|down|build|run`
  - `pnpm taze`
- App ciblée:
  - `pnpm --filter @infinity/app run dev|build|test`
  - `pnpm --filter @infinity/app run test:unit|test:integration|test:functional`
  - `pnpm --filter @infinity/app exec node ace migration:run`

## Fallbacks monorepo

- Test: `pnpm turbo run test`
- Lint: `pnpm turbo run lint`
- Typecheck: `pnpm turbo run typecheck`
- Build: `pnpm turbo run build`

## Quality gate minimum

1. `pnpm exec prettier . --check`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm turbo run test`

Politique si rouge:

- patch minimal cause racine
- relancer jusqu'au vert

## Testing

- Runner principal app: Adonis/Japa (`node ace test`)
- Dossiers:
  - `apps/infinity/tests/unit`
  - `apps/infinity/tests/integration`
  - `apps/infinity/tests/functional`
- Attendus:
  - couvrir `Result.ok` et `Result.fail`
  - couvrir mapping BusinessException/handler

## Release safety

- Pas de push/tag automatique
- Prérequis:
  - quality gate vert
  - artefacts build vérifiés
  - notes de release
  - plan rollback documenté

## Workflow linkage

- Onboarding: `/bootstrap-dev`
- QA: `/quality-gate` + `/run-tests-and-fix`
- Release: `/release-prep`
- Incident: `/incident-hotfix`
