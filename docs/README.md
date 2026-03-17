# Documentation - infinity Gauntlet: A Love Letter Game

## Vue d'ensemble

Ce projet implémente une version en ligne du jeu de cartes **Love Letter** avec un thème Marvel **infinity Gauntlet**. Il s'agit d'une application web multijoueur permettant aux joueurs de créer et rejoindre des lobbies pour jouer ensemble.

> **Avertissement** : Il s'agit d'un projet fan‑made non officiel, sans aucune affiliation avec Marvel, les ayants droit du jeu Love Letter ou tout autre détenteur de licence associée.

## Structure de la Documentation

- [Architecture Technique](./architecture.md) - Structure du code et patterns utilisés
- [Système de Lobbies](./lobby-system.md) - Fonctionnement des salles de jeu
- [Gestion des Joueurs](./player-management.md) - Système d'authentification et profils
- [Règles du Jeu](./game-rules.md) - Règles spécifiques à infinity Gauntlet Love Letter
- [API Reference](./api-reference.md) - Documentation des endpoints
- [Guide de Développement](./development-guide.md) - Instructions pour les développeurs

## Technologies Utilisées

- **Backend**: AdonisJS v6+ avec TypeScript
- **Frontend**: React avec Inertia.js et Tailwind CSS
- **Base de données**: PostgreSQL avec Lucid ORM
- **Architecture**: Clean Architecture avec Domain-Driven Design

## Démarrage Rapide

1. **Installation des dépendances**

   ```bash
   yarn install
   ```

2. **Configuration de l'environnement**

   ```bash
   cp .env.example .env
   # Configurer les variables d'environnement
   ```

3. **Migration de la base de données**

   ```bash
   node ace migration:run
   ```

4. **Démarrage du serveur de développement**
   ```bash
   yarn dev
   ```

## Fonctionnalités Principales

### 🎮 Système de Lobbies

- Création et gestion de salles de jeu
- Rejoindre/quitter des lobbies
- États des sessions (OPEN, LOBBY, PARTY, FINISHED, etc.)

### 👥 Gestion des Joueurs

- Authentification utilisateur
- Profils joueurs avec pseudonymes
- Système de sessions multijoueur

### 🃏 Jeu Love Letter infinity Gauntlet

- Adaptation du jeu Love Letter classique
- Thème Marvel avec les Pierres d'Infinité
- Mécaniques de jeu spécifiques (voir règles détaillées)

### 📊 Interface Utilisateur

- Dashboard utilisateur
- Interface de lobby moderne
- Gestion administrative (backoffice)

## Architecture du Projet

```
src/
├── features/              # Domaines métier
│   ├── lobbies/          # Gestion des lobbies
│   ├── players/          # Gestion des joueurs
│   ├── users/            # Authentification
│   ├── dashboard/        # Interface utilisateur
│   └── backoffice/       # Administration
└── infrastructure/       # Couche technique
    ├── database/         # Modèles et migrations
    ├── providers/        # Injection de dépendances
    └── adonis/          # Configuration AdonisJS
```

Chaque feature suit le pattern **Clean Architecture** :

- **Controllers** : Gestion des requêtes HTTP
- **Use Cases** : Logique métier applicative
- **Domain Services** : Logique métier pure
- **Repositories** : Accès aux données

## Contribution

Pour contribuer au projet, consultez le [Guide de Développement](./development-guide.md).
