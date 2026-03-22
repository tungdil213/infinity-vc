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
	labels?: Partial<LobbyListLabels>;
}

export interface LobbyFilters {
	search?: string;
	status?: 'all' | 'WAITING' | 'READY' | 'FULL' | 'IN_GAME';
	hasSlots?: boolean;
	isPrivate?: boolean;
	sortBy?: 'name' | 'created' | 'players';
	sortOrder?: 'asc' | 'desc';
}

interface LobbyListLabels {
	loadingErrorTitle: string;
	retry: string;
	heading: string;
	totalSummary: string;
	createLobby: string;
	filtersTitle: string;
	searchLabel: string;
	searchPlaceholder: string;
	statusLabel: string;
	statusAll: string;
	statusWaiting: string;
	statusReady: string;
	statusFull: string;
	statusInGame: string;
	sortByLabel: string;
	sortCreated: string;
	sortName: string;
	sortPlayers: string;
	availableSlots: string;
	playersSuffix: string;
	privateProtectedOnly: string;
	privateBadge: string;
	protectedBadge: string;
	moderationViewTitle: string;
	moderationBadgeSuffix: string;
	showAll: string;
	showSensitive: string;
	showJoinable: string;
	sensitiveLobbies: string;
	selectAll: string;
	clear: string;
	noSensitiveLobbies: string;
	bulkAction: string;
	selectedSummary: string;
	reasonLabel: string;
	reasonPlaceholder: string;
	closing: string;
	closeSelection: string;
	bulkCloseConfirm: string;
	noLobbyFoundTitle: string;
	noLobbiesCreated: string;
	noLobbyMatches: string;
	createFirstLobby: string;
	showingSummary: string;
	withOpenSlots: string;
	readyToStart: string;
	hostLabel: string;
	hostFallback: string;
	playersLabel: string;
	viewDetails: string;
	joinActionLabel: string;
	startLabel: string;
	leaveLabel: string;
	closeLabel: string;
	closeLobbyLabel: string;
	lobbySingular: string;
	lobbyPlural: string;
	defaultBulkReason: string;
}

const defaultLabels: LobbyListLabels = {
	loadingErrorTitle: 'Loading error',
	retry: 'Retry',
	heading: 'Lobbies',
	totalSummary: '{filtered} of {total} lobbies',
	createLobby: 'Create lobby',
	filtersTitle: 'Filters',
	searchLabel: 'Search',
	searchPlaceholder: 'Lobby name...',
	statusLabel: 'Status',
	statusAll: 'All',
	statusWaiting: 'Waiting',
	statusReady: 'Ready',
	statusFull: 'Full',
	statusInGame: 'In game',
	sortByLabel: 'Sort by',
	sortCreated: 'Creation date',
	sortName: 'Name',
	sortPlayers: 'Player count',
	availableSlots: 'Available slots',
	playersSuffix: 'players',
	privateProtectedOnly: 'Private / protected only',
	privateBadge: 'Private',
	protectedBadge: 'Protected',
	moderationViewTitle: 'Moderation View',
	moderationBadgeSuffix: 'private/protected',
	showAll: 'Show all',
	showSensitive: 'Private / Protected',
	showJoinable: 'Available slots',
	sensitiveLobbies: 'Sensitive lobbies',
	selectAll: 'Select all',
	clear: 'Clear',
	noSensitiveLobbies: 'No private or protected lobbies in current filters.',
	bulkAction: 'Bulk action',
	selectedSummary: '{count} {lobbyNoun} selected.',
	reasonLabel: 'Reason',
	reasonPlaceholder: 'moderation reason',
	closing: 'Closing...',
	closeSelection: 'Close selection',
	bulkCloseConfirm: 'Close {count} selected {lobbyNoun}?',
	noLobbyFoundTitle: 'No lobby found',
	noLobbiesCreated: 'No lobbies created yet.',
	noLobbyMatches: 'No lobby matches your current filters.',
	createFirstLobby: 'Create the first lobby',
	showingSummary: 'Showing {count} {lobbyNoun}',
	withOpenSlots: '{count} with open slots',
	readyToStart: '{count} ready to start',
	hostLabel: 'Host',
	hostFallback: 'Host',
	playersLabel: 'Players',
	viewDetails: 'View details',
	joinActionLabel: 'Join',
	startLabel: 'Start',
	leaveLabel: 'Leave',
	closeLabel: 'Close',
	closeLobbyLabel: 'Close lobby',
	lobbySingular: 'lobby',
	lobbyPlural: 'lobbies',
	defaultBulkReason: 'manual moderation cleanup',
};

