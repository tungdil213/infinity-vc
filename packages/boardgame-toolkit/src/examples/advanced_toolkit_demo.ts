import { SealedAuction } from '../auction/sealed_auction.js';
import { AuditTrail } from '../audit/audit_trail.js';
import { FogOfWar } from '../fog/fog_of_war.js';
import { MatchEventLog } from '../replay/event_log.js';
import { VersionedSchemaRegistry } from '../schema/versioned_schema_registry.js';
import { ScriptedEffectEngine } from '../scripting/scripted_effect_engine.js';
import { signStableValue, verifyStableValueSignature } from '../serialization/stable_signature.js';
import { EventPipeline, type PipelineEvent } from '../triggers/event_pipeline.js';
import { dslRule } from '../validation/validation_dsl.js';
import { VoteSession } from '../voting/vote_session.js';

type PlayerId = 'alice' | 'bob' | 'claire';

const print = (title: string, data: unknown): void => {
	process.stdout.write(`\n# ${title}\n${JSON.stringify(data, null, 2)}\n`);
};

const runAuctionDemo = () => {
	const auction = new SealedAuction<PlayerId>({
		id: 'auction-demo',
		allowedBidders: ['alice', 'bob', 'claire'],
		tieBreaker: 'earliest',
	});
	auction.submitBid('alice', 4, 100);
	auction.submitBid('bob', 7, 110);
	auction.submitBid('claire', 7, 105);

	print('Auction open projection (public)', auction.projectForViewer({ kind: 'public' }));
	auction.close(120);
	print('Auction closed projection (public)', auction.projectForViewer({ kind: 'public' }));
};

const runVotingDemo = () => {
	const vote = new VoteSession<PlayerId, 'accept' | 'reject'>({
		id: 'vote-demo',
		optionIds: ['accept', 'reject'],
		allowedVoters: ['alice', 'bob', 'claire'],
		ballotSecret: true,
		revealBallotsOnClose: true,
	});
	vote.castVote('alice', 'accept', 1, 100);
	vote.castVote('bob', 'reject', 1, 110);
	vote.castVote('claire', 'accept', 1, 120);

	print('Vote open projection (spectator)', vote.projectForViewer({ kind: 'spectator' }));
	vote.close(130);
	print('Vote closed projection (spectator)', vote.projectForViewer({ kind: 'spectator' }));
};

const runFogDemo = () => {
	type CellId = 'A1' | 'A2' | 'A3' | 'B1';
	const cells: CellId[] = ['A1', 'A2', 'A3', 'B1'];

	const fog = new FogOfWar<PlayerId, CellId>({
		neighborsByCell: {
			A1: ['A2'],
			A2: ['A1', 'A3'],
			A3: ['A2'],
		},
	});
	fog.revealForPlayer('alice', ['A1'], { neighborsDepth: 1 });
	fog.revealPublic(['B1']);

	print('Fog projection (alice)', fog.projectForAudience({ kind: 'player', playerId: 'alice' }, cells));
	print('Fog projection (public)', fog.projectForAudience({ kind: 'public' }, cells));
};

const runScriptedEffectsDemo = () => {
	interface DemoState {
		readonly energy: number;
	}

	interface DemoContext {
		readonly actorId: string;
	}

	const engine = new ScriptedEffectEngine<DemoState, DemoContext, { readonly type: string }>({
		gain: ({ state, effect }) => {
			const amount = (effect.args?.amount as number | undefined) ?? 0;
			return {
				state: { energy: state.energy + amount },
				events: [{ type: `gain:${amount}` }],
			};
		},
		spend: ({ state, effect }) => {
			const amount = (effect.args?.amount as number | undefined) ?? 0;
			return {
				state: { energy: state.energy - amount },
				events: [{ type: `spend:${amount}` }],
			};
		},
	});

	const result = engine.resolve(
		{ energy: 2 },
		[
			{ id: 'gain-1', op: 'gain', args: { amount: 3 } },
			{
				id: 'spend-5',
				op: 'spend',
				args: { amount: 5 },
				when: dslRule((context: { state: DemoState }) => context.state.energy >= 5, {
					code: 'energy.low',
					message: 'Not enough energy',
				}),
			},
		],
		{ actorId: 'alice' }
	);

	print('Scripted effects result', result);
};

