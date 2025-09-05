import type { Meta, StoryObj } from '@storybook/react'
import { 
  LobbyStatusBadge, 
  LobbyPrivacyBadge, 
  LobbyCapacityBadge, 
  LobbyBadgeGroup,
  LobbyStatus 
} from '@tyfo.dev/ui/components/lobby-status-badge'

const meta: Meta<typeof LobbyStatusBadge> = {
  title: 'Lobby/LobbyStatusBadge',
  component: LobbyStatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['WAITING', 'READY', 'FULL', 'IN_GAME', 'PAUSED', 'ENDED'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'outline', 'secondary'],
    },
    showIcon: { control: 'boolean' },
    showTooltip: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    status: 'WAITING',
  },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LobbyStatusBadge status="WAITING" />
        <LobbyStatusBadge status="READY" />
        <LobbyStatusBadge status="FULL" />
        <LobbyStatusBadge status="IN_GAME" />
        <LobbyStatusBadge status="PAUSED" />
        <LobbyStatusBadge status="ENDED" />
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Small</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" size="sm" />
          <LobbyStatusBadge status="READY" size="sm" />
          <LobbyStatusBadge status="IN_GAME" size="sm" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" size="md" />
          <LobbyStatusBadge status="READY" size="md" />
          <LobbyStatusBadge status="IN_GAME" size="md" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" size="lg" />
          <LobbyStatusBadge status="READY" size="lg" />
          <LobbyStatusBadge status="IN_GAME" size="lg" />
        </div>
      </div>
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Default</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" variant="default" />
          <LobbyStatusBadge status="READY" variant="default" />
          <LobbyStatusBadge status="IN_GAME" variant="default" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Outline</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" variant="outline" />
          <LobbyStatusBadge status="READY" variant="outline" />
          <LobbyStatusBadge status="IN_GAME" variant="outline" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Secondary</h3>
        <div className="flex gap-2">
          <LobbyStatusBadge status="WAITING" variant="secondary" />
          <LobbyStatusBadge status="READY" variant="secondary" />
          <LobbyStatusBadge status="IN_GAME" variant="secondary" />
        </div>
      </div>
    </div>
  ),
}

export const WithoutIcon: Story = {
  args: {
    status: 'READY',
    showIcon: false,
  },
}

export const WithoutTooltip: Story = {
  args: {
    status: 'READY',
    showTooltip: false,
  },
}

// Privacy Badge Stories
const PrivacyMeta: Meta<typeof LobbyPrivacyBadge> = {
  title: 'Lobby/LobbyPrivacyBadge',
  component: LobbyPrivacyBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

type PrivacyStory = StoryObj<typeof LobbyPrivacyBadge>

export const Privacy: PrivacyStory = {
  render: () => (
    <div className="flex gap-4">
      <LobbyPrivacyBadge isPrivate={false} />
      <LobbyPrivacyBadge isPrivate={true} />
    </div>
  ),
}

export const PrivacyVariants: PrivacyStory = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Public</h3>
        <div className="flex gap-2">
          <LobbyPrivacyBadge isPrivate={false} variant="default" />
          <LobbyPrivacyBadge isPrivate={false} variant="outline" />
          <LobbyPrivacyBadge isPrivate={false} variant="secondary" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Private</h3>
        <div className="flex gap-2">
          <LobbyPrivacyBadge isPrivate={true} variant="default" />
          <LobbyPrivacyBadge isPrivate={true} variant="outline" />
          <LobbyPrivacyBadge isPrivate={true} variant="secondary" />
        </div>
      </div>
    </div>
  ),
}

// Capacity Badge Stories
const CapacityMeta: Meta<typeof LobbyCapacityBadge> = {
  title: 'Lobby/LobbyCapacityBadge',
  component: LobbyCapacityBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

type CapacityStory = StoryObj<typeof LobbyCapacityBadge>

export const Capacity: CapacityStory = {
  args: {
    currentPlayers: 2,
    maxPlayers: 4,
  },
}

export const CapacityStates: CapacityStory = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Available Slots</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={6} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Nearly Full</h3>
        <LobbyCapacityBadge currentPlayers={5} maxPlayers={6} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Full</h3>
        <LobbyCapacityBadge currentPlayers={4} maxPlayers={4} />
      </div>
    </div>
  ),
}

// Badge Group Stories
const GroupMeta: Meta<typeof LobbyBadgeGroup> = {
  title: 'Lobby/LobbyBadgeGroup',
  component: LobbyBadgeGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

type GroupStory = StoryObj<typeof LobbyBadgeGroup>

export const BadgeGroup: GroupStory = {
  args: {
    status: 'WAITING',
    isPrivate: false,
    currentPlayers: 2,
    maxPlayers: 4,
  },
}

export const BadgeGroupPrivate: GroupStory = {
  args: {
    status: 'READY',
    isPrivate: true,
    currentPlayers: 4,
    maxPlayers: 4,
  },
}

export const BadgeGroupFull: GroupStory = {
  args: {
    status: 'FULL',
    isPrivate: false,
    currentPlayers: 6,
    maxPlayers: 6,
  },
}

export const BadgeGroupInGame: GroupStory = {
  args: {
    status: 'IN_GAME',
    isPrivate: true,
    currentPlayers: 4,
    maxPlayers: 4,
  },
}

export const BadgeGroupSizes: GroupStory = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Small</h3>
        <LobbyBadgeGroup
          status="WAITING"
          isPrivate={false}
          currentPlayers={2}
          maxPlayers={4}
          size="sm"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium</h3>
        <LobbyBadgeGroup
          status="READY"
          isPrivate={true}
          currentPlayers={3}
          maxPlayers={4}
          size="md"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <LobbyBadgeGroup
          status="IN_GAME"
          isPrivate={false}
          currentPlayers={4}
          maxPlayers={4}
          size="lg"
        />
      </div>
    </div>
  ),
}

export const BadgeGroupVariants: GroupStory = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Default</h3>
        <LobbyBadgeGroup
          status="WAITING"
          isPrivate={false}
          currentPlayers={2}
          maxPlayers={4}
          variant="default"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Outline</h3>
        <LobbyBadgeGroup
          status="READY"
          isPrivate={true}
          currentPlayers={3}
          maxPlayers={4}
          variant="outline"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Secondary</h3>
        <LobbyBadgeGroup
          status="IN_GAME"
          isPrivate={false}
          currentPlayers={4}
          maxPlayers={4}
          variant="secondary"
        />
      </div>
    </div>
  ),
}

export const AllCombinations: GroupStory = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <div className="space-y-2">
        <h4 className="font-medium">Waiting + Public</h4>
        <LobbyBadgeGroup status="WAITING" isPrivate={false} currentPlayers={1} maxPlayers={4} />
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">Ready + Private</h4>
        <LobbyBadgeGroup status="READY" isPrivate={true} currentPlayers={4} maxPlayers={4} />
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">Full + Public</h4>
        <LobbyBadgeGroup status="FULL" isPrivate={false} currentPlayers={6} maxPlayers={6} />
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">In Game + Private</h4>
        <LobbyBadgeGroup status="IN_GAME" isPrivate={true} currentPlayers={4} maxPlayers={4} />
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">Paused + Public</h4>
        <LobbyBadgeGroup status="PAUSED" isPrivate={false} currentPlayers={3} maxPlayers={4} />
      </div>
      <div className="space-y-2">
        <h4 className="font-medium">Ended + Private</h4>
        <LobbyBadgeGroup status="ENDED" isPrivate={true} currentPlayers={4} maxPlayers={4} />
      </div>
    </div>
  ),
}
