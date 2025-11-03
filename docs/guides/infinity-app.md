# 🎮 Infinity - Multiplayer Game Boilerplate

> A modern, extensible boilerplate for building real-time multiplayer games with AdonisJS, React, and Transmit.

## ✨ Features

- 🎯 **Modular Event System** - Generic event architecture for any domain (lobby, chat, game)
- 🎮 **Plugin-based Games** - Add new games with a simple plugin interface
- ⚡ **Real-time Updates** - Transmit for instant WebSocket communication
- 🏗️ **DDD Architecture** - Clean, maintainable code structure
- 🎨 **Beautiful UI** - Shadcn components with TailwindCSS
- 📡 **Hybrid Architecture** - Inertia.js SSR + Transmit real-time
- 🧪 **Testing Ready** - Japa test framework configured
- 📚 **Storybook** - Component documentation and development

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Run migrations
cd apps/infinity
node ace migration:run
node ace db:seed

# Start development server
node ace serve --watch
```

Visit `http://localhost:3333`

## 🎮 Create Your First Game

1. **Create a game plugin:**

```typescript
// app/domain/games/plugins/my-game/my_game_plugin.ts
import type { GamePlugin } from '../../base/game_plugin.js'

export class MyGamePlugin implements GamePlugin<MyGameState, MyGameAction> {
  readonly id = 'my-game'
  readonly name = 'My Awesome Game'
  readonly minPlayers = 2
  readonly maxPlayers = 4
  // ... implement required methods
}
```

2. **Register it:**

```typescript
// app/domain/games/index.ts
import { MyGamePlugin } from './plugins/my-game/index.js'

export function initializeGamePlugins(): void {
  const registry = getGamePluginRegistry()
  registry.register(new MyGamePlugin()) // ← Add here
}
```

3. **Done!** Your game is now available in the system.

## 📡 Add a New Event Module

1. **Create events:**

```typescript
// app/domain/events/modules/notification/notification_events.ts
export const NOTIFICATION_EVENT_TYPES = {
  SENT: 'sent',
  READ: 'read',
} as const
```

2. **Create Transmit bridge:**

```typescript
// app/domain/events/modules/notification/notification_transmit_bridge.ts
export class NotificationTransmitBridge extends BaseModuleEventBridge {
  readonly moduleName = 'notification'
  // ... implement
}
```

3. **Register it:**

```typescript
// app/providers/module_event_provider.ts
registry.register(new NotificationTransmitBridge())
```

## 🏗️ Architecture

```
apps/infinity/
├── app/
│   ├── domain/           # Business logic
│   │   ├── events/       # Modular event system
│   │   ├── games/        # Game plugins
│   │   └── entities/     # Domain entities
│   ├── application/      # Use cases
│   ├── infrastructure/   # Technical adapters
│   └── providers/        # Auto-registration
├── tests/                # Japa tests
├── inertia/             # React frontend
└── docs/                # Documentation
```

## 📚 Documentation

- [Architecture Guide](./docs/BOILERPLATE_ARCHITECTURE.md)
- [Real-time System](./docs/implementation/real-time-lobby-architecture.md)
- [Development Rules](./docs/implementation/lobby-development-rules.md)

## 🧪 Testing

```bash
# Run all tests
node ace test

# Run unit tests only
node ace test --suite=unit

# Run functional tests
node ace test --suite=functional
```

## 🎨 Storybook

```bash
cd apps/docs
pnpm storybook
```

Visit `http://localhost:6006`

## 🛠️ Tech Stack

- **Backend:** AdonisJS 6, PostgreSQL, Lucid ORM
- **Frontend:** React, Inertia.js, TailwindCSS
- **Real-time:** Transmit (WebSockets)
- **UI:** Shadcn components
- **Testing:** Japa
- **Monorepo:** pnpm workspaces

## 🎯 Use Cases

- Board games (Chess, Checkers, Go)
- Card games (Poker, Uno, Cards Against Humanity)
- Party games (Trivia, Pictionary)
- Strategy games
- Real-time chat applications
- Collaborative tools

## 🤝 Contributing

Contributions are welcome! This is a boilerplate designed to be extended.

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT - Free for personal and commercial use.

## 🙏 Credits

Built with:
- [AdonisJS](https://adonisjs.com/)
- [Inertia.js](https://inertiajs.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Transmit](https://docs.adonisjs.com/guides/transmit)

---

**Ready to build your next multiplayer game? Let's go! 🚀**