const runTriggerPipelineDemo = () => {
	type DemoEventType = 'damage' | 'damage_blocked' | 'draw_card';

	interface DemoEvent extends PipelineEvent<DemoEventType, Record<string, unknown>> {}

	interface DemoState {
		readonly shieldedPlayerIds: readonly string[];
		readonly handSizeByPlayer: Record<string, number>;
		readonly handLimit: number;
	}

	interface DemoContext {
		readonly round: number;
	}

	interface DemoEffect {
		readonly id: string;
		readonly op: string;
		readonly args?: Record<string, unknown>;
	}

	const pipeline = new EventPipeline<DemoState, DemoContext, DemoEvent, DemoEffect>();

	pipeline.addReplacementRule({
		id: 'replace.damage.with.block',
		eventTypes: ['damage'],
		when: ({ state, event }) => {
			const targetId = event.payload?.targetId;
			return typeof targetId === 'string' && state.shieldedPlayerIds.includes(targetId);
		},
		replace: ({ event }) => [{ type: 'damage_blocked', payload: event.payload }],
	});

	pipeline.addPreventionRule({
		id: 'prevent.draw.hand_full',
		eventTypes: ['draw_card'],
		prevent: ({ state, event }) => {
			const playerId = event.payload?.playerId;
			if (typeof playerId !== 'string') {
				return false;
			}

			return (state.handSizeByPlayer[playerId] ?? 0) >= state.handLimit;
		},
		reason: 'hand_limit_reached',
	});

	pipeline.addTriggerRule({
		id: 'trigger.blocked.energy',
		eventTypes: ['damage_blocked'],
		produceEffects: ({ event }) => [
			{
				id: `fx:${event.type}`,
				op: 'gain_energy',
				args: { amount: 1 },
			},
		],
	});

	const damageResult = pipeline.process(
		{ type: 'damage', payload: { targetId: 'alice', amount: 2 } },
		{
			shieldedPlayerIds: ['alice'],
			handSizeByPlayer: { alice: 2 },
			handLimit: 5,
		},
		{ round: 1 }
	);

	const drawResult = pipeline.process(
		{ type: 'draw_card', payload: { playerId: 'alice' } },
		{
			shieldedPlayerIds: ['alice'],
			handSizeByPlayer: { alice: 5 },
			handLimit: 5,
		},
		{ round: 1 }
	);

	print('Trigger pipeline result (damage)', damageResult);
	print('Trigger pipeline result (draw)', drawResult);
};

const runAuditAndReplayDemo = () => {
	const audit = new AuditTrail<PlayerId>();
	audit.append({
		action: 'lobby.view',
		actorId: 'alice',
		targetType: 'session',
		targetId: 'session-42',
	});
	audit.appendSensitive({
		action: 'session.resume',
		actorId: 'alice',
		targetType: 'session',
		targetId: 'session-42',
		severity: 'warning',
		metadata: {
			reason: 'manual_reconnect',
		},
	});

	const eventLog = new MatchEventLog();
	eventLog.append({
		type: 'session.resumed',
		actorId: 'alice',
		payload: {
			sessionId: 'session-42',
			by: 'manual_reconnect',
		},
	});

	print('Audit sensitive entries', audit.listSensitive());
	print('Audit stable json', audit.toStableJson());
	print('Replay stable json', eventLog.toStableJson());
};

const runSchemaAndSignatureDemo = () => {
	type DemoType = 'session.resumed';

	const registry = new VersionedSchemaRegistry<DemoType>();
	registry.registerMigration({
		type: 'session.resumed',
		fromVersion: 1,
		toVersion: 2,
		upcast: (payload) => {
			const value = payload as { sessionId: string; by: string };
			return {
				sessionId: value.sessionId,
				reason: value.by,
			};
		},
		downcast: (payload) => {
			const value = payload as { sessionId: string; reason: string };
			return {
				sessionId: value.sessionId,
				by: value.reason,
			};
		},
	});

	const migrated = registry.migrate({
		type: 'session.resumed',
		schemaVersion: 1,
		payload: {
			sessionId: 'session-42',
			by: 'manual_reconnect',
		},
	});

	const signature = signStableValue(migrated.record, 'demo-secret');
	const verified = verifyStableValueSignature(migrated.record, 'demo-secret', signature);

	print('Schema migration result', migrated);
	print('Stable signature', { signature, verified });
};

runAuctionDemo();
runVotingDemo();
runFogDemo();
runScriptedEffectsDemo();
runTriggerPipelineDemo();
runAuditAndReplayDemo();
runSchemaAndSignatureDemo();
