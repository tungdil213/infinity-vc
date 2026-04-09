import React from 'react';
import { Card, CardHeader, CardTitle } from './primitives/card';
import { Button } from './primitives/button';
import { Badge } from './primitives/badge';
import { Users, Play, LogOut, UserPlus, Lock } from 'lucide-react';

export interface LobbyHeaderPanelProps {
	name: string;
	description?: string;
	status: string;
	currentPlayers: number;
	maxPlayers: number;
	isPrivate: boolean;
	hasPassword?: boolean;
	isUserInLobby: boolean;
	canJoinLobby: boolean;
	canStartGame: boolean;
	isJoiningLobby: boolean;
	isStartingGame: boolean;
	isLeavingLobby: boolean;
	onJoinLobby: () => void;
	onStartGame: () => void;
	onLeaveLobby: () => void;
	labels?: Partial<LobbyHeaderPanelLabels>;
	statusLabels?: Partial<Record<string, string>>;
}

interface LobbyHeaderPanelLabels {
	playersSuffix: string;
	privateBadge: string;
	protectedBadge: string;
	joining: string;
	joinLobby: string;
	starting: string;
	startGame: string;
	leaving: string;
	leaveLobby: string;
}

const defaultLabels: LobbyHeaderPanelLabels = {
	playersSuffix: 'players',
	privateBadge: 'Private',
	protectedBadge: 'Protected',
	joining: 'Joining...',
	joinLobby: 'Join Lobby',
	starting: 'Starting...',
	startGame: 'Start Game',
	leaving: 'Leaving...',
	leaveLobby: 'Leave Lobby',
};

export function LobbyHeaderPanel({
	name,
	description,
	status,
	currentPlayers,
	maxPlayers,
	isPrivate,
	hasPassword = false,
	isUserInLobby,
	canJoinLobby,
	canStartGame,
	isJoiningLobby,
	isStartingGame,
	isLeavingLobby,
	onJoinLobby,
	onStartGame,
	onLeaveLobby,
	labels,
	statusLabels,
}: LobbyHeaderPanelProps) {
	const ui = { ...defaultLabels, ...labels };
	const statusClass =
		status === 'READY'
			? 'bg-green-100 text-green-800'
			: status === 'FULL'
				? 'bg-yellow-100 text-yellow-800'
				: status === 'WAITING'
					? 'bg-blue-100 text-blue-800'
					: 'bg-gray-100 text-gray-800';

	return (
		<Card className="mb-6">
			<CardHeader>
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="min-w-0">
						<CardTitle className="truncate text-2xl">{name}</CardTitle>
						{description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
						<div className="mt-2 flex flex-wrap items-center gap-3">
							<Badge className={statusClass}>{statusLabels?.[status] ?? status}</Badge>
							<span className="text-sm text-gray-600 flex items-center gap-1">
								<Users className="w-4 h-4" />
								{currentPlayers}/{maxPlayers} {ui.playersSuffix}
							</span>
							{isPrivate && <Badge variant="secondary">{ui.privateBadge}</Badge>}
							{hasPassword && (
								<Badge variant="secondary">
									<Lock className="w-3 h-3 mr-1" />
									{ui.protectedBadge}
								</Badge>
							)}
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						{canJoinLobby && (
							<Button onClick={onJoinLobby} disabled={isJoiningLobby} className="bg-blue-600 hover:bg-blue-700">
								<UserPlus className="w-4 h-4 mr-2" />
								{isJoiningLobby ? ui.joining : ui.joinLobby}
							</Button>
						)}

						{canStartGame && (
							<Button onClick={onStartGame} disabled={isStartingGame} className="bg-green-600 hover:bg-green-700">
								<Play className="w-4 h-4 mr-2" />
								{isStartingGame ? ui.starting : ui.startGame}
							</Button>
						)}

						{isUserInLobby && (
							<Button onClick={onLeaveLobby} disabled={isLeavingLobby} variant="neutral">
								<LogOut className="w-4 h-4 mr-2" />
								{isLeavingLobby ? ui.leaving : ui.leaveLobby}
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
		</Card>
	);
}
