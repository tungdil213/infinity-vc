import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { Badge } from './primitives/badge';
import { Users } from 'lucide-react';

export interface LobbyPlayer {
	uuid: string;
	nickName: string;
}

export interface LobbyPlayersPanelProps {
	players: LobbyPlayer[];
	currentUserUuid?: string;
	creatorUuid?: string;
	maxPlayers: number;
	currentPlayers: number;
	hasAvailableSlots: boolean;
	createdAt: string | Date;
	labels?: Partial<LobbyPlayersPanelLabels>;
}

interface LobbyPlayersPanelLabels {
	title: string;
	creatorBadge: string;
	youBadge: string;
	waitingForPlayer: string;
	createdAtPrefix: string;
	openForNewPlayers: string;
	lobbyIsFull: string;
}

const defaultLabels: LobbyPlayersPanelLabels = {
	title: 'Players',
	creatorBadge: 'Creator',
	youBadge: 'You',
	waitingForPlayer: 'Waiting for player...',
	createdAtPrefix: 'Created:',
	openForNewPlayers: 'Open for new players',
	lobbyIsFull: 'Lobby is full',
};

export function LobbyPlayersPanel({
	players,
	currentUserUuid,
	creatorUuid,
	maxPlayers,
	currentPlayers,
	hasAvailableSlots,
	createdAt,
	labels,
}: LobbyPlayersPanelProps) {
	const ui = { ...defaultLabels, ...labels };
	const safePlayers = players || [];
	const createdAtDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="w-5 h-5" />
					{ui.title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{safePlayers.map((player) => (
						<div
							key={player.uuid}
							className={`p-4 rounded-lg border ${
								player.uuid === currentUserUuid ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
							}`}
						>
							<div className="flex items-center justify-between">
								<div>
									<h3 className="break-words font-medium text-gray-900">{player.nickName}</h3>
									<div className="flex items-center gap-2 mt-1">
										{player.uuid === creatorUuid && (
											<Badge variant="neutral" className="text-xs">
												{ui.creatorBadge}
											</Badge>
										)}
										{player.uuid === currentUserUuid && (
											<Badge className="text-xs bg-blue-100 text-blue-800">{ui.youBadge}</Badge>
										)}
									</div>
								</div>

								<div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
									<span className="text-sm font-medium text-gray-700">{player.nickName.charAt(0).toUpperCase()}</span>
								</div>
							</div>
						</div>
					))}

					{Array.from({ length: Math.max(0, maxPlayers - currentPlayers) }).map((_, index) => (
						<div
							key={`empty-${index}`}
							className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
						>
							<span className="text-gray-500 text-sm">{ui.waitingForPlayer}</span>
						</div>
					))}
				</div>

				<div className="mt-6 pt-4 border-t border-gray-200">
					<div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
						<span>
							{ui.createdAtPrefix} {createdAtDate.toLocaleString()}
						</span>
						<span>
							{hasAvailableSlots ? ui.openForNewPlayers : ui.lobbyIsFull}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
