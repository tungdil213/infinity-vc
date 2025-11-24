# 📐 Règles Windsurf pour le Projet Infinity

**À ajouter dans `/

.windsurfrules`**

---

## 🎯 Règles Architecturales Infinity

### 1. Structure des Routes ✅

```yaml
infinity_routes:
  rule: "Un seul fichier de routes actif"
  location: "/start/routes.ts"
  forbidden:
    - "app/routes/web.ts"
    - "app/routes/api_routes.ts"
    - "app/routes/complete_routes.ts"
  
  naming_convention:
    controllers:
      index: "Liste (GET /resource)"
      show: "Détail (GET /resource/:id)"
      store: "Création (POST /resource)"
      update: "Modification (PUT/PATCH /resource/:id)"
      destroy: "Suppression (DELETE /resource/:id)"
    
  checks:
    - "Vérifier qu'aucun fichier de routes n'existe dans app/routes/"
    - "S'assurer que toutes les routes sont dans /start/routes.ts"
    - "Vérifier que les méthodes de contrôleur suivent la convention REST"
    - "Confirmer que les routes GET/POST sont séparées (showCreateForm vs store)"
  
  autofix:
    - "Archiver automatiquement les anciens fichiers de routes dans _archive/"
    - "Migrer les routes manquantes vers /start/routes.ts"
    - "Corriger les noms de méthodes non-conventionnels"
```

---

### 2. Structure des Pages Inertia ✅

```yaml
infinity_pages:
  rule: "Organisation par domaine DDD"
  structure: |
    inertia/pages/
    ├── auth/              (Domaine IAM)
    │   ├── login.tsx
    │   └── register.tsx
    ├── lobbies/          (Domaine Lobby)
    │   ├── index.tsx     → Liste
    │   ├── create.tsx    → Création
    │   ├── show.tsx      → Détail
    │   └── join.tsx      → Action spécifique
    ├── games/            (Domaine Game Engine)
    │   └── show.tsx
    ├── dev/              (Outils développement)
    ├── errors/           (Pages d'erreur)
    ├── home.tsx          (Pages publiques)
    └── welcome.tsx
  
  naming_convention:
    list: "index.tsx"
    detail: "show.tsx"
    create: "create.tsx"
    edit: "edit.tsx"
    custom_action: "{action_name}.tsx"
  
  forbidden:
    - "Pages de domaine à la racine (sauf home/welcome)"
    - "Dossiers vides"
    - "Noms avec tirets (create-lobby.tsx)"
    - "Noms avec underscores (transmit_debug.tsx)"
    - "Pages dupliquées"
  
  checks:
    - "Vérifier qu'aucune page {domaine}* n'est à la racine"
    - "S'assurer que chaque dossier de domaine contient au moins 1 fichier"
    - "Confirmer que les noms suivent la convention"
    - "Vérifier qu'il n'y a pas de doublons"
  
  autofix:
    - "Déplacer automatiquement les pages vers leur dossier de domaine"
    - "Renommer les fichiers selon la convention"
    - "Supprimer les dossiers vides"
    - "Mettre à jour les imports relatifs après déplacement"
```

---

### 3. Structure des Composants ⏳

```yaml
infinity_components:
  rule: "Séparation claire entre composants réutilisables et spécifiques"
  
  packages_ui: |
    Composants RÉUTILISABLES (multi-apps)
    packages/ui/src/components/
    ├── primitives/        → Shadcn/UI components
    ├── header.tsx         → Header réutilisable
    ├── footer.tsx         → Footer réutilisable
    ├── lobby-card.tsx     → Card de lobby générique
    └── player-avatar.tsx  → Avatar de joueur générique
  
  apps_components: |
    Composants SPÉCIFIQUES (app Infinity uniquement)
    apps/infinity/inertia/components/
    ├── layout.tsx         → Layout spécifique Infinity
    ├── HeaderWrapper.tsx  → Wrapper avec logique métier Infinity
    ├── GameLobby.tsx      → Composant de jeu spécifique
    └── toast_handler.tsx  → Handler de toasts spécifique
  
  migration_criteria:
    to_packages_ui:
      - "Composant utilisable dans plusieurs apps"
      - "Pas de logique métier spécifique"
      - "Props génériques et flexibles"
      - "Documenté dans Storybook"
    
    stay_in_app:
      - "Logique métier spécifique à Infinity"
      - "Utilise des hooks/contexts spécifiques"
      - "Appelle des services applicatifs"
      - "Dépend de la structure de données Infinity"
  
  checks:
    - "Vérifier que packages/ui n'importe rien de apps/"
    - "S'assurer qu'il n'y a pas de doublons (LobbyList vs lobby-list)"
    - "Confirmer que chaque composant UI a une story dans apps/docs"
    - "Vérifier que les composants spécifiques ne sont pas dans packages/ui"
  
  autofix:
    - "Déplacer les composants réutilisables vers packages/ui/"
    - "Supprimer les doublons (garder la version dans packages/ui)"
    - "Créer automatiquement une story pour les nouveaux composants UI"
    - "Bloquer les imports de apps/ dans packages/ui"
```

