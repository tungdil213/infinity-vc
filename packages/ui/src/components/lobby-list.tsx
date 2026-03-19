import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { Button } from './primitives/button';
import { Input } from './primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/select';
import { Switch } from './primitives/switch';
import { Label } from './primitives/label';
import { Badge } from './primitives/badge';
import { Skeleton } from './primitives/skeleton';
import { LobbyCard, LobbyData } from './lobby-card';
import { Search, Filter, Grid, List, Plus, RefreshCw } from 'lucide-react';

export interface LobbyListProps {
	lobbies: LobbyData[];
	currentUser?: {
		uuid: string;
		nickName: string;
		role?: 'PLAYER' | 'MODERATOR' | 'ADMIN';
	};
	loading?: boolean;
	error?: string;
	total?: number;
	onJoin?: (lobbyUuid: string) => void;
	onLeave?: (lobbyUuid: string) => void;
	onView?: (lobbyUuid: string) => void;
	onShare?: (lobbyUuid: string) => void;
	onStart?: (lobbyUuid: string) => void;
	onClose?: (lobbyUuid: string) => void;
	onKick?: (lobbyUuid: string, playerUuid: string) => void;
	onSettings?: (lobbyUuid: string) => void;
	onCreateLobby?: () => void;
	onRefresh?: () => void;
	onBulkClose?: (lobbyUuids: string[], reason?: string) => Promise<void> | void;
	onFilterChange?: (filters: LobbyFilters) => void;
	className?: string;
}

export interface LobbyFilters {
	search?: string;
	status?: 'all' | 'WAITING' | 'READY' | 'FULL' | 'IN_GAME';
	hasSlots?: boolean;
	isPrivate?: boolean;
	sortBy?: 'name' | 'created' | 'players';
	sortOrder?: 'asc' | 'desc';
}

const lobbyNoun = (count: number) => (count === 1 ? 'lobby' : 'lobbies');

