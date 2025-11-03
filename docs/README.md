# 📚 Documentation Infinity

Documentation complète du projet Infinity - Plateforme de jeux multijoueurs production-ready.

---

## 📖 Index de Navigation

Consultez **[INDEX.md](./INDEX.md)** pour l'index complet de la documentation.

---

## 🚀 Démarrage Rapide

### Pour commencer
1. **[Installation (5 min)](./GETTING_STARTED.md)** - Setup complet du projet
2. **[Vue d'ensemble](../README.md)** - Features et architecture
3. **[Créer votre premier jeu](./guides/creating-a-game.md)** - Tutoriel 15 minutes

### Documentation Technique
- **[Référence technique](./TECHNICAL_REFERENCE.md)** - Stack, patterns, conventions
- **[Architecture](./architecture/overview.md)** - Vue d'ensemble système
- **[Changelog](../CHANGELOG.md)** - Historique des modifications

---

## 📂 Structure de la Documentation

```
docs/
├── INDEX.md                    # Index complet (COMMENCEZ ICI)
├── GETTING_STARTED.md          # Guide installation 5 min
├── TECHNICAL_REFERENCE.md      # Référence technique complète
│
├── architecture/               # Architecture système
│   ├── overview.md             # Vue d'ensemble
│   ├── event-driven-architecture.md
│   └── error-handling-system.md
│
├── guides/                     # Guides pratiques
│   ├── creating-a-game.md      # Créer un jeu (15 min)
│   └── infinity-app.md         # Guide application
│
└── specification/              # Specs métier
    └── Infinity-Gauntlet-Rulebook.pdf
```

---

## 🎯 Documentation par Profil

### 👨‍💻 Développeur Backend
- [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md) - Stack & patterns
- [architecture/overview.md](./architecture/overview.md) - Architecture DDD
- [guides/creating-a-game.md](./guides/creating-a-game.md) - Plugin système

### 👩‍💻 Développeur Frontend
- [guides/infinity-app.md](./guides/infinity-app.md) - Application React
- [architecture/overview.md](./architecture/overview.md) - Frontend architecture
- Storybook → `apps/docs/` (design system)

### 🔧 DevOps
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup infrastructure
- [../README.md#infrastructure](../README.md) - Docker + Health checks
- [TECHNICAL_REFERENCE.md#déploiement](./TECHNICAL_REFERENCE.md) - Production deploy

### 📊 Product Owner
- [../README.md](../README.md) - Vue d'ensemble + roadmap
- [../FINAL_SUMMARY.md](../FINAL_SUMMARY.md) - Status production (82/100)
- [../CHANGELOG.md](../CHANGELOG.md) - Historique features

---

## ✨ Highlights

### 🔒 Production-Ready
- **Score : 82/100** après audit complet
- Logger Pino + Sentry error tracking
- Redis cache + PostgreSQL
- Health checks K8s-ready
- CI/CD pipeline complet

### 🏗️ Architecture Moderne
- **Domain-Driven Design (DDD)**
- **Event-Driven Architecture**
- **Result<T> Pattern**
- **Hybrid Inertia + Transmit**

### 🎮 Système de Plugins
- Interface `GamePlugin<TState, TAction>` standardisée
- Exemple Tic-Tac-Toe complet
- Créer un jeu en 15 minutes
- Chargement dynamique

---

## 📚 Ressources Externes

### Frameworks & Librairies
- [AdonisJS 6](https://docs.adonisjs.com/) - Backend framework
- [React 19](https://react.dev/) - Frontend library
- [Inertia.js](https://inertiajs.com/) - Modern monolith stack
- [Transmit](https://docs.adonisjs.com/guides/transmit) - WebSocket SSE
- [Shadcn UI](https://ui.shadcn.com/) - Component library
- [TailwindCSS](https://tailwindcss.com/) - Utility CSS

### Infrastructure
- [Pino](https://getpino.io/) - Fast logger
- [Sentry](https://docs.sentry.io/) - Error tracking
- [Redis](https://redis.io/docs/) - Cache & sessions
- [PostgreSQL](https://www.postgresql.org/docs/) - Database
- [Docker](https://docs.docker.com/) - Containerization

### Testing & CI/CD
- [Japa](https://japa.dev/) - Test runner
- [GitHub Actions](https://docs.github.com/actions) - CI/CD

---

## 🎓 Parcours d'Apprentissage Recommandé

### Niveau 1 : Découverte (30 min)
1. Lire [README principal](../README.md)
2. Suivre [GETTING_STARTED.md](./GETTING_STARTED.md)
3. Lancer l'application
4. Créer un lobby de test

### Niveau 2 : Développement (2h)
1. Lire [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md)
2. Étudier l'[architecture](./architecture/overview.md)
3. Suivre [Creating a Game](./guides/creating-a-game.md)
4. Implémenter votre premier jeu !

### Niveau 3 : Maîtrise (1 semaine)
1. Comprendre l'[Event-Driven Architecture](./architecture/event-driven-architecture.md)
2. Maîtriser le [Error Handling System](./architecture/error-handling-system.md)
3. Écrire des tests complets
4. Contribuer au projet

---

## 🔄 Mise à Jour de la Documentation

Cette documentation est **vivante** et évolue avec le projet.

### Dernière mise à jour
**3 novembre 2025** - Version 1.0.0 Production Ready

### Contributions
La documentation accueille vos contributions :
1. Améliorations de clarté
2. Ajout d'exemples
3. Corrections d'erreurs
4. Traductions

Créez une Pull Request avec le tag `documentation`.

---

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/.../issues)
- **Discussions** : [GitHub Discussions](https://github.com/.../discussions)
- **Documentation** : Vous êtes ici ! 📚

---

## 🎯 Objectifs de la Documentation

✅ **Accessible** - Du débutant à l'expert  
✅ **Complète** - Tous les aspects couverts  
✅ **À jour** - Synchronisé avec le code  
✅ **Pratique** - Exemples concrets  
✅ **Partageable** - Production-ready  

---

**🚀 Prêt à commencer ? Consultez l'[INDEX](./INDEX.md) !**
