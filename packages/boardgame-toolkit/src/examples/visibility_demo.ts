import { compareCardsBySuitRank } from '../cards/hand_visibility.js';
import { projectVisibilityForAudience, type AudienceViewer } from '../visibility/audience_projection.js';

interface DemoCard {
	readonly id: string;
	readonly suit: string;
	readonly rank: string;
}

type PlayerId = 'alice' | 'bob' | 'claire';

type ZoneId = 'table' | 'alice_hand' | 'bob_hand' | 'claire_hand';

const demoHands = {
	alice: [
		{ id: 'H-A', suit: 'hearts', rank: 'A' },
		{ id: 'C-7', suit: 'clubs', rank: '7' },
	],
	bob: [
		{ id: 'S-K', suit: 'spades', rank: 'K' },
		{ id: 'D-10', suit: 'diamonds', rank: '10' },
	],
	claire: [
		{ id: 'S-9', suit: 'spades', rank: '9' },
		{ id: 'H-J', suit: 'hearts', rank: 'J' },
	],
} as const satisfies Record<PlayerId, readonly DemoCard[]>;

const demoZones = {
	table: ['public-objective-2', 'public-objective-1'],
	alice_hand: ['alice-back-B', 'alice-back-A'],
	bob_hand: ['bob-back-K', 'bob-back-3'],
	claire_hand: ['claire-back-9', 'claire-back-2'],
} as const satisfies Record<ZoneId, readonly string[]>;

const zoneOwners = {
	alice_hand: 'alice',
	bob_hand: 'bob',
	claire_hand: 'claire',
} as const satisfies Partial<Record<ZoneId, PlayerId>>;

const print = (title: string, data: unknown): void => {
	process.stdout.write(`\n# ${title}\n${JSON.stringify(data, null, 2)}\n`);
};

const project = (viewer: AudienceViewer<PlayerId>) =>
	projectVisibilityForAudience<PlayerId, DemoCard, ZoneId, string, string, string>({
		viewer,
		state: {
			handsByPlayer: demoHands,
			zonesById: demoZones,
			zoneOwners,
		},
		maskCard: ({ ownerId, index }) => `${ownerId}-card-back-${index + 1}`,
		maskZoneItem: ({ zoneId, index }) => `${zoneId}-item-back-${index + 1}`,
		sort: {
			hands: {
				byPlayerOrder: ['alice', 'bob', 'claire'],
				byVisibility: {
					visible: compareCardsBySuitRank,
					masked: compareCardsBySuitRank,
				},
			},
			zones: {
				byZoneOrder: ['table', 'alice_hand', 'bob_hand', 'claire_hand'],
				byVisibility: {
					visible: (left, right) => left.localeCompare(right),
					masked: (left, right) => left.localeCompare(right),
				},
			},
		},
	});

print('Public audience view', project({ kind: 'public' }));
print('Spectator audience view', project({ kind: 'spectator' }));
print('Current player audience view (Alice)', project({ kind: 'player', playerId: 'alice' }));
