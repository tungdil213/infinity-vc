import type { Meta, StoryObj } from '@storybook/react'
import { LobbyCapacityBadge } from '@tyfo.dev/ui'

const meta: Meta<typeof LobbyCapacityBadge> = {
  title: 'Lobby/LobbyCapacityBadge',
  component: LobbyCapacityBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
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
    showIcon: { control: 'boolean' },
    showTooltip: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    currentPlayers: 2,
    maxPlayers: 4,
  },
}

export const States: Story = {
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

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Small</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={4} size="sm" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={4} size="md" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={4} size="lg" />
      </div>
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Default</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={4} variant="default" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Outline</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={4} variant="outline" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Secondary</h3>
        <LobbyCapacityBadge currentPlayers={2} maxPlayers={4} variant="secondary" />
      </div>
    </div>
  ),
}
