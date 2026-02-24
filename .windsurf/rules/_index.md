# Windsurf Rules Architecture

## Intent

Séparer clairement:

1. Les **invariants projet** (toujours vrais) dans `.windsurfrules`
2. Les **procédures exécutable** dans `.windsurf/workflows/*.md`
3. La **documentation lisible** des règles dans `.windsurf/rules/*.md`

## Source of truth

- Canonique machine-readable: `/.windsurfrules`
- Canonique process: `/.windsurf/workflows/`
- Canonique explicatif humain: `/.windsurf/rules/`

## Mapping

- Architecture DDD + DI -> `01-architecture-ddd.md`
- Result + BusinessException + Presentation mapping -> `02-result-business-exception.md`
- Scripts, qualité, tests, release -> `03-quality-testing-release.md`

## No-loss policy

- Ne jamais supprimer une règle de `/.windsurfrules` sans la migrer explicitement.
- Si une règle est déplacée vers un workflow, conserver au moins un pointeur dans `/.windsurfrules`.
- En cas de divergence: `/.windsurfrules` gagne, puis corriger workflows/docs.
