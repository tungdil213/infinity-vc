import { SealedAuction } from '../auction/sealed_auction.js';
import { FogOfWar } from '../fog/fog_of_war.js';
import { ScriptedEffectEngine } from '../scripting/scripted_effect_engine.js';
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

runAuctionDemo();
runVotingDemo();
runFogDemo();
runScriptedEffectsDemo();