---

### 4. Contrôleurs Inertia ✅

```yaml
infinity_controllers:
  rule: "Les contrôleurs rendent les bonnes pages avec les bons chemins"
  
  convention:
    render_path: "Utiliser le chemin relatif au dossier pages/"
    examples:
      - "inertia.render('lobbies/index')   // pages/lobbies/index.tsx"
      - "inertia.render('lobbies/create')  // pages/lobbies/create.tsx"
      - "inertia.render('games/show')      // pages/games/show.tsx"
  
  checks:
    - "Vérifier que chaque inertia.render() pointe vers un fichier existant"
    - "S'assurer que les chemins sont relatifs à pages/"
    - "Confirmer qu'il n'y a pas de chemins obsolètes (lobbies vs lobbies/index)"
    - "Vérifier que les props passées correspondent aux interfaces TypeScript"
  
  autofix:
    - "Mettre à jour automatiquement les chemins après migration de pages"
    - "Ajouter les props manquantes dans les interfaces TypeScript"
    - "Corriger les chemins obsolètes"
```

---

### 5. Repository DDD ✅

```yaml
infinity_repositories:
  rule: "Tous les repositories doivent implémenter l'interface complète"
  
  base_interface:
    required_methods:
      - "save(entity: T): Promise<Result<T>>"
      - "findById(id: string): Promise<Result<T | null>>"
      - "delete(id: string): Promise<Result<void>>"
      - "exists(id: string): Promise<boolean>"
  
  checks:
    - "Vérifier que chaque repository implémente toutes les méthodes de l'interface"
    - "S'assurer que les méthodes retournent Result<T> et non des valeurs brutes"
    - "Confirmer que les repositories sont enregistrés dans app_provider.ts"
  
  autofix:
    - "Ajouter les méthodes manquantes avec implémentation de base"
    - "Enregistrer automatiquement dans le container IoC"
    - "Transformer les retours bruts en Result.ok() ou Result.fail()"
```

---

### 6. Commands et Handlers DDD ✅

```yaml
infinity_commands:
  rule: "Les commandes et leurs handlers doivent être cohérents"
  
  checks:
    - "Vérifier que le nombre d'arguments du constructeur correspond aux usages"
    - "S'assurer que les types des arguments sont corrects"
    - "Confirmer que le handler utilise EventBus pour les événements domaine"
    - "Vérifier que le handler retourne Result<T>"
  
  autofix:
    - "Corriger automatiquement le nombre d'arguments"
    - "Ajouter les imports manquants"
    - "Transformer les retours en Result<T>"
```

---

### 7. Événements Domain ✅

```yaml
infinity_events:
  rule: "Convention de nommage stricte des événements"
  
  naming_convention:
    format: "{domain}.{entity}.{action}"
    examples:
      - "iam.user.logged.in"
      - "lobby.lobby.created"
      - "game.game.started"
  
  registry:
    location: "domains/{domain}/infrastructure/events/{domain}.event_registry.ts"
    naming: "{Domain}EventRegistry"
    
  checks:
    - "Vérifier que les événements suivent la convention de nommage"
    - "S'assurer que les registries sont importés dans module_event_provider.ts"
    - "Confirmer que domainName correspond au préfixe des événements"
  
  autofix:
    - "Renommer automatiquement les événements non-conformes"
    - "Corriger le domainName dans les registries"
    - "Ajouter les registries manquants dans module_event_provider.ts"
```

---

### 8. Authentification et Sécurité ✅

```yaml
infinity_auth:
  rule: "Gestion sécurisée de l'authentification"
  
  password_hashing:
    - "Ne JAMAIS hasher le password dans le seeder"
    - "Laisser le hook @beforeSave() du modèle gérer le hash"
    - "Passer le password en clair au seeder"
  
  auth_login:
    - "auth.login() attend un modèle Lucid, pas une entité DDD"
    - "Récupérer le modèle Lucid après authentification DDD réussie"
  
  shared_data:
    - "Toujours partager les données utilisateur via inertia sharedData"
    - "Ne jamais passer user en prop explicite si déjà dans sharedData"
  
  checks:
    - "Vérifier que les seeders passent des passwords en clair"
    - "S'assurer que auth.login() reçoit un modèle Lucid"
    - "Confirmer que user est dans sharedData (config/inertia.ts)"
  
  autofix:
    - "Supprimer les hash.make() dans les seeders"
    - "Ajouter la récupération du modèle Lucid après auth DDD"
    - "Ajouter user dans sharedData si absent"
```

---

### 9. Documentation et Tests ⏳

