import type { Meta, StoryObj } from '@storybook/react'
import { LobbyCard, LobbyData } from '@tyfo.dev/ui'

const meta: Meta<typeof LobbyCard> = {
  title: 'Lobby/LobbyCard',
  component: LobbyCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['compact', 'detailed', 'featured'],
    },
    onJoin: { action: 'joined' },
    onLeave: { action: 'left' },
    onView: { action: 'viewed' },
    onShare: { action: 'shared' },
    onStart: { action: 'started' },
    onKick: { action: 'kicked' },
    onSettings: { action: 'settings' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockCurrentUser = {
  uuid: 'user-123',
  nickName: 'PlayerOne',
}

const baseLobby: LobbyData = {
  uuid: 'lobby-123',
  name: 'Epic Battle Arena',
  description: 'Une bataille épique pour 4 joueurs dans un monde fantastique',
  status: 'WAITING',
  currentPlayers: 2,
  maxPlayers: 4,
  isPrivate: false,
  hasAvailableSlots: true,
  creatorUuid: 'creator-456',
  createdAt: '2024-01-15T10:30:00Z',
  players: [
    {
      uuid: 'creator-456',
      nickName: 'GameMaster',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
      isReady: true,
      isOnline: true,
    },
    {
      uuid: 'player-789',
      nickName: 'WarriorX',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
      isReady: false,
      isOnline: true,
    },
  ],
}

export const Compact: Story = {
  args: {
    lobby: baseLobby,
    currentUser: mockCurrentUser,
    variant: 'compact',
  },
}

export const Detailed: Story = {
  args: {
    lobby: baseLobby,
    currentUser: mockCurrentUser,
    variant: 'detailed',
  },
}

export const Featured: Story = {
  args: {
    lobby: baseLobby,
    currentUser: mockCurrentUser,
    variant: 'featured',
  },
}

export const ReadyToStart: Story = {
  args: {
    lobby: {
      ...baseLobby,
      status: 'READY',
      players: [
        ...baseLobby.players.map(p => ({ ...p, isReady: true })),
        {
          uuid: 'player-101',
          nickName: 'MageBlue',
          isReady: true,
          isOnline: true,
        },
        {
          uuid: 'player-102',
          nickName: 'RogueGreen',
          isReady: true,
          isOnline: true,
        },
      ],
      currentPlayers: 4,
      hasAvailableSlots: false,
    },
    currentUser: { uuid: 'creator-456', nickName: 'GameMaster' },
    variant: 'detailed',
  },
}

export const FullLobby: Story = {
  args: {
    lobby: {
      ...baseLobby,
      status: 'FULL',
      currentPlayers: 4,
      hasAvailableSlots: false,
      players: [
        ...baseLobby.players,
        {
          uuid: 'player-101',
          nickName: 'MageBlue',
          isReady: false,
          isOnline: true,
        },
        {
          uuid: 'player-102',
          nickName: 'RogueGreen',
          isReady: true,
          isOnline: false,
        },
      ],
    },
    currentUser: mockCurrentUser,
    variant: 'detailed',
  },
}

export const PrivateLobby: Story = {
  args: {
    lobby: {
      ...baseLobby,
      name: 'Friends Only Battle',
      isPrivate: true,
    },
    currentUser: mockCurrentUser,
    variant: 'detailed',
  },
}

export const InGame: Story = {
  args: {
    lobby: {
      ...baseLobby,
      status: 'IN_GAME',
      currentPlayers: 4,
      hasAvailableSlots: false,
      players: [
        ...baseLobby.players.map(p => ({ ...p, isReady: true })),
        {
          uuid: 'player-101',
          nickName: 'MageBlue',
          isReady: true,
          isOnline: true,
        },
        {
          uuid: 'player-102',
          nickName: 'RogueGreen',
          isReady: true,
          isOnline: true,
        },
      ],
    },
    currentUser: mockCurrentUser,
    variant: 'detailed',
  },
}

export const UserIsCreator: Story = {
  args: {
    lobby: {
      ...baseLobby,
      players: [
        {
          uuid: 'user-123',
          nickName: 'PlayerOne',
          isReady: true,
          isOnline: true,
        },
        ...baseLobby.players.slice(1),
      ],
    },
    currentUser: { uuid: 'user-123', nickName: 'PlayerOne' },
    variant: 'detailed',
  },
}

export const UserInLobby: Story = {
  args: {
    lobby: {
      ...baseLobby,
      players: [
        ...baseLobby.players,
        {
          uuid: 'user-123',
          nickName: 'PlayerOne',
          isReady: false,
          isOnline: true,
        },
      ],
      currentPlayers: 3,
    },
    currentUser: mockCurrentUser,
    variant: 'detailed',
  },
}

export const LongDescription: Story = {
  args: {
    lobby: {
      ...baseLobby,
      name: 'Super Ultra Mega Epic Battle Arena Championship Tournament',
      description: 'Une bataille épique et intense qui se déroule dans un monde fantastique rempli de magie et de créatures mystiques. Les joueurs devront faire preuve de stratégie, de courage et de coopération pour remporter la victoire dans cette aventure palpitante qui les mènera à travers des donjons dangereux et des combats spectaculaires.',
    },
    currentUser: mockCurrentUser,
    variant: 'detailed',
  },
}

export const CompactGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <LobbyCard
        lobby={baseLobby}
        currentUser={mockCurrentUser}
        variant="compact"
      />
      <LobbyCard
        lobby={{ ...baseLobby, status: 'READY', name: 'Quick Match' }}
        currentUser={mockCurrentUser}
        variant="compact"
      />
      <LobbyCard
        lobby={{ ...baseLobby, status: 'FULL', name: 'Full House', isPrivate: true }}
        currentUser={mockCurrentUser}
        variant="compact"
      />
      <LobbyCard
        lobby={{ ...baseLobby, status: 'IN_GAME', name: 'Active Game' }}
        currentUser={mockCurrentUser}
        variant="compact"
      />
    </div>
  ),
}
