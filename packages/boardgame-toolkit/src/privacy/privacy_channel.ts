export interface StateProjectionSet<TPlayerId extends string, TPublicState, TPlayerState> {
	readonly publicState: TPublicState;
	readonly byPlayer: Record<TPlayerId, TPlayerState>;
}

export interface NotificationBundle<TPlayerId extends string, TPublicPayload, TPrivatePayload = TPublicPayload> {
	readonly publicPayload: TPublicPayload;
	readonly privateByPlayer: Partial<Record<TPlayerId, TPrivatePayload>>;
}

export interface StatePrivacyProjector<TState, TPlayerId extends string, TPublicState, TPlayerState> {
	projectPublic(state: TState): TPublicState;
	projectForPlayer(state: TState, playerId: TPlayerId): TPlayerState;
}

export class PrivacyChannel<TPlayerId extends string> {
	private readonly players: TPlayerId[];
	private readonly playerSet: Set<TPlayerId>;

	constructor(players: readonly TPlayerId[]) {
		if (players.length === 0) {
			throw new TypeError('PrivacyChannel requires at least one player');
		}

		this.players = [...players];
		this.playerSet = new Set(players);
	}

	playerIds(): readonly TPlayerId[] {
		return [...this.players];
	}

	projectState<TState, TPublicState, TPlayerState>(
		state: TState,
		projector: StatePrivacyProjector<TState, TPlayerId, TPublicState, TPlayerState>
	): StateProjectionSet<TPlayerId, TPublicState, TPlayerState> {
		const publicState = projector.projectPublic(state);
		const byPlayer = {} as Record<TPlayerId, TPlayerState>;

		for (const playerId of this.players) {
			byPlayer[playerId] = projector.projectForPlayer(state, playerId);
		}

		return {
			publicState,
			byPlayer,
		};
	}

	createNotificationBundle<TPublicPayload, TPrivatePayload = TPublicPayload>(
		publicPayload: TPublicPayload,
		privatePayloadResolver:
			| Partial<Record<TPlayerId, TPrivatePayload>>
			| ((playerId: TPlayerId) => TPrivatePayload | undefined)
	): NotificationBundle<TPlayerId, TPublicPayload, TPrivatePayload> {
		const privateByPlayer = {} as Partial<Record<TPlayerId, TPrivatePayload>>;

		if (typeof privatePayloadResolver === 'function') {
			for (const playerId of this.players) {
				const payload = privatePayloadResolver(playerId);
				if (payload !== undefined) {
					privateByPlayer[playerId] = payload;
				}
			}
		} else {
			for (const [playerId, payload] of Object.entries(privatePayloadResolver) as [TPlayerId, TPrivatePayload][]) {
				this.assertKnownPlayer(playerId);
				privateByPlayer[playerId] = payload;
			}
		}

		return {
			publicPayload,
			privateByPlayer,
		};
	}

	payloadForPlayer<TPublicPayload, TPrivatePayload = TPublicPayload>(
		bundle: NotificationBundle<TPlayerId, TPublicPayload, TPrivatePayload>,
		playerId: TPlayerId
	): TPublicPayload | TPrivatePayload {
		this.assertKnownPlayer(playerId);
		return bundle.privateByPlayer[playerId] ?? bundle.publicPayload;
	}

	payloadsForAllPlayers<TPublicPayload, TPrivatePayload = TPublicPayload>(
		bundle: NotificationBundle<TPlayerId, TPublicPayload, TPrivatePayload>
	): Record<TPlayerId, TPublicPayload | TPrivatePayload> {
		const result = {} as Record<TPlayerId, TPublicPayload | TPrivatePayload>;

		for (const playerId of this.players) {
			result[playerId] = this.payloadForPlayer(bundle, playerId);
		}

		return result;
	}

	private assertKnownPlayer(playerId: TPlayerId): void {
		if (!this.playerSet.has(playerId)) {
			throw new Error(`Unknown player: ${playerId}`);
		}
	}
}