```yaml
infinity_documentation:
  rule: "Chaque changement majeur doit être documenté"
  
  required_docs:
    migrations: "docs/migrations/{FEATURE}_MIGRATION.md"
    corrections: "docs/corrections/{PROBLEM}_FIX.md"
    architecture: "docs/architecture/{CONCEPT}_STRATEGY.md"
  
  tests:
    unit: "tests/unit/**/*.spec.ts"
    integration: "tests/integration/**/*.spec.ts"
    
  checks:
    - "Vérifier qu'un fichier .md existe pour chaque changement majeur"
    - "S'assurer que les tests existent pour les nouvelles fonctionnalités"
    - "Confirmer que la documentation est à jour"
  
  autofix:
    - "Créer automatiquement un template de documentation"
    - "Générer des tests de base pour les nouvelles fonctionnalités"
```

---

### 10. Checklist de Validation ✅

```yaml
infinity_validation:
  rule: "Checklist obligatoire avant chaque commit/PR"
  
  after_route_changes:
    - "[ ] Toutes les routes sont dans /start/routes.ts"
    - "[ ] Aucun fichier de routes dans app/routes/"
    - "[ ] Tous les contrôleurs ont les méthodes référencées"
    - "[ ] node ace list:routes affiche toutes les routes"
  
  after_page_changes:
    - "[ ] Toutes les pages sont dans leurs dossiers de domaine"
    - "[ ] Aucun dossier vide"
    - "[ ] Tous les imports relatifs corrects"
    - "[ ] Tous les inertia.render() à jour"
  
  after_component_changes:
    - "[ ] Composants réutilisables dans packages/ui/"
    - "[ ] Composants spécifiques dans apps/infinity/components/"
    - "[ ] Pas de doublons"
    - "[ ] Story Storybook créée (si packages/ui)"
  
  after_ddd_changes:
    - "[ ] Repositories implémentent toutes les méthodes"
    - "[ ] Repositories enregistrés dans app_provider.ts"
    - "[ ] Commands ont le bon nombre d'arguments"
    - "[ ] Handlers retournent Result<T>"
    - "[ ] Événements suivent la convention de nommage"
```

---

## 🚨 Erreurs Fréquentes à Éviter

### ❌ NE JAMAIS FAIRE

1. **Créer des fichiers de routes multiples**
   ```
   ❌ app/routes/web.ts
   ❌ app/routes/api_routes.ts
   ✅ start/routes.ts (unique)
   ```

2. **Pages de domaine à la racine**
   ```
   ❌ pages/create-lobby.tsx
   ❌ pages/lobby.tsx
   ✅ pages/lobbies/create.tsx
   ✅ pages/lobbies/show.tsx
   ```

3. **Dossiers vides**
   ```
   ❌ pages/lobbies/  (vide)
   ✅ pages/lobbies/  (avec index.tsx, create.tsx, etc.)
   ```

4. **Méthodes non-REST dans contrôleurs**
   ```
   ❌ .create()      → Utiliser .store()
   ❌ .startGame()   → Utiliser .start()
   ✅ .index(), .show(), .store(), .destroy()
   ```

5. **Repository sans toutes les méthodes**
   ```
   ❌ Repository sans exists()
   ✅ Repository implémentant save, findById, delete, exists
   ```

6. **Hasher le password dans le seeder**
   ```
   ❌ password: await hash.make('password')
   ✅ password: 'password'  (le hook le hashera)
   ```

7. **Composants réutilisables dans apps/**
   ```
   ❌ apps/infinity/components/lobby-card.tsx
   ✅ packages/ui/src/components/lobby-card.tsx
   ```

---

## ✅ Règles à Suivre TOUJOURS

1. **Un seul fichier de routes** : `/start/routes.ts`
2. **Pages organisées par domaine** : `pages/{domain}/{action}.tsx`
3. **Composants réutilisables** : `packages/ui/`
4. **Composants spécifiques** : `apps/{app}/components/`
5. **Repositories complets** : Implémenter toutes les méthodes
6. **Événements conventionnés** : `{domain}.{entity}.{action}`
7. **Documentation systématique** : Chaque changement majeur documenté
8. **Tests obligatoires** : Au moins tests unitaires pour use cases

---

## 🎯 Commandes de Validation

```bash
# Vérifier les routes
node ace list:routes

# Vérifier la structure des pages
ls -la inertia/pages/lobbies/
ls -la inertia/pages/games/

# Vérifier les composants
ls -la inertia/components/
ls -la packages/ui/src/components/

# Vérifier qu'aucun fichier de routes obsolète
ls app/routes/*.ts 2>/dev/null && echo "❌ Fichiers obsolètes trouvés" || echo "✅ Aucun fichier obsolète"

# Vérifier qu'aucun dossier vide
find inertia/pages -type d -empty

# Lancer les tests
node ace test
```

---

**Ces règles doivent être intégrées dans le fichier `.windsurfrules` à la racine du projet.**

**Status:** ✅ Documenté, ⏳ À intégrer dans `.windsurfrules`