export function LobbyList({
	lobbies,
	currentUser,
	loading = false,
	error,
	total,
	onJoin,
	onLeave,
	onView,
	onShare,
	onStart,
	onClose,
	onKick,
	onSettings,
	onCreateLobby,
	onRefresh,
	onBulkClose,
	onFilterChange,
	className,
}: LobbyListProps) {
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [selectedLobbyUuids, setSelectedLobbyUuids] = useState<string[]>([]);
	const [bulkReason, setBulkReason] = useState('manual moderation cleanup');
	const [isBulkClosing, setIsBulkClosing] = useState(false);
	const [filters, setFilters] = useState<LobbyFilters>({
		search: '',
		status: 'all',
		hasSlots: false,
		isPrivate: false,
		sortBy: 'created',
		sortOrder: 'desc',
	});

	const handleFilterChange = (newFilters: Partial<LobbyFilters>) => {
		const updatedFilters = { ...filters, ...newFilters };
		setFilters(updatedFilters);
		onFilterChange?.(updatedFilters);
	};

	const filteredLobbies = useMemo(
		() =>
			lobbies.filter((lobby) => {
				if (filters.search && !lobby.name.toLowerCase().includes(filters.search.toLowerCase())) {
					return false;
				}
				if (filters.status !== 'all' && lobby.status !== filters.status) {
					return false;
				}
				if (filters.hasSlots && !lobby.hasAvailableSlots) {
					return false;
				}
				if (filters.isPrivate && !lobby.isPrivate && !lobby.hasPassword) {
					return false;
				}
				return true;
			}),
		[lobbies, filters.search, filters.status, filters.hasSlots, filters.isPrivate]
	);

	const sortedLobbies = useMemo(
		() =>
			[...filteredLobbies].sort((a, b) => {
				let aValue: string | number;
				let bValue: string | number;

				switch (filters.sortBy) {
					case 'name':
						aValue = a.name.toLowerCase();
						bValue = b.name.toLowerCase();
						break;
					case 'players':
						aValue = a.currentPlayers;
						bValue = b.currentPlayers;
						break;
					case 'created':
					default:
						aValue = new Date(a.createdAt).getTime();
						bValue = new Date(b.createdAt).getTime();
						break;
				}

				if (filters.sortOrder === 'asc') {
					return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
				}
				return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
			}),
		[filteredLobbies, filters.sortBy, filters.sortOrder]
	);

	const canModerate = currentUser?.role === 'MODERATOR' || currentUser?.role === 'ADMIN';
	const moderationTargets = useMemo(
		() => sortedLobbies.filter((lobby) => lobby.isPrivate || lobby.hasPassword),
		[sortedLobbies]
	);
	const moderationTargetUuidSet = useMemo(
		() => new Set(moderationTargets.map((lobby) => lobby.uuid)),
		[moderationTargets]
	);
	const selectedCount = selectedLobbyUuids.length;

	useEffect(() => {
		setSelectedLobbyUuids((prev) => {
			const next = prev.filter((lobbyUuid) => moderationTargetUuidSet.has(lobbyUuid));
			if (next.length === prev.length && next.every((lobbyUuid, index) => lobbyUuid === prev[index])) {
				return prev;
			}
			return next;
		});
	}, [moderationTargetUuidSet]);

	const applyQuickFilter = (preset: 'all' | 'sensitive' | 'joinable') => {
		if (preset === 'all') {
			handleFilterChange({ status: 'all', hasSlots: false, isPrivate: false });
			return;
		}

		if (preset === 'sensitive') {
			handleFilterChange({ status: 'all', isPrivate: true });
			return;
		}

		handleFilterChange({ status: 'all', hasSlots: true, isPrivate: false });
	};

	const toggleLobbySelection = (lobbyUuid: string, checked: boolean) => {
		setSelectedLobbyUuids((prev) => {
			if (checked) {
				if (prev.includes(lobbyUuid)) {
					return prev;
				}
				return [...prev, lobbyUuid];
			}

			return prev.filter((uuid) => uuid !== lobbyUuid);
		});
	};

	const selectAllModerationTargets = () => {
		setSelectedLobbyUuids(moderationTargets.map((lobby) => lobby.uuid));
	};

	const clearModerationSelection = () => {
		setSelectedLobbyUuids([]);
	};

	const handleBulkCloseSelected = async () => {
		if (!onBulkClose || selectedLobbyUuids.length === 0) {
			return;
		}

		const confirmed = window.confirm(
			`Close ${selectedLobbyUuids.length} selected ${lobbyNoun(selectedLobbyUuids.length)}?`
		);
		if (!confirmed) {
			return;
		}

		setIsBulkClosing(true);
		try {
			await onBulkClose(selectedLobbyUuids, bulkReason.trim() || undefined);
			setSelectedLobbyUuids([]);
		} finally {
			setIsBulkClosing(false);
		}
	};

	if (error) {
		return (
			<Card className={cn('border-red-200', className)}>
				<CardContent className="p-6 text-center">
					<div className="text-red-600 mb-4">
						<h3 className="text-lg font-medium">Loading error</h3>
						<p className="text-sm">{error}</p>
					</div>
					{onRefresh && (
						<Button onClick={onRefresh} variant="neutral">
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry
						</Button>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={cn('space-y-6', className)}>
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-2xl font-bold">Lobbies</h2>
					{total !== undefined && <p className="text-sm text-gray-600">{filteredLobbies.length} of {total} lobbies</p>}
				</div>
				<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
					{onRefresh && (
						<Button variant="neutral" size="sm" onClick={onRefresh} disabled={loading}>
							<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
						</Button>
					)}
					<div className="flex items-center border rounded-md">
						<Button
							variant={viewMode === 'grid' ? 'default' : 'noShadow'}
							size="sm"
							onClick={() => setViewMode('grid')}
							className="rounded-r-none"
						>
							<Grid className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === 'list' ? 'default' : 'noShadow'}
							size="sm"
							onClick={() => setViewMode('list')}
							className="rounded-l-none"
						>
							<List className="h-4 w-4" />
						</Button>
					</div>
					{onCreateLobby && (
						<Button onClick={onCreateLobby} className="w-full sm:w-auto">
							<Plus className="h-4 w-4 mr-2" />
							Create lobby
						</Button>
					)}
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Filter className="h-5 w-5" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Search */}
						<div className="space-y-2">
							<Label htmlFor="search">Search</Label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									id="search"
									placeholder="Lobby name..."
									value={filters.search}
									onChange={(e) => handleFilterChange({ search: e.target.value })}
									className="pl-10"
								/>
							</div>
						</div>

						{/* Status */}
						<div className="space-y-2">
							<Label>Status</Label>
							<Select value={filters.status} onValueChange={(value) => handleFilterChange({ status: value as any })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="WAITING">Waiting</SelectItem>
									<SelectItem value="READY">Ready</SelectItem>
									<SelectItem value="FULL">Full</SelectItem>
									<SelectItem value="IN_GAME">In game</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Sort */}
						<div className="space-y-2">
							<Label>Sort by</Label>
							<Select value={filters.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value as any })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="created">Creation date</SelectItem>
									<SelectItem value="name">Name</SelectItem>
									<SelectItem value="players">Player count</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Switches */}
						<div className="space-y-4">
							<div className="flex items-center space-x-2">
								<Switch
									id="hasSlots"
									checked={filters.hasSlots}
									onCheckedChange={(checked) => handleFilterChange({ hasSlots: checked })}
								/>
								<Label htmlFor="hasSlots" className="text-sm">
									Available slots
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Switch
									id="isPrivate"
									checked={filters.isPrivate}
									onCheckedChange={(checked) => handleFilterChange({ isPrivate: checked })}
								/>
								<Label htmlFor="isPrivate" className="text-sm">
									Private / protected only
								</Label>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Moderation View */}
			{canModerate && (
				<Card className="border-slate-300 bg-slate-50">
					<CardHeader>
						<CardTitle className="flex flex-wrap items-center gap-2 text-lg">
							Moderation View
							<Badge variant="neutral">{moderationTargets.length} private/protected</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="neutral" size="sm" onClick={() => applyQuickFilter('all')}>
								Show all
							</Button>
							<Button variant="neutral" size="sm" onClick={() => applyQuickFilter('sensitive')}>
								Private / Protected
							</Button>
							<Button variant="neutral" size="sm" onClick={() => applyQuickFilter('joinable')}>
								Available slots
							</Button>
						</div>

						<div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">Sensitive lobbies</p>
									<div className="flex items-center gap-2">
										<Button variant="noShadow" size="sm" onClick={selectAllModerationTargets}>
											Select all
										</Button>
										<Button variant="noShadow" size="sm" onClick={clearModerationSelection}>
											Clear
										</Button>
									</div>
								</div>

								<div className="max-h-56 space-y-2 overflow-auto rounded-base border-2 border-slate-200 bg-white p-2">
									{moderationTargets.length === 0 ? (
										<p className="p-2 text-sm text-muted-foreground">
											No private or protected lobbies in current filters.
										</p>
									) : (
										moderationTargets.map((lobby) => {
											const isSelected = selectedLobbyUuids.includes(lobby.uuid);
											return (
												<label
													key={`moderation-target-${lobby.uuid}`}
													className={cn(
														'flex cursor-pointer items-center justify-between rounded-base border px-3 py-2 text-sm',
														isSelected
															? 'border-slate-400 bg-slate-100'
															: 'border-slate-200 bg-white'
													)}
												>
													<div className="min-w-0">
														<p className="truncate font-medium">{lobby.name}</p>
														<p className="text-xs text-muted-foreground">
															{lobby.currentPlayers}/{lobby.maxPlayers} players
														</p>
													</div>
													<div className="ml-3 flex items-center gap-2">
														<Badge variant="neutral">{lobby.status}</Badge>
														<input
															type="checkbox"
															checked={isSelected}
															onChange={(event) =>
																toggleLobbySelection(lobby.uuid, event.target.checked)
															}
														/>
													</div>
												</label>
											);
										})
									)}
								</div>
							</div>

							<div className="space-y-2 rounded-base border-2 border-slate-200 bg-white p-3">
								<p className="text-sm font-medium">Bulk action</p>
								<p className="text-xs text-muted-foreground">
									{selectedCount} {lobbyNoun(selectedCount)} selected.
								</p>
								<div className="space-y-1">
									<Label htmlFor="bulk-reason">Reason</Label>
									<Input
										id="bulk-reason"
										value={bulkReason}
										onChange={(event) => setBulkReason(event.target.value)}
										placeholder="moderation reason"
									/>
								</div>
								<Button
									variant="destructive"
									className="w-full"
									disabled={!onBulkClose || selectedCount === 0 || isBulkClosing}
									onClick={handleBulkCloseSelected}
								>
									{isBulkClosing ? 'Closing...' : 'Close selection'}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Loading State */}
			{loading && (
				<div
					className={cn(
						'grid gap-4',
						viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
					)}
				>
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
								<div className="flex gap-2">
									<Skeleton className="h-5 w-16" />
									<Skeleton className="h-5 w-20" />
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-2/3" />
									<div className="flex gap-2">
										<Skeleton className="h-8 w-20" />
										<Skeleton className="h-8 w-24" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Empty State */}
			{!loading && sortedLobbies.length === 0 && (
				<Card>
					<CardContent className="p-12 text-center">
						<div className="text-gray-500 mb-4">
							<h3 className="text-lg font-medium">No lobby found</h3>
							<p className="text-sm">
								{lobbies.length === 0
									? 'No lobbies created yet.'
									: 'No lobby matches your current filters.'}
							</p>
						</div>
						{onCreateLobby && (
							<Button onClick={onCreateLobby}>
								<Plus className="h-4 w-4 mr-2" />
								Create the first lobby
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{/* Lobbies Grid/List */}
			{!loading && sortedLobbies.length > 0 && (
				<div
					className={cn(
						'grid gap-4',
						viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
					)}
				>
					{sortedLobbies.map((lobby) => (
						<LobbyCard
							key={lobby.uuid}
							lobby={lobby}
							currentUser={currentUser}
							variant={viewMode === 'list' ? 'compact' : 'detailed'}
							onJoin={onJoin}
							onLeave={onLeave}
							onView={onView}
							onShare={onShare}
							onStart={onStart}
							onClose={onClose}
							onKick={onKick}
							onSettings={onSettings}
						/>
					))}
				</div>
			)}

			{/* Results Summary */}
			{!loading && sortedLobbies.length > 0 && (
				<div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
					<span>
						Showing {sortedLobbies.length} {lobbyNoun(sortedLobbies.length)}
					</span>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="neutral">
							{sortedLobbies.filter((l) => l.hasAvailableSlots).length} with open slots
						</Badge>
						<Badge variant="neutral">
							{sortedLobbies.filter((l) => l.status === 'READY').length} ready to start
						</Badge>
					</div>
				</div>
			)}
		</div>
	);
}
