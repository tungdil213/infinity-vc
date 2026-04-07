# @infinity.dev/boardgame-toolkit

Boardgame domain toolkit inspired by modern online tabletop engines, focused on deterministic and testable game rules.

## Feature Matrix (Implemented + Tested)

- Randomness
  - Seeded deterministic PRNG (`SeededRandom`)
  - Random int/bool/pick/shuffle helpers
  - Cloneable RNG state
- Dice
  - Standard numeric dice helpers (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`)
  - Custom faces and weighted-style random via shared RNG
  - Dice notation parsing/rolling (`2d6+1`, `d20`, `4d8-2`)
- Cards / Decks
  - Deck creation from templates
  - Standard 52-card deck helper
  - Draw/peek/discard/reshuffle/deal/sort/remove/insert top-bottom
  - Player perspective projections (hidden info per viewer)
  - Audience projection API (`public` / `spectator` / `player`)
  - Built-in policies for Jass-style and Hanabi-style visibility
  - Card sorting helpers (player order, suit/rank, visibility-aware ordering)
  - Snapshot/restore for persistence and replay
- Token Bag
  - Weighted draw by quantity
  - Add/remove/count/snapshot
- Turn Flow
  - Turn order + round tracking
  - Reverse direction
  - Skip-once mechanics
  - Add/remove players during a session
- Simultaneous Play
  - Hidden simultaneous submissions (commit/reveal style round)
  - Lock/reveal/resolve APIs with deterministic ordering
  - Round status projection and snapshot/restore
- Phase Flow
  - Phase graph with allowed transitions
  - Transition history and reset
- Zones / Containers
  - Named zones with optional capacity
  - Add/remove/move/list/search items
  - Zone visibility projections (visible/masked/hidden per viewer)
  - Owned/private zones helper policy
  - Snapshot/restore
- Board / Spatial
  - Grid board with bounds checks
  - Cell set/get/remove/move
  - Orthogonal/diagonal/all neighbor queries
  - Snapshot/restore
- Timing
  - Chess-clock style player timers
  - Start/switch/pause with increment support
  - Timeout (`flag`) detection and snapshot restore
- Drafting
  - Rotating draft (left/right)
  - Round resolution with pending picks
  - Optional alternating direction per round
  - Snapshot/restore
- Objectives / Missions
  - Objective registration
  - Claim limits (global + per player)
  - Objective scoring and leaderboard
  - Snapshot/restore
- Scoring
  - Add/set scores
  - Leaderboard and winner detection
- Resources / Economy
  - Multi-resource balances by player
  - Grant/spend/transfer/affordability checks
- Actions / Commands
  - Action queue with immutable snapshots
  - Undo/redo support
  - Full history tracking
- Privacy / Projection
  - Public vs player-private state projection
  - Per-player notification bundles with private overrides
  - Safe payload routing helpers
- Structured Logs
  - Localized key + params entries
  - Audience-aware visibility filtering (all/targeted/excluded)
  - Versioned log entries (`schemaVersion`)
  - Deterministic stable JSON serialization
  - Viewer-specific rendering helpers
- Rules / Validation
  - Rule engine for command validation (errors/warnings)
  - Reducer application guarded by rule checks
  - Structured violation payloads
- Effects / Resolution
  - Priority + stack-order effect resolver
  - Spawn/chained effects during resolution
  - Loop protection with max-steps guard
- Network / Routes
  - Node/edge graph for roads/routes/connectivity games
  - Claim constraints (distance, adjacency, connected expansion)
  - Longest-route computation and snapshot/restore
- Trade
  - Player-to-player offers (targeted or public)
  - Accept/cancel lifecycle
  - Bank trade ratios (4:1 default, resource overrides)
- Auctions
  - Sealed-bid auction sessions
  - Deterministic tie-breakers (earliest/latest/player order)
  - Audience-safe projections (public/spectator/player)
- Voting
  - Secret/open ballot sessions
  - Weighted votes, revote policy, turnout/tally computation
  - Audience-safe projections + optional ballot reveal on close
- Fog of War
  - Per-player explored/visible memory
  - Public visibility layer for shared information
  - Audience projections without private leak
- Validation DSL
  - Composable validation trees (`all` / `any` / `not` / guarded `rule`)
  - Compilable validators for runtime checks
- Scripted Effects
  - Declarative effect operations with handler registry
  - DSL-gated execution (`when`) with skip reasons
  - Deterministic stack resolution with chained enqueue
- Triggers / Replacement / Prevention
  - Deterministic event pipeline for replacement -> prevention -> trigger effects
  - Priority-based conflict resolution for rules
  - Loop protection on replacement chains
- Replay / Event Sourcing
  - Typed append/filter event log
  - Versioned events (`schemaVersion`) + stable event ids
  - Stable JSON serialization for storage/transport
  - Reducer-based replay from initial state
  - Replay timeline builder (state + logs + highlights + duration)
- Audit Trail
  - Sensitive action auditing (`appendSensitive`)
  - Filtering by actor/action
  - Snapshot/restore and deterministic stable JSON serialization
- Accessibility
  - Normalized accessibility profile (contrast, motion, color vision, text scale)
  - UI hint generation for motion/tap-target/contrast adaptations

## Platform Capability Mapping

This package intentionally covers the engine-side rules toolkit (state, randomness, turns, cards, scoring, logs).

It does not include platform-specific concerns:

- Real-time transport/network synchronization
- 3D rendering/physics
- UI widgets/animations
- Matchmaking and account/session management

These can be built on top using adapters around this package.

## Coverage by Game (Engine Side)

- Hanabi: ready with current primitives (hidden hands, clues/actions, piles, scoring, turn flow).
- Love Letter: ready with current primitives (hidden info, elimination logic, draw/discard/effects).
- Jass-style trick games: mostly ready (hands visibility, turn/phase/score), trick-specific resolver can be added as game module.
- 7 Wonders: close; now covered for drafting + simultaneous reveal + resource/scoring. Still needs game-specific neighbor/effect rules.
- Catan-like: close; now covered for resource economy, trades, route network, turn/phase. Still needs hex-terrain production helpers and setup packs.
- Heat-like: close; now covered for simultaneous programming + resolution pipeline + track/network primitives. Still needs race-specific movement/initiative helpers.
- Arcs-like complex strategy: foundationally possible (effects, rules, hidden info, networks), but still needs bespoke game systems.

## Remaining Generic Gaps (Next Toolkit Layer)

- Hex-tile board utilities (axial coords, rings, terrain production tables).
- Trick-taking toolkit (lead/follow/trump/winner evaluator).
- Advanced interrupt windows and response stacks for highly interactive games.
- Public/private projection for full game state trees (not only hands/zones).

## Quick Start

```ts
import { SeededRandom, rollNotation, Deck, createStandard52Deck } from '@infinity.dev/boardgame-toolkit';

const rng = new SeededRandom('demo-seed');
const roll = rollNotation('2d6+1', rng);

const deck = new Deck(createStandard52Deck(), rng);
const hand = deck.draw(5);
```

## Hidden Information Example (Jass / Hanabi)

```ts
import {
	createOwnerSeesOthersCardsPolicy,
	createOwnerSeesOwnCardsPolicy,
	projectHandsForViewer,
} from '@infinity.dev/boardgame-toolkit';

const jassView = projectHandsForViewer({
	viewerId: 'p1',
	handsByPlayer,
	resolveVisibility: createOwnerSeesOwnCardsPolicy(),
});

const hanabiView = projectHandsForViewer({
	viewerId: 'p1',
	handsByPlayer,
	resolveVisibility: createOwnerSeesOthersCardsPolicy(),
});
```

## Audience Projection Example

```ts
import { projectVisibilityForAudience } from '@infinity.dev/boardgame-toolkit/visibility';

const projected = projectVisibilityForAudience({
	viewer: { kind: 'player', playerId: 'alice' },
	state: {
		handsByPlayer,
		zonesById,
		zoneOwners,
	},
	sort: {
		hands: {
			byPlayerOrder: ['alice', 'bob', 'claire'],
		},
	},
});
```

## Advanced Toolkit Example

```ts
import { SealedAuction } from '@infinity.dev/boardgame-toolkit/auction';
import { VoteSession } from '@infinity.dev/boardgame-toolkit/voting';
import { FogOfWar } from '@infinity.dev/boardgame-toolkit/fog';
import { ScriptedEffectEngine } from '@infinity.dev/boardgame-toolkit/scripting';
import { dslRule } from '@infinity.dev/boardgame-toolkit/validation';
import { EventPipeline } from '@infinity.dev/boardgame-toolkit/triggers';
import { AuditTrail } from '@infinity.dev/boardgame-toolkit/audit';
import { MatchEventLog } from '@infinity.dev/boardgame-toolkit/replay';
```

## Production Wiring (Concise)

1. On every gameplay command, append a structured log entry with audience scope (`all`, `players`, `allExcept`).
2. Emit a versioned replay event (`schemaVersion`) to `MatchEventLog`.
3. For sensitive operations (resume, role change, override), write `appendSensitive` in `AuditTrail`.
4. Persist snapshots (`toSnapshot`) for fast restore, and persist stable JSON (`toStableJson`) for deterministic exports/signing.
5. Use `ReplayTimelineBuilder` in read-side tooling to inspect, step, seek and render playback.
6. Apply `AccessibilityProfile` hints at render time to adapt motion/contrast/text scale safely.

## Test

```bash
yarn workspace @infinity.dev/boardgame-toolkit test
```

## Run Docs Demo

```bash
yarn workspace @infinity.dev/boardgame-toolkit docs:run
```
