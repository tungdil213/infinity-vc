// Value Objects
export { GameState } from './value_objects/game_state.vo.js'
export { GameStatus, GameStatusTransitions } from './value_objects/game_status.vo.js'

// Entities
export { Game } from './entities/game.entity.js'

// Events
export { GameCreatedEvent } from './events/game_created.event.js'
export { GameCompletedEvent } from './events/game_completed.event.js'
export { MovePlayedEvent } from './events/move_played.event.js'

// Plugins
export type { GamePlugin } from './plugins/game_plugin.interface.js'
export { GamePluginRegistry } from './plugins/game_plugin_registry.js'
export { TicTacToePlugin } from './plugins/tic_tac_toe/index.js'

// Repositories
export type { GameRepository } from './repositories/game_repository.interface.js'
