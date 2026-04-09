import type { Meta, StoryObj } from '@storybook/react';
import { LobbyList } from '@infinity.dev/ui/components/lobby-list';
import { LobbyData } from '@infinity.dev/ui/components/lobby-card';

const meta: Meta<typeof LobbyList> = {
	title: 'Lobby/LobbyList',
	component: LobbyList,
	parameters: {
		layout: 'fullscreen',
		docs: {
			story: { height: '600px' },
		},
	},
	tags: ['autodocs'],
	argTypes: {
		loading: { control: 'boolean' },
		onJoin: { action: 'joined' },
		onLeave: { action: 'left' },
		onView: { action: 'viewed' },
		onShare: { action: 'shared' },
		onStart: { action: 'started' },
		onClose: { action: 'closed' },
		onKick: { action: 'kicked' },
		onSettings: { action: 'settings' },
		onCreateLobby: { action: 'create-lobby' },
		onRefresh: { action: 'refresh' },
		onFilterChange: { action: 'filter-change' },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockCurrentUser = {
	uuid: 'user-123',
	nickName: 'PlayerOne',
	role: 'MODERATOR' as const,
};

const mockLobbies: LobbyData[] = [
	{
		uuid: 'lobby-1',
		name: 'Epic Battle Arena',
		description: 'An epic battle for 4 players',
		status: 'WAITING',
		currentPlayers: 2,
		maxPlayers: 4,
		isPrivate: false,
		hasAvailableSlots: true,
		creatorUuid: 'creator-1',
		createdAt: '2024-01-15T10:30:00Z',
		players: [
			{
				uuid: 'creator-1',
				nickName: 'GameMaster',
				avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
				isReady: true,
				isOnline: true,
			},
			{
				uuid: 'player-2',
				nickName: 'WarriorX',
				isReady: false,
				isOnline: true,
			},
		],
	},
	{
		uuid: 'lobby-2',
		name: 'Quick Match',
		description: 'Fast match for 2 players',
		status: 'READY',
		currentPlayers: 2,
		maxPlayers: 2,
		isPrivate: false,
		hasAvailableSlots: false,
		creatorUuid: 'creator-2',
		createdAt: '2024-01-15T11:00:00Z',
		players: [
			{
				uuid: 'creator-2',
				nickName: 'SpeedRunner',
				isReady: true,
				isOnline: true,
			},
			{
				uuid: 'player-3',
				nickName: 'FastPlayer',
				isReady: true,
				isOnline: true,
			},
		],
	},
	{
		uuid: 'lobby-3',
		name: 'Friends Only',
		description: 'Private lobby with friends',
		status: 'WAITING',
		currentPlayers: 1,
		maxPlayers: 6,
		isPrivate: true,
		hasAvailableSlots: true,
		creatorUuid: 'creator-3',
		createdAt: '2024-01-15T09:45:00Z',
		players: [
			{
				uuid: 'creator-3',
				nickName: 'FriendlyHost',
				isReady: false,
				isOnline: true,
			},
		],
	},
	{
		uuid: 'lobby-4',
		name: 'Tournament Final',
		description: 'Weekly tournament final',
		status: 'FULL',
		currentPlayers: 8,
		maxPlayers: 8,
		isPrivate: false,
		hasAvailableSlots: false,
		creatorUuid: 'creator-4',
		createdAt: '2024-01-15T08:00:00Z',
		players: Array.from({ length: 8 }, (_, i) => ({
			uuid: `tournament-player-${i}`,
			nickName: `Player${i + 1}`,
			isReady: i < 6,
			isOnline: i < 7,
		})),
	},
	{
		uuid: 'lobby-5',
		name: 'Active Battle',
		description: 'Game in progress for 15 minutes',
		status: 'IN_GAME',
		currentPlayers: 4,
		maxPlayers: 4,
		isPrivate: false,
		hasAvailableSlots: false,
		creatorUuid: 'creator-5',
		createdAt: '2024-01-15T07:30:00Z',
		players: Array.from({ length: 4 }, (_, i) => ({
			uuid: `game-player-${i}`,
			nickName: `Gamer${i + 1}`,
			isReady: true,
			isOnline: true,
		})),
	},
	{
		uuid: 'lobby-6',
		name: 'Casual Gaming',
		description: 'Casual game for all skill levels',
		status: 'WAITING',
		currentPlayers: 3,
		maxPlayers: 6,
		isPrivate: false,
		hasAvailableSlots: true,
		creatorUuid: 'creator-6',
		createdAt: '2024-01-15T12:15:00Z',
		players: Array.from({ length: 3 }, (_, i) => ({
			uuid: `casual-player-${i}`,
			nickName: `Casual${i + 1}`,
			isReady: i === 0,
			isOnline: true,
		})),
	},
];

export const Default: Story = {
	args: {
		lobbies: mockLobbies,
		currentUser: mockCurrentUser,
		total: mockLobbies.length,
	},
};

export const Loading: Story = {
	args: {
		lobbies: [],
		currentUser: mockCurrentUser,
		loading: true,
	},
};

export const Empty: Story = {
	args: {
		lobbies: [],
		currentUser: mockCurrentUser,
		total: 0,
	},
};

export const WithError: Story = {
	args: {
		lobbies: [],
		currentUser: mockCurrentUser,
		error: 'Unable to load lobbies. Check your connection.',
	},
};

export const SingleLobby: Story = {
	args: {
		lobbies: [mockLobbies[0]],
		currentUser: mockCurrentUser,
		total: 1,
	},
};

export const ManyLobbies: Story = {
	args: {
		lobbies: [
			...mockLobbies,
			...Array.from({ length: 12 }, (_, i) => ({
				...mockLobbies[i % mockLobbies.length],
				uuid: `extra-lobby-${i}`,
				name: `Generated Lobby ${i + 1}`,
				createdAt: new Date(Date.now() - i * 3600000).toISOString(),
			})),
		],
		currentUser: mockCurrentUser,
		total: 18,
	},
};

export const UserInLobby: Story = {
	args: {
		lobbies: mockLobbies.map((lobby, index) =>
			index === 0
				? {
						...lobby,
						players: [
							...lobby.players,
							{
								uuid: 'user-123',
								nickName: 'PlayerOne',
								isReady: false,
								isOnline: true,
							},
						],
						currentPlayers: lobby.currentPlayers + 1,
					}
				: lobby
		),
		currentUser: mockCurrentUser,
		total: mockLobbies.length,
	},
};

export const UserIsCreator: Story = {
	args: {
		lobbies: mockLobbies.map((lobby, index) =>
			index === 1
				? {
						...lobby,
						creatorUuid: 'user-123',
						players: [
							{
								uuid: 'user-123',
								nickName: 'PlayerOne',
								isReady: true,
								isOnline: true,
							},
							...lobby.players.slice(1),
						],
					}
				: lobby
		),
		currentUser: mockCurrentUser,
		total: mockLobbies.length,
	},
};

export const FilteredResults: Story = {
	args: {
		lobbies: mockLobbies.filter((lobby) => lobby.hasAvailableSlots),
		currentUser: mockCurrentUser,
		total: mockLobbies.length,
	},
	parameters: {
		docs: {
			description: {
				story: 'Example filtered list showing only lobbies with available slots.',
			},
		},
	},
};

export const AllStatuses: Story = {
	args: {
		lobbies: [
			{
				...mockLobbies[0],
				status: 'WAITING',
				name: 'Waiting Lobby',
			},
			{
				...mockLobbies[1],
				status: 'READY',
				name: 'Ready Lobby',
			},
			{
				...mockLobbies[2],
				status: 'FULL',
				name: 'Full Lobby',
			},
			{
				...mockLobbies[3],
				status: 'IN_GAME',
				name: 'In Game Lobby',
			},
		],
		currentUser: mockCurrentUser,
		total: 4,
	},
	parameters: {
		docs: {
			description: {
				story: 'Demonstration of all possible lobby statuses.',
			},
		},
	},
};

export const Interactive: Story = {
	args: {
		lobbies: mockLobbies,
		currentUser: mockCurrentUser,
		total: mockLobbies.length,
	},
	parameters: {
		docs: {
			description: {
				story: 'Interactive version with all callbacks enabled. Try the actions in controls.',
			},
		},
	},
};
