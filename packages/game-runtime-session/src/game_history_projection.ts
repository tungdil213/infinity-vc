export type ProjectedGameStatus = 'IN_PROGRESS' | 'PAUSED' | 'ABANDONED' | 'FINISHED' | 'ARCHIVED';

export type ProjectedGameResult = 'win' | 'loss' | 'draw' | 'abandoned';

export interface GameProjectionInput {
	uuid: string;
	status: string;
	players: Array<{ uuid: string }>;
	gameData: unknown;
	startedAt: Date;
	finishedAt?: Date | null;
	durationMs: number;
}

export interface GameHistoryProjection {
	gameUuid: string;
	status: ProjectedGameStatus;
	result: ProjectedGameResult;
	gameType: string;
	playerCount: number;
	winnerUuid: string | null;
	startedAt: Date;
	finishedAt: Date | null;
	durationMs: number;
}

export interface ActiveGameProjection {
	gameUuid: string;
	status: 'IN_PROGRESS' | 'PAUSED';
	gameType: string;
	playerCount: number;
	startedAt: Date;
	durationMs: number;
	lobbyUuid: string | null;
	persistedAt: string | null;
}

export interface GameStatsProjection {
	totalGames: number;
	activeGames: number;
	completedGames: number;
	wins: number;
	losses: number;
	draws: number;
	abandoned: number;
	winRate: number;
	averageDurationMs: number;
	byStatus: Record<string, number>;
}

const ACTIVE_STATUSES = new Set<ProjectedGameStatus>(['IN_PROGRESS', 'PAUSED']);
const COMPLETED_STATUSES = new Set<ProjectedGameStatus>(['FINISHED', 'ABANDONED', 'ARCHIVED']);
const KNOWN_STATUSES = new Set<ProjectedGameStatus>(['IN_PROGRESS', 'PAUSED', 'ABANDONED', 'FINISHED', 'ARCHIVED']);

export function projectGameHistoryItem(game: GameProjectionInput, currentUserUuid: string): GameHistoryProjection {
	const status = normalizeStatus(game.status);
	const winnerUuid = extractWinnerUuid(game.gameData);
	const result =
		status === 'ABANDONED' ? 'abandoned' : winnerUuid === currentUserUuid ? 'win' : winnerUuid ? 'loss' : 'draw';

	return {
		gameUuid: game.uuid,
		status,
		result,
		gameType: extractRuntimeMetadata(game.gameData).gameType,
		playerCount: game.players.length,
		winnerUuid,
		startedAt: game.startedAt,
		finishedAt: game.finishedAt ?? null,
		durationMs: sanitizeDuration(game.durationMs),
	};
}

export function projectActiveGames(games: GameProjectionInput[]): ActiveGameProjection[] {
	return games
		.map((game) => ({ game, status: normalizeStatus(game.status) }))
		.filter((candidate): candidate is { game: GameProjectionInput; status: 'IN_PROGRESS' | 'PAUSED' } =>
			ACTIVE_STATUSES.has(candidate.status)
		)
		.map(({ game, status }) => {
			const runtime = extractRuntimeMetadata(game.gameData);

			return {
				gameUuid: game.uuid,
				status,
				gameType: runtime.gameType,
				playerCount: game.players.length,
				startedAt: game.startedAt,
				durationMs: sanitizeDuration(game.durationMs),
				lobbyUuid: runtime.lobbyUuid,
				persistedAt: runtime.persistedAt,
			};
		})
		.sort((left, right) => toTimestamp(right.startedAt) - toTimestamp(left.startedAt));
}

export function projectGameStats(games: GameProjectionInput[], currentUserUuid: string): GameStatsProjection {
	const normalizedGames = games.map((game) => ({
		...game,
		status: normalizeStatus(game.status),
	}));

	const byStatus = normalizedGames.reduce<Record<string, number>>((accumulator, game) => {
		accumulator[game.status] = (accumulator[game.status] || 0) + 1;
		return accumulator;
	}, {});

	const wins = normalizedGames.filter(
		(game) => game.status === 'FINISHED' && extractWinnerUuid(game.gameData) === currentUserUuid
	).length;
	const losses = normalizedGames.filter((game) => {
		if (game.status !== 'FINISHED') {
			return false;
		}

		const winnerUuid = extractWinnerUuid(game.gameData);
		return typeof winnerUuid === 'string' && winnerUuid !== currentUserUuid;
	}).length;
	const draws = normalizedGames.filter(
		(game) => game.status === 'FINISHED' && extractWinnerUuid(game.gameData) === null
	).length;
	const abandoned = normalizedGames.filter((game) => game.status === 'ABANDONED').length;
	const completed = normalizedGames.filter((game) => COMPLETED_STATUSES.has(game.status)).length;
	const active = normalizedGames.filter((game) => ACTIVE_STATUSES.has(game.status)).length;
	const totalDurationMs = normalizedGames.reduce((sum, game) => sum + sanitizeDuration(game.durationMs), 0);
	const averageDurationMs = normalizedGames.length > 0 ? Math.round(totalDurationMs / normalizedGames.length) : 0;
	const winRate = completed > 0 ? Number((wins / completed).toFixed(3)) : 0;

	return {
		totalGames: normalizedGames.length,
		activeGames: active,
		completedGames: completed,
		wins,
		losses,
		draws,
		abandoned,
		winRate,
		averageDurationMs,
		byStatus,
	};
}

function normalizeStatus(rawStatus: string): ProjectedGameStatus {
	const normalized = rawStatus.trim().toUpperCase();
	if (KNOWN_STATUSES.has(normalized as ProjectedGameStatus)) {
		return normalized as ProjectedGameStatus;
	}

	return 'ARCHIVED';
}

function extractWinnerUuid(gameData: unknown): string | null {
	const payload = asRecord(gameData);
	return typeof payload?.winner === 'string' ? payload.winner : null;
}

function extractRuntimeMetadata(gameData: unknown): {
	gameType: string;
	lobbyUuid: string | null;
	persistedAt: string | null;
} {
	const payload = asRecord(gameData);
	const runtime = asRecord(payload?.runtime);

	return {
		gameType: typeof runtime?.gameType === 'string' ? runtime.gameType : 'unknown',
		lobbyUuid: typeof runtime?.lobbyId === 'string' ? runtime.lobbyId : null,
		persistedAt: typeof runtime?.persistedAt === 'string' ? runtime.persistedAt : null,
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	return value as Record<string, unknown>;
}

function sanitizeDuration(rawDuration: number): number {
	if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
		return 0;
	}

	return Math.floor(rawDuration);
}

function toTimestamp(value: Date): number {
	const timestamp = value.getTime();
	if (!Number.isFinite(timestamp)) {
		return 0;
	}

	return timestamp;
}
