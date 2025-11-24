import type { Meta, StoryObj } from '@storybook/react'
import { PlayerAvatar, PlayerAvatarGroup, PlayerList } from '@tyfo.dev/ui'

const meta: Meta<typeof PlayerAvatar> = {
  title: 'Lobby/PlayerAvatar',
  component: PlayerAvatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    showStatus: { control: 'boolean' },
    showReadyBadge: { control: 'boolean' },
    showCreatorBadge: { control: 'boolean' },
    showYouBadge: { control: 'boolean' },
    showTooltip: { control: 'boolean' },
    onKick: { action: 'kicked' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockPlayer = {
  uuid: 'player-123',
  nickName: 'WarriorX',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
  isReady: true,
  isOnline: true,
}

const mockCurrentUser = {
  uuid: 'user-456',
  nickName: 'PlayerOne',
}

export const Default: Story = {
  args: {
    player: mockPlayer,
    currentUser: mockCurrentUser,
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <PlayerAvatar player={mockPlayer} size="xs" showTooltip={false} />
      <PlayerAvatar player={mockPlayer} size="sm" showTooltip={false} />
      <PlayerAvatar player={mockPlayer} size="md" showTooltip={false} />
      <PlayerAvatar player={mockPlayer} size="lg" showTooltip={false} />
      <PlayerAvatar player={mockPlayer} size="xl" showTooltip={false} />
    </div>
  ),
}

export const WithoutAvatar: Story = {
  args: {
    player: {
      ...mockPlayer,
      avatar: undefined,
    },
    currentUser: mockCurrentUser,
  },
}

export const Offline: Story = {
  args: {
    player: {
      ...mockPlayer,
      isOnline: false,
    },
    currentUser: mockCurrentUser,
  },
}

export const NotReady: Story = {
  args: {
    player: {
      ...mockPlayer,
      isReady: false,
    },
    currentUser: mockCurrentUser,
    showReadyBadge: true,
  },
}

export const Creator: Story = {
  args: {
    player: mockPlayer,
    currentUser: mockCurrentUser,
    creatorUuid: mockPlayer.uuid,
    showCreatorBadge: true,
  },
}

export const CurrentUser: Story = {
  args: {
    player: {
      ...mockPlayer,
      uuid: 'user-456',
      nickName: 'PlayerOne',
    },
    currentUser: mockCurrentUser,
    showYouBadge: true,
  },
}

export const AllBadges: Story = {
  args: {
    player: {
      ...mockPlayer,
      uuid: 'user-456',
      nickName: 'PlayerOne',
    },
    currentUser: mockCurrentUser,
    creatorUuid: 'user-456',
    showReadyBadge: true,
    showCreatorBadge: true,
    showYouBadge: true,
  },
}

export const WithoutTooltip: Story = {
  args: {
    player: mockPlayer,
    currentUser: mockCurrentUser,
    showTooltip: false,
  },
}

// PlayerAvatarGroup Stories
const GroupMeta: Meta<typeof PlayerAvatarGroup> = {
  title: 'Lobby/PlayerAvatarGroup',
  component: PlayerAvatarGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

const mockPlayers = [
  {
    uuid: 'player-1',
    nickName: 'GameMaster',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
    isReady: true,
    isOnline: true,
  },
  {
    uuid: 'player-2',
    nickName: 'WarriorX',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
    isReady: false,
    isOnline: true,
  },
  {
    uuid: 'player-3',
    nickName: 'MageBlue',
    isReady: true,
    isOnline: false,
  },
  {
    uuid: 'player-4',
    nickName: 'RogueGreen',
    isReady: true,
    isOnline: true,
  },
  {
    uuid: 'player-5',
    nickName: 'PaladinGold',
    isReady: false,
    isOnline: true,
  },
  {
    uuid: 'player-6',
    nickName: 'ArcherSilver',
    isReady: true,
    isOnline: true,
  },
]

type GroupStory = StoryObj<typeof PlayerAvatarGroup>

export const Group: GroupStory = {
  args: {
    players: mockPlayers.slice(0, 4),
    currentUser: mockCurrentUser,
    creatorUuid: 'player-1',
  },
}

export const GroupWithOverflow: GroupStory = {
  args: {
    players: mockPlayers,
    currentUser: mockCurrentUser,
    creatorUuid: 'player-1',
    maxVisible: 3,
  },
}

export const GroupSizes: GroupStory = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Extra Small</h3>
        <PlayerAvatarGroup players={mockPlayers.slice(0, 4)} size="xs" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Small</h3>
        <PlayerAvatarGroup players={mockPlayers.slice(0, 4)} size="sm" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium</h3>
        <PlayerAvatarGroup players={mockPlayers.slice(0, 4)} size="md" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <PlayerAvatarGroup players={mockPlayers.slice(0, 4)} size="lg" />
      </div>
    </div>
  ),
}

// PlayerList Stories
const ListMeta: Meta<typeof PlayerList> = {
  title: 'Lobby/PlayerList',
  component: PlayerList,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

type ListStory = StoryObj<typeof PlayerList>

export const List: ListStory = {
  args: {
    players: mockPlayers.slice(0, 4),
    currentUser: mockCurrentUser,
    creatorUuid: 'player-1',
  },
}

export const ListWithActions: ListStory = {
  args: {
    players: mockPlayers.slice(0, 4),
    currentUser: { uuid: 'player-1', nickName: 'GameMaster' },
    creatorUuid: 'player-1',
    showActions: true,
    onKick: (playerUuid: string) => console.log('Kick player:', playerUuid),
  },
}

export const ListCurrentUserHighlighted: ListStory = {
  args: {
    players: [
      ...mockPlayers.slice(0, 2),
      {
        uuid: 'user-456',
        nickName: 'PlayerOne',
        isReady: false,
        isOnline: true,
      },
      ...mockPlayers.slice(3, 5),
    ],
    currentUser: mockCurrentUser,
    creatorUuid: 'player-1',
  },
}
