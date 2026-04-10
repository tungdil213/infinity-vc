import logger from '@adonisjs/core/services/logger';
import {
	createEventBridge,
	type EventBridgeBuilder,
	type IEventBridge,
	type ITranscriptService,
} from '@infinity.dev/transcript/server';
import type { IEvent, IEventBus } from '@infinity.dev/events';

type LobbyPayload = { lobbyUuid?: string };

type LobbyOwnerNotificationPayload = LobbyPayload & { ownerUuid?: string };

type GamePayload = { gameId?: string };

type GameStartedPayload = { gameUuid?: string; gameId?: string } & LobbyPayload;

type FriendPresenceUpdatePayload = { recipientUserUuids?: string[]; presence?: Record<string, unknown> };

const DEFAULT_LOBBY_CHANNEL = 'lobbies';

const lobbyChannels = (payload: LobbyPayload): string[] =>
	payload.lobbyUuid ? [DEFAULT_LOBBY_CHANNEL, `lobbies/${payload.lobbyUuid}`] : [DEFAULT_LOBBY_CHANNEL];

const gameChannels = (payload: GamePayload): string[] => (payload.gameId ? [`games/${payload.gameId}`] : []);

export const registerDefaultInfinityMappings = (builder: EventBridgeBuilder): void => {
	builder
		.map('PlayerJoinedLobby')
		.toChannels((event) => lobbyChannels(event.payload as LobbyPayload))
		.transformWith((event) => ({
			type: 'lobby.player.joined',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('PlayerLeftLobby')
		.toChannels((event) => lobbyChannels(event.payload as LobbyPayload))
		.transformWith((event) => ({
			type: 'lobby.player.left',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('LobbyCreated')
		.toChannel(DEFAULT_LOBBY_CHANNEL)
		.transformWith((event) => ({
			type: 'lobby.created',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('LobbyDeleted')
		.toChannels((event) => lobbyChannels(event.payload as LobbyPayload))
		.transformWith((event) => ({
			type: 'lobby.deleted',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('LobbyModerationClosed')
		.toChannels((event) => {
			const payload = event.payload as LobbyPayload;
			return payload.lobbyUuid
				? [DEFAULT_LOBBY_CHANNEL, `lobbies/${payload.lobbyUuid}`, 'admin/audit']
				: [DEFAULT_LOBBY_CHANNEL, 'admin/audit'];
		})
		.transformWith((event) => ({
			type: 'lobby.moderation.closed',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('LobbyStatusChanged')
		.toChannels((event) => lobbyChannels(event.payload as LobbyPayload))
		.transformWith((event) => ({
			type: 'lobby.status.changed',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('LobbyOwnerLobbyFull')
		.toChannels((event) => {
			const payload = event.payload as LobbyOwnerNotificationPayload;
			return typeof payload.ownerUuid === 'string' && payload.ownerUuid.length > 0
				? [`users/${payload.ownerUuid}`]
				: [];
		})
		.transformWith((event) => ({
			type: 'lobby.owner.full',
			...(event.payload as Record<string, unknown>),
		}))
		.and();

	builder
		.map('FriendPresenceUpdated')
		.toChannels((event) => {
			const payload = event.payload as FriendPresenceUpdatePayload;
			const recipients = Array.isArray(payload.recipientUserUuids)
				? payload.recipientUserUuids.filter((value): value is string => typeof value === 'string' && value.length > 0)
				: [];

			return recipients.map((recipientUserUuid) => `users/${recipientUserUuid}`);
		})
		.transformWith((event) => {
			const payload = event.payload as FriendPresenceUpdatePayload;

			return {
				type: 'social.presence.updated',
				presence: payload.presence ?? null,
			};
		})
		.and();

	builder
		.map('GameStarted')
		.toChannels((event) => {
			const payload = event.payload as GameStartedPayload;
			const gameUuid = payload.gameUuid ?? payload.gameId;
			const channels = [DEFAULT_LOBBY_CHANNEL];
			if (payload.lobbyUuid) channels.push(`lobbies/${payload.lobbyUuid}`);
			if (gameUuid) channels.push(`games/${gameUuid}`);
			return channels;
		})
		.transformWith((event) => {
			const payload = event.payload as Record<string, unknown> & GameStartedPayload;
			const gameUuid = payload.gameUuid ?? payload.gameId;

			return {
				type: 'lobby.game.started',
				...payload,
				...(gameUuid ? { gameUuid } : {}),
			};
		})
		.and();

	builder
		.map('game.started')
		.toChannels((event) => gameChannels(event.payload as GamePayload))
		.and();

	builder
		.map('game.finished')
		.toChannels((event) => gameChannels(event.payload as GamePayload))
		.and();

	builder
		.map('game.card_played')
		.toChannels((event) => gameChannels(event.payload as GamePayload))
		.and();

	builder
		.map('game.player_eliminated')
		.toChannels((event) => gameChannels(event.payload as GamePayload))
		.and();
};

export class EventBridgeService {
	private bridge: IEventBridge | null = null;
	private isInitialized: boolean = false;

	constructor(
		private readonly eventBus: IEventBus,
		private readonly transcriptService: ITranscriptService
	) {}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			logger.debug('[EventBridgeService] Already initialized');
			return;
		}

		await this.transcriptService.initialize();

		const builder = createEventBridge();
		registerDefaultInfinityMappings(builder);

		this.bridge = builder.build(this.eventBus, this.transcriptService);
		this.bridge.start();

		this.isInitialized = true;
		logger.info('[EventBridgeService] Initialized with event mappings');
	}

	addMapping(
		eventType: string,
		getChannels: (event: IEvent) => string[],
		transform?: (event: IEvent) => unknown
	): void {
		if (!this.bridge) {
			logger.warn('[EventBridgeService] Not initialized, cannot add mapping');
			return;
		}

		this.bridge.register({
			eventType,
			getChannels,
			transform,
		});
	}

	removeMapping(eventType: string): void {
		if (!this.bridge) {
			return;
		}

		this.bridge.unregister(eventType);
	}

	getMappings(): Array<{ eventType: string }> {
		if (!this.bridge) {
			return [];
		}

		return this.bridge.getMappings();
	}

	stop(): void {
		if (!this.bridge) {
			return;
		}

		try {
			this.bridge.stop();
		} catch {
			// During short-lived CLI commands (migrations, etc.) we do not want
			// a shutdown error to crash the whole process.
			logger.warn('[EventBridgeService] stop() failed, ignoring during shutdown');
		} finally {
			this.bridge = null;
			this.isInitialized = false;
			logger.info('[EventBridgeService] Stopped');
		}
	}

	restart(): void {
		if (this.bridge) {
			this.bridge.stop();
			this.bridge.start();
			logger.info('[EventBridgeService] Restarted');
		}
	}
}
