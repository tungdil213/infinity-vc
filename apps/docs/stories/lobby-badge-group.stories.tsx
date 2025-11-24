import type { Meta, StoryObj } from '@storybook/react'
import { LobbyBadgeGroup } from '@tyfo.dev/ui'

const meta: Meta<typeof LobbyBadgeGroup> = {
  title: 'Lobby/LobbyBadgeGroup',
  component: LobbyBadgeGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['WAITING', 'READY', 'FULL', 'IN_GAME', 'PAUSED', 'ENDED'],
    },
    isPrivate: { control: 'boolean' },
    currentPlayers: { control: 'number' },
    maxPlayers: { control: 'number' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'outline', 'secondary'],
    },
    showIcons: { control: 'boolean' },
    showTooltips: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    status: 'WAITING',
    isPrivate: false,
    currentPlayers: 2,
    maxPlayers: 4,
  },
}

export const Private: Story = {
  args: {
    status: 'READY',
    isPrivate: true,
    currentPlayers: 4,
    maxPlayers: 4,
  },
}

export const Full: Story = {
  args: {
    status: 'FULL',
    isPrivate: false,
    currentPlayers: 6,
    maxPlayers: 6,
  },
}

export const InGame: Story = {
  args: {
    status: 'IN_GAME',
    isPrivate: true,
    currentPlayers: 4,
    maxPlayers: 4,
  },
}

export const Sizes: Story = {
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

export const Variants: Story = {
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

export const AllCombinations: Story = {
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
