---
description: Zero-downtime deployment with atomic symlink swap and rollback
---

# Atomic Deploy Workflow

Déploiement zero-downtime avec swap atomique de symlink et rollback instantané.

## Structure

```
apps/infinity/
  releases/
    2026-03-17-150000/
    2026-03-17-160000/
  shared/
    logs/
    uploads/
    tmp/
  current -> releases/2026-03-17-160000
```

## Commandes

### Déploiement complet

```bash
// turbo
yarn deploy
```

Exécute le workflow complet :
1. Crée un dossier `releases/<timestamp>`
2. Copie les sources (sans node_modules/.git)
3. Installe les dépendances
4. Build l'application
5. Vérifie le manifest Vite
6. Link les dossiers partagés
7. Swap atomique du symlink
8. Cleanup des anciennes releases

### Démarrer l'application

```bash
yarn deploy:start
```

### Voir le statut

```bash
// turbo
yarn deploy:status
```

### Lister les releases

```bash
// turbo
yarn deploy:list
```

### Rollback

```bash
yarn deploy:rollback
```

Revient à la release précédente. Penser à restart le serveur après :

```bash
yarn deploy:restart
```

### Cleanup manuel

```bash
// turbo
KEEP_RELEASES=5 yarn deploy:cleanup
```

## Variables d'environnement

| Variable | Default | Description |
|----------|---------|-------------|
| `RELEASE_ID` | `date +%Y-%m-%d-%H%M%S` | Nom de la release |
| `KEEP_RELEASES` | `3` | Nombre de releases à conserver |

## Intégration PM2

Si tu utilises PM2 :

```bash
# Après deploy, reload graceful
pm2 reload infinity

# Après rollback
pm2 reload infinity
```

## Intégration systemd

```bash
# Après deploy
sudo systemctl reload infinity

# Après rollback  
sudo systemctl restart infinity
```

## Notes importantes

### Swap atomique

Le swap utilise `mv -Tf` qui est atomique sur la même partition :

```bash
ln -s "releases/$RELEASE_ID" current.new
mv -Tf current.new current
```

Il n'y a **jamais** de moment où `current` n'existe pas.

### Fichiers partagés

Les dossiers suivants sont symlinkés depuis `shared/` :
- `logs/` - Logs applicatifs
- `uploads/` - Fichiers uploadés
- `tmp/` - Fichiers temporaires

Pour ajouter d'autres dossiers partagés, modifier `cmd_link_shared()` dans `scripts/deploy.sh`.

### Migrations PostgreSQL

Pour du vrai zero-downtime avec migrations :

1. **Expand** : Ajouter colonne nullable
2. **Deploy** : Nouveau code qui utilise la nouvelle colonne
3. **Backfill** : Remplir les données existantes
4. **Contract** : Rendre obligatoire / supprimer l'ancienne

### Rollback

Le rollback ne rollback **pas** les migrations DB. Assure-toi que tes migrations sont backward-compatible.

## Troubleshooting

### "No .env file found"

```bash
cp apps/infinity/.env.example apps/infinity/.env
# Éditer .env avec les bonnes valeurs
```

### "manifest.json not found"

Le build a échoué. Vérifier les logs de build.

### Rollback sans release précédente

```bash
yarn deploy:list  # Voir les releases disponibles
RELEASE_ID=2026-03-17-150000 ./scripts/deploy.sh swap
```