const interpolateLabel = (template: string, values: Record<string, string | number>) =>
	template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));

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
	labels,
}: LobbyListProps) {
	const ui = { ...defaultLabels, ...labels };
	const lobbyNoun = (count: number) => (count === 1 ? ui.lobbySingular : ui.lobbyPlural);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [selectedLobbyUuids, setSelectedLobbyUuids] = useState<string[]>([]);
	const [bulkReason, setBulkReason] = useState(ui.defaultBulkReason);
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
			interpolateLabel(ui.bulkCloseConfirm, {
				count: selectedLobbyUuids.length,
				lobbyNoun: lobbyNoun(selectedLobbyUuids.length),
			})
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
						<h3 className="text-lg font-medium">{ui.loadingErrorTitle}</h3>
						<p className="text-sm">{error}</p>
					</div>
					{onRefresh && (
						<Button onClick={onRefresh} variant="neutral">
							<RefreshCw className="h-4 w-4 mr-2" />
							{ui.retry}
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
					<h2 className="text-2xl font-bold">{ui.heading}</h2>
					{total !== undefined && (
						<p className="text-sm text-gray-600">
							{interpolateLabel(ui.totalSummary, { filtered: filteredLobbies.length, total })}
						</p>
					)}
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
							{ui.createLobby}
						</Button>
					)}
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Filter className="h-5 w-5" />
						{ui.filtersTitle}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Search */}
						<div className="space-y-2">
							<Label htmlFor="search">{ui.searchLabel}</Label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									id="search"
									placeholder={ui.searchPlaceholder}
									value={filters.search}
									onChange={(e) => handleFilterChange({ search: e.target.value })}
									className="pl-10"
								/>
							</div>
						</div>

						{/* Status */}
						<div className="space-y-2">
							<Label>{ui.statusLabel}</Label>
							<Select value={filters.status} onValueChange={(value) => handleFilterChange({ status: value as any })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{ui.statusAll}</SelectItem>
									<SelectItem value="WAITING">{ui.statusWaiting}</SelectItem>
									<SelectItem value="READY">{ui.statusReady}</SelectItem>
									<SelectItem value="FULL">{ui.statusFull}</SelectItem>
									<SelectItem value="IN_GAME">{ui.statusInGame}</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Sort */}
						<div className="space-y-2">
							<Label>{ui.sortByLabel}</Label>
							<Select value={filters.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value as any })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="created">{ui.sortCreated}</SelectItem>
									<SelectItem value="name">{ui.sortName}</SelectItem>
									<SelectItem value="players">{ui.sortPlayers}</SelectItem>
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
									{ui.availableSlots}
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Switch
									id="isPrivate"
									checked={filters.isPrivate}
									onCheckedChange={(checked) => handleFilterChange({ isPrivate: checked })}
								/>
								<Label htmlFor="isPrivate" className="text-sm">
									{ui.privateProtectedOnly}
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
							{ui.moderationViewTitle}
							<Badge variant="neutral">
								{moderationTargets.length} {ui.moderationBadgeSuffix}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="neutral" size="sm" onClick={() => applyQuickFilter('all')}>
								{ui.showAll}
							</Button>
							<Button variant="neutral" size="sm" onClick={() => applyQuickFilter('sensitive')}>
								{ui.showSensitive}
							</Button>
							<Button variant="neutral" size="sm" onClick={() => applyQuickFilter('joinable')}>
								{ui.showJoinable}
							</Button>
						</div>

						<div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">{ui.sensitiveLobbies}</p>
									<div className="flex items-center gap-2">
										<Button variant="noShadow" size="sm" onClick={selectAllModerationTargets}>
											{ui.selectAll}
										</Button>
										<Button variant="noShadow" size="sm" onClick={clearModerationSelection}>
											{ui.clear}
										</Button>
									</div>
								</div>

								<div className="max-h-56 space-y-2 overflow-auto rounded-base border-2 border-slate-200 bg-white p-2">
									{moderationTargets.length === 0 ? (
										<p className="p-2 text-sm text-muted-foreground">
											{ui.noSensitiveLobbies}
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
															{lobby.currentPlayers}/{lobby.maxPlayers} {ui.playersSuffix}
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
								<p className="text-sm font-medium">{ui.bulkAction}</p>
								<p className="text-xs text-muted-foreground">
									{interpolateLabel(ui.selectedSummary, {
										count: selectedCount,
										lobbyNoun: lobbyNoun(selectedCount),
									})}
								</p>
								<div className="space-y-1">
									<Label htmlFor="bulk-reason">{ui.reasonLabel}</Label>
									<Input
										id="bulk-reason"
										value={bulkReason}
										onChange={(event) => setBulkReason(event.target.value)}
										placeholder={ui.reasonPlaceholder}
									/>
								</div>
								<Button
									variant="destructive"
									className="w-full"
									disabled={!onBulkClose || selectedCount === 0 || isBulkClosing}
									onClick={handleBulkCloseSelected}
								>
									{isBulkClosing ? ui.closing : ui.closeSelection}
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
							<h3 className="text-lg font-medium">{ui.noLobbyFoundTitle}</h3>
							<p className="text-sm">
								{lobbies.length === 0
									? ui.noLobbiesCreated
									: ui.noLobbyMatches}
							</p>
						</div>
						{onCreateLobby && (
							<Button onClick={onCreateLobby}>
								<Plus className="h-4 w-4 mr-2" />
								{ui.createFirstLobby}
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
							labels={{
								statusWaiting: ui.statusWaiting,
								statusReady: ui.statusReady,
								statusFull: ui.statusFull,
								statusInGame: ui.statusInGame,
								statusPrivate: ui.privateBadge,
								privateBadge: ui.privateBadge,
								protectedBadge: ui.protectedBadge,
								playersSuffix: ui.playersSuffix,
								join: ui.joinActionLabel,
								closeLobby: ui.closeLobbyLabel,
								close: ui.closeLabel,
								start: ui.startLabel,
								leave: ui.leaveLabel,
								hostLabel: ui.hostLabel,
								hostFallback: ui.hostFallback,
								createdOnLabel: ui.sortCreated,
								playersLabel: ui.playersLabel,
								viewDetails: ui.viewDetails,
							}}
						/>
					))}
				</div>
			)}

			{/* Results Summary */}
			{!loading && sortedLobbies.length > 0 && (
				<div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
					<span>
						{interpolateLabel(ui.showingSummary, {
							count: sortedLobbies.length,
							lobbyNoun: lobbyNoun(sortedLobbies.length),
						})}
					</span>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="neutral">
							{interpolateLabel(ui.withOpenSlots, {
								count: sortedLobbies.filter((l) => l.hasAvailableSlots).length,
							})}
						</Badge>
						<Badge variant="neutral">
							{interpolateLabel(ui.readyToStart, {
								count: sortedLobbies.filter((l) => l.status === 'READY').length,
							})}
						</Badge>
					</div>
				</div>
			)}
		</div>
	);
}
