# Phase 0 Baseline

Date de capture: 2026-04-11

## Scripts et état réel observé

### Monorepo

- Package manager confirmé: `yarn@1.22.22`
- Orchestration confirmée: `turbo run ...` pour `lint` et `typecheck`

### Commandes exécutées

1. `yarn lint`
   - Statut: en échec
   - Causes observées après correction du chemin du script `packages/ui`:
     - `@infinity.dev/ui`: erreur de chargement de règle ESLint/JSONC sur `packages/ui/package.json`
     - `@infinity.dev/shared-i18n`: exécution en échec à cause d’un grand volume de warnings `prettier` avec `--max-warnings 0`
     - `@infinity.dev/frontend-lobby-realtime`: même symptôme avec un volume important de warnings de formatage

2. `yarn typecheck`
   - Statut: lancement confirmé via `turbo run typecheck`
   - Observation: la commande déclenche aussi des builds intermédiaires de packages, ce qui la rend plus lourde que les typechecks workspace par workspace.

3. `yarn --cwd apps/infinity typecheck`
   - Statut: OK
   - Résultat: `tsc --noEmit` vert sur l’application produit.

4. Tests applicatifs ciblés déjà exécutés avant l’ouverture de cette migration
   - `apps/infinity` unit/integration/functional ciblés sur les flux sociaux récents: verts.

## Checklist de non-régression initiale

- [x] Vérifier les scripts réels racine et workspace
- [x] Capturer un premier état de `lint`
- [x] Capturer un état exploitable de `typecheck` sur l’application principale
- [x] Geler un snapshot test ciblé sur `games_controller`
- [ ] Geler un snapshot test ciblé sur `enhanced_lobbies_controller`
- [ ] Geler un snapshot test ciblé sur `use_game_page_controller` ou ses modules extraits

## Décisions immédiates

- Le faux négatif de chemin dans `packages/ui/package.json` a été corrigé.
- Stabiliser maintenant les blockers lint racine réellement observés (`ui`, `shared-i18n`, `frontend-lobby-realtime`) avant d’utiliser `yarn lint` comme gate globale fiable.
- Continuer la migration sur les zones critiques de `apps/infinity` pendant la stabilisation de la baseline racine.
- Renforcer les tests unitaires autour des responsabilités extraites des contrôleurs critiques.
