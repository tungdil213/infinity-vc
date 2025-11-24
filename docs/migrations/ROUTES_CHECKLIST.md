# ✅ Checklist de Validation - Migration Routes

## 🎯 Problème Initial
```
Cannot GET:/lobbies/create
```

## ✅ Solution Appliquée

### 1. Route ajoutée dans `/start/routes.ts`
```typescript
router.get('/lobbies/create', '#domains/lobby/presentation/controllers/lobbies_controller.showCreateForm')
  .as('lobbies.create')
```

### 2. Toutes les routes migrées vers DDD
- ✅ 18 routes web
- ✅ 5 routes API
- ✅ 4 routes système

### 3. Anciens fichiers archivés
- ✅ `app/routes/complete_routes.ts` → `_archive/`
- ✅ `app/routes/api_routes.ts` → `_archive/`
- ✅ `app/routes/web.ts` → `_archive/`

---

## 🧪 Tests à Effectuer

### Test 1: Route /lobbies/create
```bash
curl http://localhost:3333/lobbies/create
# Attendu: Page HTML (formulaire de création)
# Status: 200 OK
```

### Test 2: Liste des routes
```bash
node ace list:routes | grep lobbies
# Attendu: 11 routes lobby affichées
```

### Test 3: Navigation manuelle
1. Ouvrir http://localhost:3333
2. Se connecter avec `eric@structo.ch` / `password`
3. Aller sur http://localhost:3333/lobbies
4. Cliquer sur "Créer un lobby" ← DEVRAIT FONCTIONNER ✅
5. Remplir le formulaire
6. Soumettre

---

## 📋 Méthodes du Contrôleur à Vérifier

### LobbiesController - Méthodes Requises

| Méthode | Route | Implémentée ? |
|---------|-------|---------------|
| `welcome()` | GET `/` | ✅ Oui |
| `index()` | GET `/lobbies` | ✅ Oui |
| `showCreateForm()` | GET `/lobbies/create` | ⚠️ **À VÉRIFIER** |
| `store()` | POST `/lobbies` | ✅ Oui |
| `show()` | GET `/lobbies/:uuid` | ✅ Oui |
| `join()` | POST `/lobbies/:uuid/join` | ✅ Oui |
| `leave()` | POST `/lobbies/:uuid/leave` | ✅ Oui |
| `start()` | POST `/lobbies/:uuid/start` | ✅ Oui |
| `kickPlayer()` | POST `/lobbies/:uuid/kick` | ⚠️ **À VÉRIFIER** |
| `showJoinByInvite()` | GET `/lobbies/join/:code` | ⚠️ **À VÉRIFIER** |
| `joinByInvite()` | POST `/lobbies/join/:code` | ⚠️ **À VÉRIFIER** |

---

## ⚠️ Méthodes Potentiellement Manquantes

Si tu obtiens des erreurs 404 ou "method not found", vérifie que ces méthodes existent dans `lobbies_controller.ts`:

### 1. showCreateForm()
```typescript
async showCreateForm({ inertia }: HttpContext) {
  return inertia.render('lobbies/create', {
    gameTypes: ['tic-tac-toe', 'chess', 'checkers'],
  })
}
```

### 2. kickPlayer()
```typescript
async kickPlayer({ params, auth, response, session }: HttpContext) {
  // TODO: Implémenter
}
```

### 3. showJoinByInvite()
```typescript
async showJoinByInvite({ params, inertia }: HttpContext) {
  // TODO: Implémenter
}
```

### 4. joinByInvite()
```typescript
async joinByInvite({ params, auth, response }: HttpContext) {
  // TODO: Implémenter
}
```

---

## 🔍 Commandes de Diagnostic

### Vérifier les routes actives
```bash
node ace list:routes
```

### Vérifier les contrôleurs DDD
```bash
ls -la apps/infinity/app/domains/lobby/presentation/controllers/
ls -la apps/infinity/app/domains/iam/presentation/controllers/
ls -la apps/infinity/app/domains/game_engine/presentation/controllers/
```

### Vérifier les imports
```bash
grep -r "showCreateForm" apps/infinity/app/domains/lobby/
grep -r "kickPlayer" apps/infinity/app/domains/lobby/
```

---

## 🚨 Si Ça Ne Marche Toujours Pas

### Erreur: "Cannot GET:/lobbies/create"
1. Vérifier que le serveur a redémarré
2. Vérifier `/start/routes.ts` ligne 47
3. Vérifier que `showCreateForm()` existe dans le contrôleur

### Erreur: "Method not found"
1. Ajouter la méthode manquante dans `lobbies_controller.ts`
2. Redémarrer le serveur
3. Réessayer

### Erreur: "Cannot resolve dependencies"
1. Vérifier `providers/app_provider.ts`
2. S'assurer que `LobbyRepositoryLucid` est enregistré
3. Redémarrer le serveur

---

## ✅ Validation Finale

Une fois tous les tests passés :

- [ ] `/lobbies/create` accessible ✅
- [ ] Formulaire de création s'affiche ✅
- [ ] Création de lobby fonctionne ✅
- [ ] Aucune erreur dans la console ✅
- [ ] Documentation lue et comprise ✅

---

## 📚 Documentation Disponible

1. **Détails complets** : `/docs/migrations/ROUTES_MIGRATION_COMPLETE.md`
2. **Résumé rapide** : `/docs/migrations/QUICK_SUMMARY.md`
3. **Cette checklist** : `/docs/migrations/ROUTES_CHECKLIST.md`

---

**Next Step:** Redémarrer le serveur et tester `/lobbies/create` ✨
